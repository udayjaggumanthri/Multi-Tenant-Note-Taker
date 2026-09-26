import os
from django.core.management.base import BaseCommand
from django.db import transaction
from tenants.models import Tenant, CustomDomain, WebsiteSettings, TenantStatus
from users.models import User, UserRole
from notes.models import Note


class Command(BaseCommand):
    help = 'Seeds initial multi-tenant test data including Platform Admin, Tenant 101 (ABC), and Tenant 102 (XYZ)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Multi-Tenant data seeding...'))

        with transaction.atomic():
            # 1. Platform Admin
            platform_admin, created = User.objects.get_or_create(
                email='admin@prod.com',
                defaults={
                    'name': 'Uday (Platform Admin)',
                    'role': UserRole.PLATFORM_ADMIN,
                    'tenant': None,
                    'is_staff': True,
                    'is_superuser': True,
                }
            )
            platform_admin.set_password('AdminPass@123')
            platform_admin.save()
            self.stdout.write(self.style.SUCCESS(f'Platform Admin ready: admin@prod.com / AdminPass@123'))

            # 2. Tenant 101: ABC Electronics
            tenant_101, _ = Tenant.objects.update_or_create(
                id=101,
                defaults={
                    'name': 'ABC Electronics',
                    'slug': 'abc-electronics',
                    'status': TenantStatus.ACTIVE,
                }
            )

            # Domain for 101
            CustomDomain.objects.update_or_create(
                domain='abc.localhost',
                defaults={
                    'tenant': tenant_101,
                    'is_primary': True,
                    'status': TenantStatus.ACTIVE,
                }
            )

            # Website Settings for 101
            WebsiteSettings.objects.update_or_create(
                tenant=tenant_101,
                defaults={
                    'company_name': 'ABC Electronics',
                    'website_title': 'Welcome to ABC Electronics',
                    'description': 'Leading provider of next-generation consumer electronics and smart devices.',
                    'primary_color': '#2563EB',
                }
            )

            # Tenant Admin for 101
            ravi, _ = User.objects.update_or_create(
                email='ravi@abc.com',
                defaults={
                    'name': 'Ravi Kumar',
                    'role': UserRole.TENANT_ADMIN,
                    'tenant': tenant_101,
                }
            )
            ravi.set_password('RaviPass@123')
            ravi.save()

            # Notes for 101
            Note.objects.update_or_create(
                tenant=tenant_101,
                title='ABC Secret Note',
                defaults={
                    'content': 'Confidential R&D specs for Project Quantum 2026. ABC proprietary data.',
                    'created_by': ravi,
                }
            )
            Note.objects.update_or_create(
                tenant=tenant_101,
                title='ABC Q3 Roadmap',
                defaults={
                    'content': 'Finalizing supply chain logistics and partner onboarding for Q3.',
                    'created_by': ravi,
                }
            )
            self.stdout.write(self.style.SUCCESS('Tenant 101 (ABC Electronics) ready: ravi@abc.com / RaviPass@123 | abc.localhost'))

            # 3. Tenant 102: XYZ Furniture
            tenant_102, _ = Tenant.objects.update_or_create(
                id=102,
                defaults={
                    'name': 'XYZ Furniture',
                    'slug': 'xyz-furniture',
                    'status': TenantStatus.ACTIVE,
                }
            )

            # Domain for 102
            CustomDomain.objects.update_or_create(
                domain='xyz.localhost',
                defaults={
                    'tenant': tenant_102,
                    'is_primary': True,
                    'status': TenantStatus.ACTIVE,
                }
            )

            # Website Settings for 102
            WebsiteSettings.objects.update_or_create(
                tenant=tenant_102,
                defaults={
                    'company_name': 'XYZ Furniture',
                    'website_title': 'Welcome to XYZ Furniture',
                    'description': 'Handcrafted ergonomic office furnishings and Scandinavian interior design.',
                    'primary_color': '#7C3AED',
                }
            )

            # Tenant Admin for 102
            john, _ = User.objects.update_or_create(
                email='john@xyz.com',
                defaults={
                    'name': 'John Doe',
                    'role': UserRole.TENANT_ADMIN,
                    'tenant': tenant_102,
                }
            )
            john.set_password('JohnPass@123')
            john.save()

            # Notes for 102
            Note.objects.update_or_create(
                tenant=tenant_102,
                title='XYZ Secret Note',
                defaults={
                    'content': 'Top secret ergonomic desk prototype blueprint. Highly confidential for XYZ.',
                    'created_by': john,
                }
            )
            Note.objects.update_or_create(
                tenant=tenant_102,
                title='XYZ Warehouse Inventory',
                defaults={
                    'content': 'Stock replenishment schedule for autumn collection.',
                    'created_by': john,
                }
            )
            self.stdout.write(self.style.SUCCESS('Tenant 102 (XYZ Furniture) ready: john@xyz.com / JohnPass@123 | xyz.localhost'))

        self.stdout.write(self.style.SUCCESS('Seeding completed successfully!'))
