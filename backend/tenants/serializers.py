from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers
from django_tenants.utils import schema_context
from tenants.models import Client, Domain, WebsiteSettings, TenantStatus, DatabaseStrategy, DomainType
from users.models import User, UserRole


class CustomDomainSerializer(serializers.ModelSerializer):
    domain_type_display = serializers.CharField(source='get_domain_type_display', read_only=True)

    class Meta:
        model = Domain
        fields = [
            'id', 'domain', 'domain_type', 'domain_type_display',
            'is_primary', 'is_verified', 'verification_token', 'status', 'created_at'
        ]


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
    db_strategy_display = serializers.CharField(source='get_db_strategy_display', read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'slug', 'schema_name', 'status', 'db_strategy', 'db_strategy_display',
            'created_at', 'updated_at', 'domains', 'website_settings',
            'primary_domain', 'notes_count'
        ]

    def get_primary_domain(self, obj):
        primary = obj.domains.filter(is_primary=True).first()
        return primary.domain if primary else None

    def get_notes_count(self, obj):
        if obj.schema_name == 'public':
            return 0
        from django_tenants.utils import schema_context
        from notes.models import Note
        try:
            with schema_context(obj.schema_name):
                return Note.objects.count()
        except Exception:
            return 0


class CreateTenantSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    slug = serializers.CharField(max_length=100, required=False)
    admin_name = serializers.CharField(max_length=255)
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, min_length=6)
    domain = serializers.CharField(max_length=255)
    domain_type = serializers.ChoiceField(choices=DomainType.choices, default=DomainType.SUBDOMAIN)
    db_strategy = serializers.ChoiceField(choices=DatabaseStrategy.choices, default=DatabaseStrategy.ISOLATED_SCHEMA)
    primary_color = serializers.CharField(max_length=50, required=False, default='#2563EB')
    website_title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_domain(self, value):
        from tenants.middleware import normalize_hostname, is_ip_address
        normalized = normalize_hostname(value)
        if not normalized:
            raise serializers.ValidationError("Domain name cannot be empty.")
        if is_ip_address(normalized):
            raise serializers.ValidationError("An IP address cannot be registered as a domain name.")
        if Domain.objects.filter(domain=normalized).exists():
            raise serializers.ValidationError(f"Domain '{normalized}' is already registered.")
        return normalized

    def validate_admin_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(f"User with email '{value}' already exists.")
        return value

    def validate_slug(self, value):
        s = slugify(value) if value else ''
        if s and Client.objects.filter(slug=s).exists():
            raise serializers.ValidationError(f"Tenant slug '{s}' is already in use.")
        return s

    def create(self, validated_data):
        import uuid
        name = validated_data['name']
        slug = validated_data.get('slug') or slugify(name)

        base_slug = slug
        counter = 1
        while Client.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        admin_name = validated_data['admin_name']
        admin_email = validated_data['admin_email']
        admin_password = validated_data['admin_password']
        domain_name = validated_data['domain']
        domain_type = validated_data.get('domain_type', DomainType.SUBDOMAIN)
        db_strategy = validated_data.get('db_strategy', DatabaseStrategy.ISOLATED_SCHEMA)
        primary_color = validated_data.get('primary_color', '#2563EB')
        website_title = validated_data.get('website_title', '') or f"Welcome to {name}"
        description = validated_data.get('description', '') or f"Official workspace and documentation portal for {name}."

        schema_name = f"tenant_{slug.replace('-', '_')}"

        with schema_context('public'):
            with transaction.atomic():
                # 1. Create client (django-tenants auto-creates schema)
                tenant = Client.objects.create(
                    schema_name=schema_name,
                    name=name,
                    slug=slug,
                    status=TenantStatus.ACTIVE,
                    db_strategy=db_strategy
                )

            # 2. Create tenant administrator
            admin_user = User.objects.create_user(
                email=admin_email,
                password=admin_password,
                name=admin_name,
                role=UserRole.TENANT_ADMIN,
                tenant=tenant
            )

            # 3. Create domain mapping
            verification_token = f"mtn-{uuid.uuid4().hex[:12]}"
            Domain.objects.create(
                tenant=tenant,
                domain=domain_name,
                domain_type=domain_type,
                is_primary=True,
                is_verified=True if domain_type == DomainType.SUBDOMAIN else False,
                verification_token=verification_token,
                status=TenantStatus.ACTIVE
            )

            # 4. Create website branding settings
            WebsiteSettings.objects.create(
                tenant=tenant,
                company_name=name,
                website_title=website_title,
                description=description,
                primary_color=primary_color,
                logo=''
            )

        return tenant
