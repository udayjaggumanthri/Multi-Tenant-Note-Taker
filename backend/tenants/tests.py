from django.test import TestCase, Client as HttpClient, override_settings
from django.db import connection
from rest_framework import status
from django_tenants.utils import schema_context
from tenants.models import Client as TenantModel, Domain as DomainModel, WebsiteSettings, TenantStatus
from users.models import User, UserRole
from notes.models import Note


class MultiTenantArchitectureTests(TestCase):
    def setUp(self):
        connection.set_schema_to_public()

        # 1. Public Schema Client & Platform Domain
        self.public_tenant, _ = TenantModel.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Platform Master',
                'slug': 'public',
                'status': TenantStatus.ACTIVE
            }
        )
        self.public_domain, _ = DomainModel.objects.get_or_create(
            domain='prod.localhost',
            defaults={
                'tenant': self.public_tenant,
                'is_primary': True,
                'status': TenantStatus.ACTIVE
            }
        )

        # 2. Platform Admin User (in public schema)
        self.platform_admin, _ = User.objects.get_or_create(
            email='admin@prod.com',
            defaults={
                'name': 'Platform Admin',
                'role': UserRole.PLATFORM_ADMIN,
                'is_staff': True,
                'is_superuser': True
            }
        )
        self.platform_admin.set_password('AdminPass@123')
        self.platform_admin.save()

        # 3. Tenant 101 (ABC Electronics)
        self.tenant_101, _ = TenantModel.objects.get_or_create(
            schema_name='tenant_abc',
            defaults={
                'id': 101,
                'name': 'ABC Electronics',
                'slug': 'abc-electronics',
                'status': TenantStatus.ACTIVE
            }
        )
        self.domain_101, _ = DomainModel.objects.get_or_create(
            domain='abc.localhost',
            defaults={
                'tenant': self.tenant_101,
                'is_primary': True,
                'status': TenantStatus.ACTIVE
            }
        )
        self.settings_101, _ = WebsiteSettings.objects.get_or_create(
            tenant=self.tenant_101,
            defaults={
                'company_name': 'ABC Electronics',
                'primary_color': '#2563EB'
            }
        )
        self.user_101, _ = User.objects.get_or_create(
            email='ravi@abc.com',
            defaults={
                'name': 'Ravi Kumar',
                'role': UserRole.TENANT_ADMIN,
                'tenant': self.tenant_101
            }
        )
        self.user_101.set_password('RaviPass@123')
        self.user_101.save()

        with schema_context('tenant_abc'):
            self.note_101, _ = Note.objects.get_or_create(
                title='ABC Secret Note',
                defaults={
                    'content': 'ABC confidential specification.',
                    'created_by': self.user_101
                }
            )

        connection.set_schema_to_public()

        # 4. Tenant 102 (XYZ Furniture)
        self.tenant_102, _ = TenantModel.objects.get_or_create(
            schema_name='tenant_xyz',
            defaults={
                'id': 102,
                'name': 'XYZ Furniture',
                'slug': 'xyz-furniture',
                'status': TenantStatus.ACTIVE
            }
        )
        self.domain_102, _ = DomainModel.objects.get_or_create(
            domain='xyz.localhost',
            defaults={
                'tenant': self.tenant_102,
                'is_primary': True,
                'status': TenantStatus.ACTIVE
            }
        )
        self.settings_102, _ = WebsiteSettings.objects.get_or_create(
            tenant=self.tenant_102,
            defaults={
                'company_name': 'XYZ Furniture',
                'primary_color': '#7C3AED'
            }
        )
        self.user_102, _ = User.objects.get_or_create(
            email='john@xyz.com',
            defaults={
                'name': 'John Doe',
                'role': UserRole.TENANT_ADMIN,
                'tenant': self.tenant_102
            }
        )
        self.user_102.set_password('JohnPass@123')
        self.user_102.save()

        with schema_context('tenant_xyz'):
            self.note_102, _ = Note.objects.get_or_create(
                title='XYZ Secret Note',
                defaults={
                    'content': 'XYZ blueprint secret.',
                    'created_by': self.user_102
                }
            )
            # Create a second note in XYZ so its ID will not exist in ABC (which only has 1 note)
            self.note_102_unique, _ = Note.objects.get_or_create(
                title='XYZ Distinct Note',
                defaults={
                    'content': 'XYZ second note content.',
                    'created_by': self.user_102
                }
            )

        connection.set_schema_to_public()

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    # ========================================================
    # 1. DOMAIN RESOLUTION & NORMALIZATION TESTS
    # ========================================================
    def test_domain_resolution_abc(self):
        client = HttpClient()
        response = client.get('/api/tenant/', HTTP_HOST='abc.localhost')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['id'], 101)
        self.assertEqual(data['name'], 'ABC Electronics')
        self.assertEqual(data['website_settings']['primary_color'], '#2563EB')

    def test_domain_resolution_xyz(self):
        client = HttpClient()
        response = client.get('/api/tenant/', HTTP_HOST='xyz.localhost')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['id'], 102)
        self.assertEqual(data['name'], 'XYZ Furniture')
        self.assertEqual(data['website_settings']['primary_color'], '#7C3AED')

    def test_hostname_normalization(self):
        """Host headers with ports and uppercase must normalize cleanly."""
        client = HttpClient()
        response = client.get('/api/tenant/', HTTP_HOST='ABC.LOCALHOST:8000')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['id'], 101)

    # ========================================================
    # 2. UNKNOWN DOMAIN HANDLING
    # ========================================================
    def test_unknown_domain_returns_404(self):
        client = HttpClient()
        response = client.get('/api/tenant/', HTTP_HOST='unknown.localhost')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertIn('Tenant / domain not configured.', data['error'])

    # ========================================================
    # 3. INACTIVE TENANT HANDLING
    # ========================================================
    def test_inactive_tenant_returns_403(self):
        self.tenant_101.status = TenantStatus.INACTIVE
        self.tenant_101.save()

        client = HttpClient()
        response = client.get('/api/tenant/', HTTP_HOST='abc.localhost')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertIn('Tenant account is currently inactive.', data['error'])

    # ========================================================
    # 4. TENANT LOGIN ISOLATION
    # ========================================================
    def test_cross_tenant_login_blocked(self):
        client = HttpClient()
        response = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='xyz.localhost')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_correct_tenant_login_succeeds(self):
        client = HttpClient()
        response = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='abc.localhost')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.json())

    # ========================================================
    # 5. DATA ISOLATION TESTS
    # ========================================================
    def test_notes_list_isolation(self):
        client = HttpClient()
        login_res = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='abc.localhost')
        token = login_res.json()['token']

        res = client.get('/api/notes/', HTTP_HOST='abc.localhost', HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        notes = res.json()
        titles = [n['title'] for n in notes]
        self.assertIn('ABC Secret Note', titles)
        self.assertNotIn('XYZ Secret Note', titles)

    def test_direct_access_to_other_tenant_note_returns_404(self):
        client = HttpClient()
        login_res = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='abc.localhost')
        token = login_res.json()['token']

        # Ravi on abc.localhost tries to access XYZ-only Note ID -> 404 Not Found
        res = client.get(f'/api/notes/{self.note_102_unique.id}/', HTTP_HOST='abc.localhost', HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Accessing note on abc.localhost returns ABC's note, never XYZ content
        res_abc = client.get(f'/api/notes/{self.note_101.id}/', HTTP_HOST='abc.localhost', HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(res_abc.status_code, status.HTTP_200_OK)
        self.assertEqual(res_abc.json()['title'], 'ABC Secret Note')
        self.assertNotEqual(res_abc.json()['title'], 'XYZ Secret Note')

    def test_manipulated_tenant_id_in_payload_ignored(self):
        client = HttpClient()
        login_res = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='abc.localhost')
        token = login_res.json()['token']

        res = client.post('/api/notes/', {
            'title': 'Attempted Hijack Note',
            'content': 'Injecting into tenant 102',
            'tenant_id': 102
        }, content_type='application/json', HTTP_HOST='abc.localhost', HTTP_AUTHORIZATION=f'Token {token}')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        note_data = res.json()
        self.assertEqual(note_data['tenant_id'], 101)

    # ========================================================
    # 6. PLATFORM ADMIN TESTS
    # ========================================================
    def test_platform_admin_create_tenant(self):
        client = HttpClient()
        login_res = client.post('/api/auth/login/', {
            'email': 'admin@prod.com',
            'password': 'AdminPass@123',
            'is_platform_login': True
        }, HTTP_HOST='prod.localhost')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        token = login_res.json()['token']

        create_res = client.post('/api/admin/tenants/', {
            'name': 'Delta Logistics',
            'slug': 'delta-logistics',
            'admin_name': 'Delta Admin',
            'admin_email': 'admin@delta.com',
            'admin_password': 'DeltaPass@123',
            'domain': 'delta.localhost',
            'primary_color': '#10B981'
        }, content_type='application/json', HTTP_HOST='prod.localhost', HTTP_AUTHORIZATION=f'Token {token}')

        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        new_tenant = create_res.json()
        self.assertEqual(new_tenant['name'], 'Delta Logistics')

        resolve_res = client.get('/api/tenant/', HTTP_HOST='delta.localhost')
        self.assertEqual(resolve_res.status_code, status.HTTP_200_OK)
        self.assertEqual(resolve_res.json()['name'], 'Delta Logistics')

    # ========================================================
    # 7. SECURITY: DIRECT IP & HOST HEADER PROTECTION
    # ========================================================
    @override_settings(ALLOWED_HOSTS=['*'])
    def test_direct_ip_access_blocked(self):
        """Direct access via public IP address must be rejected with 403 Forbidden."""
        client = HttpClient()
        res = client.get('/api/tenant/', HTTP_HOST='198.51.100.24')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        data = res.json()
        self.assertEqual(data.get('code'), 'DIRECT_IP_ACCESS_DENIED')

    @override_settings(ALLOWED_HOSTS=['*'])
    def test_unregistered_domain_blocked(self):
        """Pointing an unauthorized/unregistered domain to server must return 404."""
        client = HttpClient()
        res = client.get('/api/tenant/', HTTP_HOST='evil-attacker.com')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        data = res.json()
        self.assertEqual(data.get('code'), 'TENANT_NOT_FOUND')

    def test_domain_verification_endpoint(self):
        """Platform Admin can verify DNS configuration for a domain."""
        client = HttpClient()
        login_res = client.post('/api/auth/login/', {
            'email': 'admin@prod.com',
            'password': 'AdminPass@123',
            'is_platform_login': True
        }, HTTP_HOST='prod.localhost')
        token = login_res.json()['token']

        verify_res = client.post(
            f'/api/domains/{self.domain_101.id}/verify/',
            HTTP_HOST='prod.localhost',
            HTTP_AUTHORIZATION=f'Token {token}'
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_res.json()['verified'])
