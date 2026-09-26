from django.test import TestCase, Client, override_settings
from rest_framework import status
from tenants.models import Tenant, CustomDomain, WebsiteSettings, TenantStatus
from users.models import User, UserRole
from notes.models import Note


class MultiTenantArchitectureTests(TestCase):
    def setUp(self):
        # 1. Platform Admin
        self.platform_admin = User.objects.create_user(
            email='admin@prod.com',
            password='AdminPass@123',
            name='Platform Admin',
            role=UserRole.PLATFORM_ADMIN,
            is_staff=True
        )

        # 2. Tenant 101 (ABC Electronics)
        self.tenant_101 = Tenant.objects.create(
            id=101,
            name='ABC Electronics',
            slug='abc-electronics',
            status=TenantStatus.ACTIVE
        )
        self.domain_101 = CustomDomain.objects.create(
            tenant=self.tenant_101,
            domain='abc.localhost',
            is_primary=True,
            status=TenantStatus.ACTIVE
        )
        self.settings_101 = WebsiteSettings.objects.create(
            tenant=self.tenant_101,
            company_name='ABC Electronics',
            primary_color='#2563EB'
        )
        self.user_101 = User.objects.create_user(
            email='ravi@abc.com',
            password='RaviPass@123',
            name='Ravi Kumar',
            role=UserRole.TENANT_ADMIN,
            tenant=self.tenant_101
        )
        self.note_101 = Note.objects.create(
            tenant=self.tenant_101,
            created_by=self.user_101,
            title='ABC Secret Note',
            content='ABC confidential specification.'
        )

        # 3. Tenant 102 (XYZ Furniture)
        self.tenant_102 = Tenant.objects.create(
            id=102,
            name='XYZ Furniture',
            slug='xyz-furniture',
            status=TenantStatus.ACTIVE
        )
        self.domain_102 = CustomDomain.objects.create(
            tenant=self.tenant_102,
            domain='xyz.localhost',
            is_primary=True,
            status=TenantStatus.ACTIVE
        )
        self.settings_102 = WebsiteSettings.objects.create(
            tenant=self.tenant_102,
            company_name='XYZ Furniture',
            primary_color='#7C3AED'
        )
        self.user_102 = User.objects.create_user(
            email='john@xyz.com',
            password='JohnPass@123',
            name='John Doe',
            role=UserRole.TENANT_ADMIN,
            tenant=self.tenant_102
        )
        self.note_102 = Note.objects.create(
            tenant=self.tenant_102,
            created_by=self.user_102,
            title='XYZ Secret Note',
            content='XYZ blueprint secret.'
        )

    # ========================================================
    # 1. DOMAIN RESOLUTION & NORMALIZATION TESTS (Phase 13, 14)
    # ========================================================
    def test_domain_resolution_abc(self):
        client = Client()
        response = client.get('/api/tenant/', HTTP_HOST='abc.localhost')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['id'], 101)
        self.assertEqual(data['name'], 'ABC Electronics')
        self.assertEqual(data['website_settings']['primary_color'], '#2563EB')

    def test_domain_resolution_xyz(self):
        client = Client()
        response = client.get('/api/tenant/', HTTP_HOST='xyz.localhost')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['id'], 102)
        self.assertEqual(data['name'], 'XYZ Furniture')
        self.assertEqual(data['website_settings']['primary_color'], '#7C3AED')

    def test_hostname_normalization_port_and_case(self):
        client = Client()
        # Mixed case and port number attached
        response = client.get('/api/tenant/', HTTP_HOST='ABC.LOCALHOST:8000')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['id'], 101)

    # ========================================================
    # 2. UNKNOWN DOMAIN HANDLING (Phase 15)
    # ========================================================
    def test_unknown_domain_returns_404(self):
        client = Client()
        response = client.get('/api/tenant/', HTTP_HOST='unknown.localhost')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertIn('Tenant / domain not configured.', data['error'])

    # ========================================================
    # 3. INACTIVE TENANT HANDLING (Phase 16, 28)
    # ========================================================
    def test_inactive_tenant_returns_403(self):
        self.tenant_101.status = TenantStatus.INACTIVE
        self.tenant_101.save()

        client = Client()
        response = client.get('/api/tenant/', HTTP_HOST='abc.localhost')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertIn('Tenant account is currently inactive.', data['error'])

    # ========================================================
    # 4. TENANT LOGIN ISOLATION (Phase 12)
    # ========================================================
    def test_cross_tenant_login_blocked(self):
        client = Client()
        # Ravi (tenant 101) attempts to log in on xyz.localhost (tenant 102 domain)
        response = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='xyz.localhost')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_correct_tenant_login_succeeds(self):
        client = Client()
        response = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='abc.localhost')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.json())

    # ========================================================
    # 5. DATA ISOLATION TESTS (Phase 17, 19, 27)
    # ========================================================
    def test_notes_list_isolation(self):
        client = Client()
        # Log in Ravi on abc.localhost
        login_res = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='abc.localhost')
        token = login_res.json()['token']

        # Get notes on abc.localhost
        res = client.get('/api/notes/', HTTP_HOST='abc.localhost', HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        notes = res.json()
        titles = [n['title'] for n in notes]
        self.assertIn('ABC Secret Note', titles)
        self.assertNotIn('XYZ Secret Note', titles)

    def test_direct_access_to_other_tenant_note_returns_404(self):
        client = Client()
        # Log in Ravi
        login_res = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='abc.localhost')
        token = login_res.json()['token']

        # Ravi tries to access Note belonging to Tenant 102
        res = client.get(f'/api/notes/{self.note_102.id}/', HTTP_HOST='abc.localhost', HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_manipulated_tenant_id_in_payload_ignored(self):
        client = Client()
        login_res = client.post('/api/auth/login/', {
            'email': 'ravi@abc.com',
            'password': 'RaviPass@123'
        }, HTTP_HOST='abc.localhost')
        token = login_res.json()['token']

        # Attempt to create a note with tenant_id=102 while on abc.localhost
        res = client.post('/api/notes/', {
            'title': 'Attempted Hijack Note',
            'content': 'Injecting into tenant 102',
            'tenant_id': 102
        }, content_type='application/json', HTTP_HOST='abc.localhost', HTTP_AUTHORIZATION=f'Token {token}')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        note_data = res.json()
        # Must strictly be assigned to Tenant 101
        self.assertEqual(note_data['tenant_id'], 101)

    # ========================================================
    # 6. PLATFORM ADMIN TESTS (Phase 10, 11, 28)
    # ========================================================
    def test_platform_admin_create_tenant(self):
        client = Client()
        # Platform admin login on prod.localhost
        login_res = client.post('/api/auth/login/', {
            'email': 'admin@prod.com',
            'password': 'AdminPass@123',
            'is_platform_login': True
        }, HTTP_HOST='prod.localhost')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        token = login_res.json()['token']

        # Create Tenant 103
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

        # Verify new tenant resolves
        resolve_res = client.get('/api/tenant/', HTTP_HOST='delta.localhost')
        self.assertEqual(resolve_res.status_code, status.HTTP_200_OK)
        self.assertEqual(resolve_res.json()['name'], 'Delta Logistics')

    # ========================================================
    # 7. SECURITY: DIRECT IP & HOST HEADER PROTECTION
    # ========================================================
    @override_settings(ALLOWED_HOSTS=['*'])
    def test_direct_ip_access_blocked(self):
        """Direct access via public IP address must be rejected with 403 Forbidden."""
        client = Client()
        res = client.get('/api/tenant/', HTTP_HOST='198.51.100.24')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        data = res.json()
        self.assertEqual(data.get('code'), 'DIRECT_IP_ACCESS_DENIED')

    @override_settings(ALLOWED_HOSTS=['*'])
    def test_unregistered_domain_blocked(self):
        """Pointing an unauthorized/unregistered domain to server must return 404."""
        client = Client()
        res = client.get('/api/tenant/', HTTP_HOST='evil-attacker.com')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        data = res.json()
        self.assertEqual(data.get('code'), 'TENANT_NOT_FOUND')

    def test_domain_verification_endpoint(self):
        """Platform Admin can verify DNS configuration for a domain."""
        client = Client()
        login_res = client.post('/api/auth/login/', {
            'email': 'admin@prod.com',
            'password': 'AdminPass@123',
            'is_platform_login': True
        }, HTTP_HOST='prod.localhost')
        token = login_res.json()['token']

        # Verify abc.localhost domain
        verify_res = client.post(
            f'/api/domains/{self.domain_101.id}/verify/',
            HTTP_HOST='prod.localhost',
            HTTP_AUTHORIZATION=f'Token {token}'
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_res.json()['verified'])

