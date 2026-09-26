from rest_framework import status, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from tenants.models import Tenant, CustomDomain, WebsiteSettings, TenantStatus
from tenants.serializers import (
    TenantSerializer,
    CreateTenantSerializer,
    WebsiteSettingsSerializer,
    CustomDomainSerializer
)
from users.permissions import IsPlatformAdmin, IsTenantAdminOrPlatformAdmin
from notes.models import Note


class TenantPublicView(APIView):
    """
    Public endpoint to resolve the tenant for the current domain.
    Used by the React frontend on initial page load (Phase 24).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tenant = getattr(request, 'tenant', None)
        domain_obj = getattr(request, 'custom_domain', None)

        if not tenant:
            # Request is on the platform domain
            return Response({
                'is_platform': True,
                'name': 'Multi-Tenant Note Taker SaaS Platform',
                'domain': getattr(request, 'normalized_host', 'localhost')
            })

        # Return tenant public details and branding settings
        settings_data = None
        if hasattr(tenant, 'website_settings'):
            settings_data = WebsiteSettingsSerializer(tenant.website_settings).data

        return Response({
            'is_platform': False,
            'id': tenant.id,
            'name': tenant.name,
            'slug': tenant.slug,
            'status': tenant.status,
            'domain': domain_obj.domain if domain_obj else '',
            'website_settings': settings_data
        })


class WebsiteSettingsView(APIView):
    """
    Tenant website branding and settings endpoint (Phase 9).
    GET: Public
    PUT/PATCH: Tenant Admin or Platform Admin
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsTenantAdminOrPlatformAdmin()]

    def get(self, request):
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response({'error': 'No tenant domain resolved.'}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj, _ = WebsiteSettings.objects.get_or_create(
            tenant=tenant,
            defaults={'company_name': tenant.name}
        )
        return Response(WebsiteSettingsSerializer(settings_obj).data)

    def put(self, request):
        tenant = getattr(request, 'tenant', None)
        if not tenant:
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
    Platform Admin endpoint for managing tenants (Phase 10, 11).
    Allows creating, viewing, updating status, and deleting tenants.
    """
    permission_classes = [IsPlatformAdmin]
    queryset = Tenant.objects.all().prefetch_related('domains', 'website_settings', 'notes').order_by('id')
    serializer_class = TenantSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateTenantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = serializer.save()
        output_serializer = TenantSerializer(tenant)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Allow updating status, name, etc.
        status_val = request.data.get('status')
        if status_val and status_val in TenantStatus.values:
            instance.status = status_val
        name_val = request.data.get('name')
        if name_val:
            instance.name = name_val
        instance.save()
        return Response(TenantSerializer(instance).data)


class PlatformAdminStatsView(APIView):
    """
    Platform Admin dashboard metrics (Phase 10).
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        total_tenants = Tenant.objects.count()
        active_tenants = Tenant.objects.filter(status=TenantStatus.ACTIVE).count()
        inactive_tenants = Tenant.objects.filter(status=TenantStatus.INACTIVE).count()
        total_notes = Note.objects.count()

        return Response({
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'inactive_tenants': inactive_tenants,
            'total_notes': total_notes
        })


class VerifyDomainView(APIView):
    """
    Checks real-time DNS propagation for a domain and verifies configuration.
    Performs DNS resolution (socket.gethostbyname) and marks the domain as verified.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, domain_id):
        import socket
        domain_obj = get_object_or_404(CustomDomain, id=domain_id)

        user = request.user
        # Allow Platform Admin or Tenant Admin of the owning tenant
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
