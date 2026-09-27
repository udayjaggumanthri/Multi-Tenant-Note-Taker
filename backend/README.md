# Multi-Tenant Note Taker — Backend Application

Robust, production-ready Django REST Framework backend powered by **`django-tenants`** for physical PostgreSQL schema-per-tenant data isolation.

---

## 1. Multi-Tenancy Architecture

The application implements **Physical Schema-per-Tenant Isolation** within a single PostgreSQL database instance.

```
                      PostgreSQL Database (multitenant_notes)
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
    public Schema             tenant_abc Schema           tenant_xyz Schema
   (Shared Platform)          (ABC Electronics)            (XYZ Furniture)
  ├── clients (Tenants)       └── notes_note (Notes)       └── notes_note (Notes)
  ├── domains (Domains)
  ├── website_settings
  ├── users_user (Users)
  └── authtoken_token
```

### Key Architectural Advantages
1. **Zero Data Leakage Risk**: Unlike shared-table systems that rely solely on `WHERE tenant_id = ?` filters in application code, `django-tenants` sets PostgreSQL's native `search_path = "tenant_abc", "public"`. Queries cannot physically access rows in other tenant schemas.
2. **Independent Table Sequences**: Each tenant has their own auto-incrementing ID sequences.
3. **Targeted Maintenance**: A single tenant schema can be backed up, inspected, restored, or migrated independently.

---

## 2. Configuration (`settings.py`)

### Shared Apps vs Tenant Apps
```python
SHARED_APPS = [
    'django_tenants',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'tenants',      # Client, Domain, WebsiteSettings
    'users',        # Custom User model
]

TENANT_APPS = [
    'django.contrib.contenttypes',
    'notes',        # Note model physically created in each tenant schema
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = "tenants.Client"
TENANT_DOMAIN_MODEL = "tenants.Domain"
DATABASE_ROUTERS = ('django_tenants.routers.TenantSyncRouter',)
```

### Production Connection Pooling & Throttling
```python
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': 'multitenant_notes',
        'CONN_MAX_AGE': 60,            # Persistent connection pooling
        'CONN_HEALTH_CHECKS': True,    # Validate connection health
    }
}

REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/minute',
        'user': '1000/minute'
    }
}
```

---

## 3. Middleware Security Pipeline (`AppTenantMiddleware`)

Incoming HTTP requests pass through `tenants.middleware.AppTenantMiddleware`:

1. **Host Header Extraction & Normalization**: Strips ports (e.g. `:8000`), trims whitespace, and converts to lowercase.
2. **Direct IP Access Rejection**: If the Host header is an IPv4 or IPv6 address (e.g. scanner hitting `198.51.100.24`), the request is rejected immediately with `403 Forbidden` (`DIRECT_IP_ACCESS_DENIED`).
3. **Domain Lookup**: Resolves domain in `tenants.Domain`. If unregistered, returns `404 Not Found` (`TENANT_NOT_FOUND`).
4. **Tenant Status Check**: If `tenant.status == 'INACTIVE'`, returns `403 Forbidden` (`TENANT_INACTIVE`).
5. **Schema Switch**: Sets `connection.set_tenant(tenant)`. PostgreSQL queries are now scoped to the tenant's schema.

---

## 4. API Endpoints Catalog

### Public & Tenant Discovery
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tenant/` | None | Resolves active tenant details and branding for the incoming domain |
| `POST` | `/api/auth/login/` | None | Authenticates tenant users or platform admins. Enforces tenant boundary |

### Notes API (Tenant Scoped)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notes/` | Tenant User | Lists notes in the active tenant schema |
| `POST` | `/api/notes/` | Tenant User | Creates a note inside the active tenant schema |
| `GET` | `/api/notes/<id>/` | Tenant User | Retrieves note by ID in the active tenant schema |
| `PUT/PATCH` | `/api/notes/<id>/` | Tenant User | Updates note in active tenant schema |
| `DELETE` | `/api/notes/<id>/` | Tenant User | Deletes note from active tenant schema |

### Tenant Branding Settings
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings/` | Tenant Admin | Retrieves company branding settings |
| `PUT/PATCH` | `/api/settings/` | Tenant Admin | Updates company name, website title, description, and primary color |

### Platform Admin API
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/tenants/` | Platform Admin | Lists all tenants across schemas |
| `POST` | `/api/admin/tenants/` | Platform Admin | Creates tenant, provisions PostgreSQL schema, admin user, domain, & brand |
| `PATCH` | `/api/admin/tenants/<id>/` | Platform Admin | Toggles tenant status (`ACTIVE` / `INACTIVE`) |
| `GET` | `/api/admin/stats/` | Platform Admin | Aggregates cross-schema statistics (total tenants, notes, active status) |
| `POST` | `/api/domains/<id>/verify/` | Platform Admin | Tests live DNS propagation for a domain |

---

## 5. Development & Testing Commands

From the `backend` directory (with virtual environment activated):

```bash
# 1. Run migrations for shared apps (public schema)
python manage.py migrate_schemas --shared

# 2. Run migrations for tenant schemas
python manage.py migrate_schemas --tenant

# 3. Seed initial tenants (ABC Electronics, XYZ Furniture, Platform Admin)
python manage.py seed_data

# 4. Run automated unit test suite (14 tests covering domain resolution, isolation, and security)
python manage.py test

# 5. Start development server
python manage.py runserver 0.0.0.0:8000
```
