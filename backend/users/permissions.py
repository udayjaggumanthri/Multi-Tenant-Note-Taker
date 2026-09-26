from rest_framework import permissions
from users.models import UserRole


class IsPlatformAdmin(permissions.BasePermission):
    """
    Allows access only to Platform Administrators.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.PLATFORM_ADMIN
        )


class IsTenantAdminOrPlatformAdmin(permissions.BasePermission):
    """
    Allows access to Tenant Admins of the current request.tenant,
    or Platform Admins.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.role == UserRole.PLATFORM_ADMIN:
            return True

        # For tenant admin, ensure the tenant is resolved and matches user.tenant_id
        if not getattr(request, 'tenant', None):
            return False

        return (
            request.user.role == UserRole.TENANT_ADMIN and
            request.user.tenant_id == request.tenant.id
        )


class IsTenantMember(permissions.BasePermission):
    """
    Ensures that authenticated users belong to the current request.tenant.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.role == UserRole.PLATFORM_ADMIN:
            return True

        if not getattr(request, 'tenant', None):
            return False

        return request.user.tenant_id == request.tenant.id
