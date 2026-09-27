import os
from django.core.management.base import BaseCommand
from django.db import transaction
from django_tenants.utils import schema_context
from tenants.models import Client, Domain, WebsiteSettings, TenantStatus
from users.models import User, UserRole
from notes.models import Note


class Command(BaseCommand):
    help = 'Seeds initial multi-tenant test data using django-tenants schemas for Public, Tenant 101 (ABC), and Tenant 102 (XYZ)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting django-tenants PostgreSQL schema seeding...'))

        # 1. Public Schema (Platform Master)
        public_tenant, _ = Client.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Multi-Tenant Platform Master',
                'slug': 'public',
                'status': TenantStatus.ACTIVE,
            }
        )

        for d in ['prod.localhost', 'localhost', '127.0.0.1']:
            Domain.objects.get_or_create(
                domain=d,
                defaults={
                    'tenant': public_tenant,
                    'is_primary': (d == 'prod.localhost'),
                    'status': TenantStatus.ACTIVE
                }
            )
        self.stdout.write(self.style.SUCCESS('Public schema configured with prod.localhost'))

        # 2. Platform Admin User (in public schema)
        platform_admin, _ = User.objects.get_or_create(
            email='admin@prod.com',
            defaults={
                'name': 'Platform Administrator',
                'role': UserRole.PLATFORM_ADMIN,
                'tenant': None,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        platform_admin.set_password('AdminPass@123')
        platform_admin.save()
        self.stdout.write(self.style.SUCCESS('Platform Admin ready: admin@prod.com / AdminPass@123'))

        # 3. Tenant 101: ABC Electronics (tenant_abc schema)
        tenant_101, _ = Client.objects.get_or_create(
            schema_name='tenant_abc',
            defaults={
                'id': 101,
                'name': 'ABC Electronics',
                'slug': 'abc-electronics',
                'status': TenantStatus.ACTIVE,
            }
        )
        Domain.objects.get_or_create(
            domain='abc.localhost',
            defaults={
                'tenant': tenant_101,
                'is_primary': True,
                'status': TenantStatus.ACTIVE,
            }
        )
        WebsiteSettings.objects.get_or_create(
            tenant=tenant_101,
            defaults={
                'company_name': 'ABC Electronics',
                'website_title': 'Welcome to ABC Electronics',
                'description': 'Leading provider of next-generation consumer electronics and smart devices.',
                'primary_color': '#2563EB',
            }
        )
        ravi, _ = User.objects.get_or_create(
            email='ravi@abc.com',
            defaults={
                'name': 'Ravi Kumar',
                'role': UserRole.TENANT_ADMIN,
                'tenant': tenant_101,
            }
        )
        ravi.set_password('RaviPass@123')
        ravi.save()

        # Seed notes inside tenant_abc physical schema
        with schema_context('tenant_abc'):
            Note.objects.get_or_create(
                title='ABC Secret Note',
                defaults={
                    'content': 'Confidential R&D specs for Project Quantum 2026. ABC proprietary data.',
                    'category': 'R&D',
                    'is_pinned': True,
                    'created_by': ravi,
                }
            )
            Note.objects.get_or_create(
                title='ABC Q3 Roadmap',
                defaults={
                    'content': 'Finalizing supply chain logistics and partner onboarding for Q3.',
                    'category': 'Operations',
                    'is_pinned': False,
                    'created_by': ravi,
                }
            )
        self.stdout.write(self.style.SUCCESS('Tenant 101 (ABC Electronics) ready: ravi@abc.com / RaviPass@123 | abc.localhost'))

        # 4. Tenant 102: XYZ Furniture (tenant_xyz schema)
        tenant_102, _ = Client.objects.get_or_create(
            schema_name='tenant_xyz',
            defaults={
                'id': 102,
                'name': 'XYZ Furniture',
                'slug': 'xyz-furniture',
                'status': TenantStatus.ACTIVE,
            }
        )
        Domain.objects.get_or_create(
            domain='xyz.localhost',
            defaults={
                'tenant': tenant_102,
                'is_primary': True,
                'status': TenantStatus.ACTIVE,
            }
        )
        WebsiteSettings.objects.get_or_create(
            tenant=tenant_102,
            defaults={
                'company_name': 'XYZ Furniture',
                'website_title': 'Welcome to XYZ Furniture',
                'description': 'Artisan handcrafted furniture and modern interior design solutions.',
                'primary_color': '#7C3AED',
            }
        )
        john, _ = User.objects.get_or_create(
            email='john@xyz.com',
            defaults={
                'name': 'John Doe',
                'role': UserRole.TENANT_ADMIN,
                'tenant': tenant_102,
            }
        )
        john.set_password('JohnPass@123')
        john.save()

        # Seed notes inside tenant_xyz physical schema
        with schema_context('tenant_xyz'):
            Note.objects.get_or_create(
                title='XYZ Secret Note',
                defaults={
                    'content': 'Confidential patent application for Ergonomic Mesh Chair v2.',
                    'category': 'Patents',
                    'is_pinned': True,
                    'created_by': john,
                }
            )
            Note.objects.get_or_create(
                title='XYZ Warehouse Inventory',
                defaults={
                    'content': 'Q3 warehouse stock review: 450 oak desks, 1200 ergonomic chairs.',
                    'category': 'Inventory',
                    'is_pinned': False,
                    'created_by': john,
                }
            )
        self.stdout.write(self.style.SUCCESS('Tenant 102 (XYZ Furniture) ready: john@xyz.com / JohnPass@123 | xyz.localhost'))
        self.stdout.write(self.style.SUCCESS('ALL TENANTS AND SCHEMAS SEEDED WITH 100% SUCCESS!'))
