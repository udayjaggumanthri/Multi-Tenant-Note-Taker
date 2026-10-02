from django.conf import settings
from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django_tenants.utils import schema_context
from tenants.models import Client, Domain, WebsiteSettings, TenantStatus
from tenants.serializers import (
    TenantSerializer,
    CreateTenantSerializer,
    WebsiteSettingsSerializer,
    CustomDomainSerializer
)
from users.permissions import IsPlatformAdmin, IsTenantAdminOrPlatformAdmin
from users.models import User, UserRole
from notes.models import Note


def extract_base_domain(host: str) -> str:
    """
    Extracts the root/base domain from a host string.
    - 'prod.flowiq.in' -> 'flowiq.in'
    - 'admin.flowiq.in' -> 'flowiq.in'
    - 'localhost' / '127.0.0.1' -> 'localhost'
    - 'sub.example.com' -> 'example.com'
    """
    if not host:
        return 'localhost'
    clean = host.split(':')[0].strip().lower()
    if clean in ['localhost', '127.0.0.1', '::1'] or clean.endswith('.localhost'):
        return 'localhost'
    for prefix in ['prod.', 'app.', 'admin.', 'platform.', 'api.']:
        if clean.startswith(prefix):
            return clean[len(prefix):]
    if 'ngrok' in clean:
        # Ngrok free tunnels do not support nested subdomains (*.*.ngrok-free.dev)
        # Always fallback to the configured platform base domain (e.g. flowiq.in or localhost)
        return getattr(settings, 'PLATFORM_BASE_DOMAIN', 'flowiq.in')
    parts = clean.split('.')
    if len(parts) > 2:
        return '.'.join(parts[-2:])
    return clean


class TenantPublicView(APIView):
    """
    Public endpoint to resolve the tenant for the current domain.
    Used by the React frontend on initial page load.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tenant = getattr(request, 'tenant', None)
        platform_domain = getattr(settings, 'PLATFORM_DOMAIN', 'flowiq.in')
        server_ip = getattr(settings, 'SERVER_PUBLIC_IP', '139.99.47.143')
        configured_base_domain = getattr(settings, 'PLATFORM_BASE_DOMAIN', 'localhost')
        detected_host = getattr(request, 'normalized_host', 'localhost')
        detected_base_domain = extract_base_domain(detected_host)

        # Prefer detected public base domain if accessing via real domain; otherwise use configured base domain
        active_base_domain = detected_base_domain if detected_base_domain != 'localhost' else configured_base_domain

        if not tenant or getattr(tenant, 'schema_name', '') == 'public':
            # Request is on the platform domain
            return Response({
                'is_platform': True,
                'name': 'Multi-Tenant Note Taker SaaS Platform',
                'domain': detected_host,
                'platform_domain': platform_domain,
                'server_ip': server_ip,
                'platform_base_domain': active_base_domain,
                'configured_base_domain': configured_base_domain,
                'detected_base_domain': detected_base_domain,
            })

        # Return tenant public details and branding settings
        settings_data = None
        if hasattr(tenant, 'website_settings'):
            settings_data = WebsiteSettingsSerializer(tenant.website_settings).data

        primary_domain = tenant.domains.filter(is_primary=True).first()

        return Response({
            'is_platform': False,
            'id': tenant.id,
            'name': tenant.name,
            'slug': tenant.slug,
            'schema_name': tenant.schema_name,
            'status': tenant.status,
            'domain': primary_domain.domain if primary_domain else '',
            'platform_domain': platform_domain,
            'server_ip': server_ip,
            'platform_base_domain': active_base_domain,
            'website_settings': settings_data
        })


class WebsiteSettingsView(APIView):
    """
    Tenant website branding and settings endpoint.
    GET: Public
    PUT/PATCH: Tenant Admin or Platform Admin
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsTenantAdminOrPlatformAdmin()]

    def get(self, request):
        tenant = getattr(request, 'tenant', None)
        if not tenant or tenant.schema_name == 'public':
            return Response({'error': 'No tenant domain resolved.'}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj, _ = WebsiteSettings.objects.get_or_create(
            tenant=tenant,
            defaults={'company_name': tenant.name}
        )
        return Response(WebsiteSettingsSerializer(settings_obj).data)

    def put(self, request):
        tenant = getattr(request, 'tenant', None)
        if not tenant or tenant.schema_name == 'public':
            return Response({'error': 'No tenant domain resolved.'}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj, _ = WebsiteSettings.objects.get_or_create(
            tenant=tenant,
            defaults={'company_name': tenant.name}
        )
        serializer = WebsiteSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PlatformAdminTenantViewSet(viewsets.ModelViewSet):
    """
    Platform Admin endpoint for managing tenants with django-tenants schemas.
    """
    permission_classes = [IsPlatformAdmin]
    queryset = Client.objects.exclude(schema_name='public').prefetch_related('domains', 'website_settings').order_by('id')
    serializer_class = TenantSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateTenantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = serializer.save()

        # Auto-provision SSL certificate for new tenant domain in background
        from tenants.ssl_utils import trigger_ssl_provisioning
        trigger_ssl_provisioning()

        output_serializer = TenantSerializer(tenant)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        status_val = request.data.get('status')
        if status_val and status_val in TenantStatus.values:
            instance.status = status_val
        name_val = request.data.get('name')
        if name_val:
            instance.name = name_val
        instance.save()
        return Response(TenantSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        schema_name = instance.schema_name
        tenant_name = instance.name

        try:
            # 1. Cleanly delete tenant users in public schema
            from users.models import User
            User.objects.filter(tenant=instance).delete()

            # 2. Delete tenant client and drop its isolated PostgreSQL schema
            instance.delete(force_drop=True)

            # 3. Synchronize Nginx configuration in the background
            from tenants.ssl_utils import trigger_ssl_provisioning
            trigger_ssl_provisioning()

            return Response({
                'message': f"Tenant '{tenant_name}' ({schema_name}) deleted successfully."
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            import logging
            logging.getLogger('tenant').error(f"Error deleting tenant {instance.id}: {exc}")
            return Response({
                'error': f"Failed to delete tenant: {str(exc)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='sync-ssl')
    def sync_ssl(self, request):
        from tenants.ssl_utils import trigger_ssl_provisioning
        trigger_ssl_provisioning()
        return Response({'message': 'SSL certificates and Nginx routing synchronization initiated in background.'})


class PlatformAdminStatsView(APIView):
    """
    Platform Admin dashboard metrics aggregated across all tenant schemas.
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        clients = Client.objects.exclude(schema_name='public')
        total_tenants = clients.count()
        active_tenants = clients.filter(status=TenantStatus.ACTIVE).count()
        inactive_tenants = clients.filter(status=TenantStatus.INACTIVE).count()

        total_notes = 0
        for client in clients:
            try:
                with schema_context(client.schema_name):
                    total_notes += Note.objects.count()
            except Exception:
                pass

        return Response({
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'inactive_tenants': inactive_tenants,
            'total_notes': total_notes
        })


class VerifyDomainView(APIView):
    """
    Checks real-time DNS propagation for a domain and verifies configuration.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, domain_id):
        import socket
        domain_obj = get_object_or_404(Domain, id=domain_id)

        user = request.user
        if not (getattr(user, 'role', None) == 'PLATFORM_ADMIN' or (getattr(user, 'role', None) == 'TENANT_ADMIN' and user.tenant_id == domain_obj.tenant_id)):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        domain_name = domain_obj.domain

        # Local development domains (.localhost) always pass
        if domain_name.endswith('.localhost') or domain_name in ['localhost', '127.0.0.1']:
            domain_obj.is_verified = True
            domain_obj.save()
            return Response({
                'verified': True,
                'domain': domain_name,
                'resolved_ip': '127.0.0.1',
                'message': f"Domain '{domain_name}' is verified successfully for local development."
            })

        try:
            resolved_ip = socket.gethostbyname(domain_name)
            domain_obj.is_verified = True
            domain_obj.save()

            # Auto-provision SSL certificate for newly verified domain in background
            from tenants.ssl_utils import trigger_ssl_provisioning
            trigger_ssl_provisioning()

            return Response({
                'verified': True,
                'domain': domain_name,
                'resolved_ip': resolved_ip,
                'message': f"DNS verification passed! '{domain_name}' resolves to {resolved_ip}."
            })
        except socket.gaierror:
            return Response({
                'verified': False,
                'domain': domain_name,
                'resolved_ip': None,
                'message': f"DNS record not found for '{domain_name}'. Please ensure your CNAME or A-record has propagated."
            }, status=status.HTTP_400_BAD_REQUEST)


class HealthCheckView(APIView):
    """
    Uptime and health monitoring endpoint for VPS and load balancers.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db import connection
        db_healthy = True
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1;')
        except Exception:
            db_healthy = False

        status_code = status.HTTP_200_OK if db_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response({
            'status': 'healthy' if db_healthy else 'unhealthy',
            'database': 'connected' if db_healthy else 'disconnected',
            'multi_tenancy': 'django-tenants (PostgreSQL Schemas)',
            'schemas_active': Client.objects.count() if db_healthy else 0
        }, status=status_code)
