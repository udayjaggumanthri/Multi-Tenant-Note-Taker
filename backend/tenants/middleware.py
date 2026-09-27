import ipaddress
import logging
from django.conf import settings
from django.http import JsonResponse
from django_tenants.middleware.main import TenantMainMiddleware
from tenants.models import TenantStatus

logger = logging.getLogger('tenant')


def is_ip_address(host: str) -> bool:
    """Checks whether the hostname is an IPv4 or IPv6 address."""
    if not host:
        return False
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def normalize_hostname(host_header: str) -> str:
    """
    Normalizes incoming hostnames:
    - Removes port numbers (e.g., abc.localhost:8000 -> abc.localhost)
    - Removes unnecessary trailing dots
    - Lowercases everything
    """
    if not host_header:
        return ''
    host = host_header.split(':')[0]
    host = host.rstrip('.')
    return host.strip().lower()


class AppTenantMiddleware(TenantMainMiddleware):
    """
    Production-grade Multi-Tenant middleware powered by django-tenants.
    
    1. Direct IP Access Blocker: Rejects direct public IP visits with 403 Forbidden.
    2. Dynamic Schema Router: Switches PostgreSQL search_path to the tenant's dedicated schema.
    3. Inactive Account Guard: Blocks disabled organizations with 403 Forbidden.
    4. Rogue Domain Guard: Unrecognized domain host headers return 404 Not Found.
    """

    def hostname_from_request(self, request):
        # Allow header override for testing if in DEBUG mode
        if settings.DEBUG and 'HTTP_X_TENANT_DOMAIN' in request.META:
            override_domain = request.META['HTTP_X_TENANT_DOMAIN']
            if override_domain:
                return normalize_hostname(override_domain)
        raw_host = request.get_host()
        return normalize_hostname(raw_host)

    def process_request(self, request):
        # 1. Allow CORS preflight requests
        if request.method == 'OPTIONS':
            request.tenant = None
            return None

        # 2. Extract and normalize hostname
        hostname = self.hostname_from_request(request)
        path = request.path

        # 3. Direct IP Access Prevention (Layer 2 Security)
        if is_ip_address(hostname):
            # Allow loopback (127.0.0.1) ONLY for local development when DEBUG=True
            if not (settings.DEBUG and hostname in ['127.0.0.1', '::1']):
                logger.warning(f"Blocked direct IP access attempt: {hostname} | Path: {path}")
                return JsonResponse({
                    'error': 'Direct IP access is prohibited for security reasons. Please access the platform via your registered domain name.',
                    'code': 'DIRECT_IP_ACCESS_DENIED',
                    'host': hostname
                }, status=403)

        # 4. Delegate to django-tenants for schema resolution and search_path switching
        response = super().process_request(request)
        if response:
            return response

        # 5. Inactive Tenant Guard
        tenant = getattr(request, 'tenant', None)
        if tenant and tenant.schema_name != 'public':
            if getattr(tenant, 'status', None) == TenantStatus.INACTIVE:
                logger.warning(f"Incoming Host: {hostname} | Inactive Tenant: {tenant.id} ({tenant.name}) | Path: {path}")
                return JsonResponse({
                    'error': 'Tenant account is currently inactive.',
                    'code': 'TENANT_INACTIVE',
                    'tenant_id': tenant.id,
                    'tenant_name': tenant.name
                }, status=403)

        request.normalized_host = hostname
        logger.info(f"Incoming Host: {hostname} | Schema: {getattr(tenant, 'schema_name', 'none')} | Tenant: {getattr(tenant, 'name', 'Platform')} | Request: {request.method} {path}")
        return None

    def no_tenant_found(self, request, hostname):
        logger.warning(f"Incoming Host: {hostname} | Unknown Domain | Request: {request.method} {request.path}")
        return JsonResponse({
            'error': 'Tenant / domain not configured.',
            'code': 'TENANT_NOT_FOUND',
            'host': hostname
        }, status=404)
