from django.db import models


class TenantStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'


class DatabaseStrategy(models.TextChoices):
    SHARED_DB = 'SHARED_DB', 'Shared Database (tenant_id)'
    SEPARATE_DB = 'SEPARATE_DB', 'Dedicated Database'
    ISOLATED_SCHEMA = 'ISOLATED_SCHEMA', 'Dedicated Schema'


class DomainType(models.TextChoices):
    SUBDOMAIN = 'SUBDOMAIN', 'Platform Subdomain'
    CUSTOM = 'CUSTOM', 'Custom Domain'


class Tenant(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    status = models.CharField(
        max_length=20,
        choices=TenantStatus.choices,
        default=TenantStatus.ACTIVE
    )
    db_strategy = models.CharField(
        max_length=30,
        choices=DatabaseStrategy.choices,
        default=DatabaseStrategy.SHARED_DB
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenants'
        ordering = ['id']

    def __str__(self):
        return f"{self.name} (ID: {self.id})"


class CustomDomain(models.Model):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='domains',
        db_column='tenant_id'
    )
    domain = models.CharField(max_length=255, unique=True)
    domain_type = models.CharField(
        max_length=20,
        choices=DomainType.choices,
        default=DomainType.SUBDOMAIN
    )
    is_primary = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=TenantStatus.choices,
        default=TenantStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'custom_domains'
        ordering = ['-is_primary', 'id']

    def __str__(self):
        return f"{self.domain} ({self.domain_type}) -> Tenant {self.tenant_id}"


class WebsiteSettings(models.Model):
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name='website_settings',
        db_column='tenant_id'
    )
    company_name = models.CharField(max_length=255)
    logo = models.CharField(max_length=500, blank=True, default='')
    website_title = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    primary_color = models.CharField(max_length=50, default='#2563EB')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'website_settings'

    def __str__(self):
        return f"Settings for {self.company_name} (Tenant: {self.tenant_id})"
