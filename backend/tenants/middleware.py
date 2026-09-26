import logging
from django.conf import settings
from django.http import JsonResponse
from tenants.models import CustomDomain, TenantStatus

logger = logging.getLogger('tenant')


def normalize_hostname(host_header: str) -> str:
    """
    Normalizes incoming hostnames according to Phase 14:
    - Removes port numbers (e.g., abc.localhost:8000 -> abc.localhost)
    - Removes unnecessary trailing dots (e.g., abc.localhost. -> abc.localhost)
    - Lowercases everything (e.g., ABC.LOCALHOST -> abc.localhost)
    """
    if not host_header:
        return ''
    # Strip port if present
    host = host_header.split(':')[0]
    # Strip trailing dots
    host = host.rstrip('.')
    # Convert to lowercase
    return host.strip().lower()


class TenantMiddleware:
    """
    Resolves tenant based on incoming domain/Host header.
    Attaches request.tenant and request.custom_domain.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Allow CORS preflight requests to pass through
        if request.method == 'OPTIONS':
            request.tenant = None
            request.custom_domain = None
            return self.get_response(request)

        # 2. Extract and normalize hostname
        raw_host = request.get_host()
        hostname = normalize_hostname(raw_host)

        # Allow header override for testing if in DEBUG mode
        if settings.DEBUG and 'HTTP_X_TENANT_DOMAIN' in request.META:
            override_domain = request.META['HTTP_X_TENANT_DOMAIN']
            if override_domain:
                hostname = normalize_hostname(override_domain)

        request.tenant = None
        request.custom_domain = None
        request.normalized_host = hostname

        path = request.path

        # Platform domain configuration
        platform_domain = getattr(settings, 'PLATFORM_DOMAIN', 'prod.localhost').lower()
        is_platform_host = (hostname == platform_domain or hostname in ['localhost', '127.0.0.1'])

        # Allow Django admin and platform admin APIs on platform domain or localhost
        if is_platform_host:
            logger.info(f"Incoming Host: {hostname} | Platform Host | Request: {request.method} {path}")
            # Platform host does not have a tenant attached
            response = self.get_response(request)
            return response

        # 3. Lookup domain in custom_domains table
        try:
            domain_obj = CustomDomain.objects.select_related('tenant').filter(domain=hostname).first()
        except Exception as e:
            logger.error(f"Error querying custom_domains for host {hostname}: {e}")
            return JsonResponse({'error': 'Database error during tenant resolution.'}, status=500)

        # 4. Unknown domain handling (Phase 15)
        if not domain_obj:
            logger.warning(f"Incoming Host: {hostname} | Unknown Domain | Request: {request.method} {path}")
            return JsonResponse({
                'error': 'Tenant / domain not configured.',
                'code': 'TENANT_NOT_FOUND',
                'host': hostname
            }, status=404)

        # 5. Inactive domain check
        if domain_obj.status == TenantStatus.INACTIVE:
            logger.warning(f"Incoming Host: {hostname} | Inactive Domain | Request: {request.method} {path}")
            return JsonResponse({
                'error': 'This domain is currently inactive.',
                'code': 'DOMAIN_INACTIVE',
                'host': hostname
            }, status=403)

        tenant = domain_obj.tenant

        # 6. Inactive tenant handling (Phase 16)
        if tenant.status == TenantStatus.INACTIVE:
            logger.warning(f"Incoming Host: {hostname} | Inactive Tenant: {tenant.id} ({tenant.name}) | Request: {request.method} {path}")
            return JsonResponse({
                'error': 'Tenant account is currently inactive.',
                'code': 'TENANT_INACTIVE',
                'tenant_id': tenant.id,
                'tenant_name': tenant.name
            }, status=403)

        # 7. Attach tenant and domain to request
        request.tenant = tenant
        request.custom_domain = domain_obj

        logger.info(f"Incoming Host: {hostname} | Resolved Tenant: {tenant.id} ({tenant.name}) | Request: {request.method} {path}")

        response = self.get_response(request)
        return response
