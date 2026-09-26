from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers
from tenants.models import Tenant, CustomDomain, WebsiteSettings, TenantStatus
from users.models import User, UserRole


class CustomDomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomDomain
        fields = ['id', 'domain', 'is_primary', 'status', 'created_at']


class WebsiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteSettings
        fields = [
            'id', 'company_name', 'logo', 'website_title',
            'description', 'primary_color', 'updated_at'
        ]


class TenantSerializer(serializers.ModelSerializer):
    domains = CustomDomainSerializer(many=True, read_only=True)
    website_settings = WebsiteSettingsSerializer(read_only=True)
    primary_domain = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'slug', 'status', 'created_at', 'updated_at',
            'domains', 'website_settings', 'primary_domain', 'notes_count'
        ]

    def get_primary_domain(self, obj):
        primary = obj.domains.filter(is_primary=True).first()
        return primary.domain if primary else None

    def get_notes_count(self, obj):
        return obj.notes.count()


class CreateTenantSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    slug = serializers.CharField(max_length=100, required=False)
    admin_name = serializers.CharField(max_length=255)
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, min_length=6)
    domain = serializers.CharField(max_length=255)
    primary_color = serializers.CharField(max_length=50, required=False, default='#2563EB')
    website_title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_domain(self, value):
        from tenants.middleware import normalize_hostname
        normalized = normalize_hostname(value)
        if CustomDomain.objects.filter(domain=normalized).exists():
            raise serializers.ValidationError(f"Domain '{normalized}' is already registered.")
        return normalized

    def validate_admin_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(f"User with email '{value}' already exists.")
        return value

    def validate_slug(self, value):
        s = slugify(value) if value else ''
        if s and Tenant.objects.filter(slug=s).exists():
            raise serializers.ValidationError(f"Tenant slug '{s}' is already in use.")
        return s

    def create(self, validated_data):
        name = validated_data['name']
        slug = validated_data.get('slug') or slugify(name)

        # Ensure slug uniqueness
        base_slug = slug
        counter = 1
        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        admin_name = validated_data['admin_name']
        admin_email = validated_data['admin_email']
        admin_password = validated_data['admin_password']
        domain_name = validated_data['domain']
        primary_color = validated_data.get('primary_color', '#2563EB')
        website_title = validated_data.get('website_title', '') or f"Welcome to {name}"
        description = validated_data.get('description', '') or f"Official notes and documents for {name}."

        with transaction.atomic():
            # 1. Create tenant
            tenant = Tenant.objects.create(
                name=name,
                slug=slug,
                status=TenantStatus.ACTIVE
            )

            # 2. Create tenant administrator
            admin_user = User.objects.create_user(
                email=admin_email,
                password=admin_password,
                name=admin_name,
                role=UserRole.TENANT_ADMIN,
                tenant=tenant
            )

            # 3. Create custom domain
            custom_domain = CustomDomain.objects.create(
                tenant=tenant,
                domain=domain_name,
                is_primary=True,
                status=TenantStatus.ACTIVE
            )

            # 4. Create website settings
            website_settings = WebsiteSettings.objects.create(
                tenant=tenant,
                company_name=name,
                website_title=website_title,
                description=description,
                primary_color=primary_color,
                logo=''
            )

        return tenant
