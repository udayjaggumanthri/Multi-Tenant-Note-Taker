# Multi-Tenant Note Taker — Enterprise Architecture Manual

Comprehensive architectural specification for the Multi-Tenant Note Taker SaaS platform, detailing physical PostgreSQL schema isolation, dynamic domain resolution, security boundaries, and production Linux VPS topology.

---

## 1. System Topology & Architectural Blueprint

```mermaid
graph TD
    Client["Browser / Client<br/>(e.g., https://notes.acme.com)"] -->|HTTPS:443| DNS["DNS Server / Cloudflare<br/>(A or CNAME Record)"]
    DNS -->|Points to VPS Public IP| NGINX["Nginx Reverse Proxy (Port 80/443)"]
    
    subgraph "Edge Security & Routing Layer"
        NGINX -->|Direct IP / Scanner| DROP["Drop TCP Connection<br/>(HTTP 444: 0 Bytes)"]
        NGINX -->|Static Files /static/| STATIC["Serve Static Assets Cache"]
        NGINX -->|Frontend SPA /| VITE["Serve React 19 Dist Bundle"]
        NGINX -->|API & Admin /api/, /admin/| GUNICORN["Gunicorn WSGI Workers<br/>(127.0.0.1:8000 via PM2)"]
    end

    subgraph "Django Multi-Tenant Engine"
        GUNICORN --> MIDDLEWARE["AppTenantMiddleware<br/>(django-tenants)"]
        MIDDLEWARE -->|Validate Host Header| DOMAIN_CHECK{"Domain Registered in DB?"}
        DOMAIN_CHECK -->|No| R404["HTTP 404: TENANT_NOT_FOUND"]
        DOMAIN_CHECK -->|Yes| STATUS_CHECK{"Tenant Status Active?"}
        STATUS_CHECK -->|Inactive| R403["HTTP 403: TENANT_INACTIVE"]
        STATUS_CHECK -->|Active| SCHEMA_SWITCH["PostgreSQL search_path = 'tenant_slug', 'public'"]
    end

    subgraph "PostgreSQL 16 Multi-Schema Database"
        SCHEMA_SWITCH --> DB[("multitenant_notes")]
        DB --> PUBLIC["public Schema<br/>├── clients<br/>├── domains<br/>├── website_settings<br/>├── users<br/>└── authtoken"]
        DB --> TENANT_A["tenant_abc Schema<br/>└── notes_note (ABC Data Only)"]
        DB --> TENANT_B["tenant_xyz Schema<br/>└── notes_note (XYZ Data Only)"]
    end
```

---

## 2. Multi-Tenancy Strategy: Physical Schema Isolation

### Why `django-tenants` Physical Schema Isolation?
In software-as-a-service architectures, there are three primary multi-tenancy models:

| Approach | Implementation | Isolation Level | Data Leakage Risk | Maintenance Overhead |
| :--- | :--- | :--- | :--- | :--- |
| **Shared Database, Shared Tables** | `WHERE tenant_id = ?` column | Low (Application-level) | **High** (Developer bug can expose all rows) | Low |
| **Schema-per-Tenant (Our Architecture)** | PostgreSQL native schemas | **High (Database kernel-level)** | **Zero** (Locked via `search_path`) | Moderate |
| **Database-per-Tenant** | Separate DB instances | Maximum | Zero | Very High (Expensive server costs) |

### PostgreSQL `search_path` Mechanics
When `AppTenantMiddleware` identifies the tenant (e.g. `ABC Electronics`), it executes:
```sql
SET search_path TO "tenant_abc", "public";
```
- Every standard query (`SELECT * FROM notes_note`) automatically resolves to `tenant_abc.notes_note`.
- Code **cannot physically read or write** rows in `tenant_xyz.notes_note`.
- Primary keys and sequence generators (`notes_note_id_seq`) are completely independent per tenant.
- A rogue client attempting to inject `tenant_id=102` in a JSON payload has zero effect because tenant identity is derived purely from the incoming domain and database schema context.

---

## 3. Schema Data Models & ERD

```mermaid
erDiagram
    Client ||--o{ Domain : "owns (1:N)"
    Client ||--|| WebsiteSettings : "configures (1:1)"
    Client ||--o{ User : "members (1:N)"
    Client ||--o{ Note : "schema-isolated (1:N)"

    Client {
        bigint id PK
        string schema_name UK "e.g. tenant_abc"
        string name "ABC Electronics"
        string slug UK "abc-electronics"
        string status "ACTIVE | INACTIVE"
        string db_strategy "ISOLATED_SCHEMA"
        timestamp created_at
    }

    Domain {
        bigint id PK
        bigint tenant_id FK
        string domain UK "e.g. abc.yourplatform.com"
        string domain_type "SUBDOMAIN | CUSTOM"
        boolean is_primary
        boolean is_verified
        string status "ACTIVE | INACTIVE"
    }

    WebsiteSettings {
        bigint id PK
        bigint tenant_id FK
        string company_name
        string website_title
        text description
        string primary_color "#2563EB"
        string logo
    }

    User {
        bigint id PK
        bigint tenant_id FK "nullable for Platform Admin"
        string email UK
        string name
        string role "PLATFORM_ADMIN | TENANT_ADMIN | MEMBER"
        boolean is_staff
        boolean is_superuser
    }

    Note {
        bigint id PK "Isolated sequence per schema"
        string title
        text content
        string category "e.g. Operations, R&D"
        boolean is_pinned
        bigint created_by_id FK
        timestamp created_at
    }
```

---

## 4. End-to-End Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant Nginx as Nginx Reverse Proxy
    participant Vite as React SPA
    participant Django as Django AppTenantMiddleware
    participant DB as PostgreSQL (multitenant_notes)

    User->>Nginx: GET https://notes.acme.com/
    Nginx->>Vite: Serve React index.html
    Vite-->>User: Render SPA Canvas

    Note over User,Vite: React Context Bootstraps
    User->>Nginx: GET /api/tenant/ (Host: notes.acme.com)
    Nginx->>Django: Proxy request + Preserve Host: notes.acme.com

    Django->>Django: Normalize Host (Strip port, lowercase)
    Django->>DB: Query Domain WHERE domain = 'notes.acme.com'
    DB-->>Django: Returns Tenant 'Acme Corp' (schema: tenant_acme)
    
    Django->>DB: SET search_path TO "tenant_acme", "public"
    Django-->>Nginx: 200 OK (Name, Theme Color: #2563EB, Schema: tenant_acme)
    Nginx-->>User: JSON Response

    Note over User,Vite: React injects CSS token --tenant-primary: #2563EB
    User->>Nginx: GET /api/notes/ (Authorization: Token ...)
    Nginx->>Django: Proxy request + Auth Token
    Django->>DB: SELECT * FROM notes_note ORDER BY is_pinned DESC
    DB-->>Django: Returns Acme's notes only
    Django-->>User: 200 OK (Isolated Notes Array)
```

---

## 5. Security Boundary & Defense-in-Depth

The platform enforces a **6-Layer Defense Architecture**:

```
[Layer 1: Nginx Network Boundary]
  ├── Raw IP Access (http://198.51.100.24/) ──► Dropped immediately with HTTP 444 (0 bytes)
  └── Non-HTTP/TLS scanning ───────────────────► ssl_reject_handshake on

[Layer 2: Django Host Header Validation]
  └── AppTenantMiddleware blocks direct IP strings ──► 403 Forbidden (DIRECT_IP_ACCESS_DENIED)

[Layer 3: Dynamic Domain Existence Verification]
  └── Hostname must exist in PostgreSQL Domain table ──► 404 Not Found (TENANT_NOT_FOUND)

[Layer 4: Tenant Lifecycle State Enforcement]
  └── Inactive / Suspended tenant subscriptions ────────► 403 Forbidden (TENANT_INACTIVE)

[Layer 5: Cross-Tenant Authentication Isolation]
  └── Token Authentication enforces user.tenant == request.tenant
  └── Cross-domain token replay attacks blocked ───────► 403 Forbidden (CROSS_TENANT_LOGIN_BLOCKED)

[Layer 6: Kernel-Level PostgreSQL Schema Isolation]
  └── search_path = "tenant_<slug>", "public"
  └── Physical table separation prevents SQL injection data cross-over
```

---

## 6. Linux VPS Production Topology

```mermaid
graph LR
    subgraph "Linux VPS Host (Ubuntu 22.04 / 24.04 LTS)"
        subgraph "Ports 80 & 443"
            NGINX["Nginx Web Server"]
        end

        subgraph "Internal Loopback 127.0.0.1:8000"
            GUNICORN["Gunicorn WSGI<br/>(4 Workers, Keepalive: 32)"]
            PM2["PM2 Daemon Supervisor<br/>(Auto-restart, Log Rotate)"]
            PM2 -.->|Monitors| GUNICORN
        end

        subgraph "Internal Loopback 127.0.0.1:5432"
            PG["PostgreSQL 16 Server<br/>(Connection Pooling: 60s)"]
            CRON["Automated Daily Backup Cron<br/>(pg_dump + gzip, 14-day retention)"]
            CRON -.->|Dumps all schemas| PG
        end

        NGINX -->|Unix Socket / HTTP 127.0.0.1:8000| GUNICORN
        GUNICORN -->|TCP 127.0.0.1:5432| PG
    end
```

---

## 7. Zero-Downtime Deployment & Maintenance Cycle

Updates are deployed using the atomic update pipeline [`deploy/scripts/deploy_update.sh`](deploy/scripts/deploy_update.sh):
1. **Code Synchronization**: Pulls clean commits from Git `origin/main`.
2. **Schema Migration**: Executes `python manage.py migrate_schemas` (automatically identifies schema diffs across all tenant schemas).
3. **Static Collection**: Runs `python manage.py collectstatic --noinput` to update Django assets.
4. **Bundle Compilation**: Vite compiles the React bundle to `frontend/dist/`.
5. **Process Hot Reload**: PM2 triggers a graceful cluster reload of Gunicorn workers (`pm2 reload ecosystem.config.cjs`) with zero dropped requests.
6. **Reverse Proxy Reload**: Nginx validates configuration (`nginx -t`) and reloads in-memory worker pools.
