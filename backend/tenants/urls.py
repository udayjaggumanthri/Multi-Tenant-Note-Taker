from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenants.views import (
    TenantPublicView,
    WebsiteSettingsView,
    PlatformAdminTenantViewSet,
    PlatformAdminStatsView,
    VerifyDomainView,
    HealthCheckView
)

router = DefaultRouter()
router.register(r'admin/tenants', PlatformAdminTenantViewSet, basename='admin-tenants')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('tenant/', TenantPublicView.as_view(), name='tenant-public'),
    path('website/', WebsiteSettingsView.as_view(), name='tenant-website-settings'),
    path('admin/stats/', PlatformAdminStatsView.as_view(), name='admin-stats'),
    path('domains/<int:domain_id>/verify/', VerifyDomainView.as_view(), name='domain-verify'),
    path('', include(router.urls)),
]
