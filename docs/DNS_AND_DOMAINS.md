# Multi-Tenant Note Taker — Complete Domain & DNS Configuration Manual

> **Who is this guide for?**
> - **Customers & Workspace Owners**: Learn how to connect your company domain (e.g. `notes.yourcompany.com` or `yourcompany.com`) in under 5 minutes without technical headaches.
> - **Platform Administrators & DevOps**: Configure wildcard DNS, Nginx reverse proxy headers, Let's Encrypt SSL certificates, and direct IP attack rejection.

---

## Table of Contents
1. [How Multi-Tenant Domains Work (In Plain English)](#1-how-multi-tenant-domains-work-in-plain-english)
2. [Domain Types Supported](#2-domain-types-supported)
3. [Customer Guide: Connecting Your Custom Domain](#3-customer-guide-connecting-your-custom-domain)
   - [Option A: Connecting a Subdomain (Recommended — e.g. `notes.yourbrand.com`)](#option-a-connecting-a-subdomain-recommended)
   - [Option B: Connecting a Root Apex Domain (e.g. `yourbrand.com`)](#option-b-connecting-a-root-apex-domain)
4. [Step-by-Step Provider Instructions](#4-step-by-step-provider-instructions)
   - [Cloudflare](#cloudflare)
   - [GoDaddy](#godaddy)
   - [Namecheap](#namecheap)
   - [AWS Route 53](#aws-route-53)
5. [How to Verify DNS Propagation](#5-how-to-verify-dns-propagation)
6. [Administrator Guide: Platform Setup & Wildcards](#6-administrator-guide-platform-setup--wildcards)
   - [Wildcard DNS Setup](#wildcard-dns-setup)
   - [Let's Encrypt Wildcard SSL Setup](#lets-encrypt-wildcard-ssl-setup)
   - [Host Header Security & Direct IP Rejection](#host-header-security--direct-ip-rejection)
7. [Troubleshooting & Frequently Asked Questions](#7-troubleshooting--frequently-asked-questions)

---

## 1. How Multi-Tenant Domains Work (In Plain English)

Imagine an apartment high-rise:
- The entire building shares one foundation and plumbing system (**Single Application, Single PostgreSQL Database**).
- Each tenant has their own private apartment key and dedicated room that no other resident can access (**Physical PostgreSQL Schema Isolation**).
- Visitors locate your apartment using your private doorbell nameplate (**Your Custom Domain or Subdomain**).

When anyone opens your domain in a browser:
```
1. Browser requests: https://notes.acme.com
              │
              ▼
2. DNS points to our Server IP: 198.51.100.24
              │
              ▼
3. Nginx passes the "Host: notes.acme.com" header to Django
              │
              ▼
4. Django Tenant Middleware matches domain in Database:
   "notes.acme.com" ──► Schema: "tenant_acme"
              │
              ▼
5. PostgreSQL search_path is locked to "tenant_acme"
   (Zero cross-tenant data exposure, guaranteed at database kernel level)
              │
              ▼
6. React UI renders Acme's logo, colors, and notes!
```

---

## 2. Domain Types Supported

| Domain Type | Example | When to Use | Setup Time |
| :--- | :--- | :--- | :--- |
| **Platform Subdomain** | `acme.yourplatform.com` | Default out-of-the-box domain assigned when signing up | **Instant (0 minutes)** |
| **Custom Subdomain** | `notes.acme.com` | Recommended for companies with an existing website | **2 - 5 minutes** |
| **Apex Custom Domain** | `acme.com` | Dedicated standalone brand presence | **5 minutes** |

---

## 3. Customer Guide: Connecting Your Custom Domain

### Option A: Connecting a Subdomain (Recommended)
*Example: Connecting `notes.mycompany.com`*

This is the easiest, cleanest, and most recommended method because it will not conflict with your main marketing website.

1. Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, Google Domains, etc.).
2. Navigate to **DNS Management** for your domain (`mycompany.com`).
3. Click **Add New Record**:
   - **Type**: `CNAME`
   - **Host / Name**: `notes` (or whatever subdomain prefix you chose)
   - **Target / Value**: `yourplatform.com` (or the domain provided by your admin)
   - **TTL**: `Automatic` or `300` (5 minutes)
4. Save the record.

---

### Option B: Connecting a Root Apex Domain
*Example: Connecting `mycompany.com`*

Use this option if you want our application to run directly on your primary domain.

1. Log in to your domain registrar.
2. Navigate to **DNS Management** for `mycompany.com`.
3. Click **Add New Record**:
   - **Type**: `A`
   - **Host / Name**: `@` (represents the root domain)
   - **Value / Target IP**: `198.51.100.24` *(Replace with your VPS Public IP)*
   - **TTL**: `Automatic` or `300`
4. *(Optional but recommended)* Add a `CNAME` record for `www`:
   - **Type**: `CNAME`
   - **Host / Name**: `www`
   - **Value / Target**: `mycompany.com`
5. Save the records.

---

## 4. Step-by-Step Provider Instructions

### Cloudflare
1. Log in to your **Cloudflare Dashboard** and select your domain.
2. In the left navigation, click **DNS** ➔ **Records**.
3. Click **Add record**:
   - **Type**: `CNAME`
   - **Name**: `notes`
   - **Target**: `yourplatform.com`
   - **Proxy status**: Set to **DNS only (Grey cloud)** during initial verification. (You can turn on Orange Cloud Proxy once verified).
   - **TTL**: `Auto`
4. Click **Save**.

### GoDaddy
1. Log in to your **GoDaddy Domain Portfolio**.
2. Click on the domain you want to configure, then select **DNS** (or **Manage DNS**).
3. In the **DNS Records** section, click **Add New Record**:
   - **Type**: `CNAME`
   - **Name**: `notes`
   - **Value**: `yourplatform.com`
   - **TTL**: `1/2 Hour` or default
4. Click **Save**.

### Namecheap
1. Log in to your **Namecheap Account** and click **Domain List**.
2. Click **Manage** next to your domain, then click the **Advanced DNS** tab.
3. In **Host Records**, click **Add New Record**:
   - **Type**: `CNAME Record`
   - **Host**: `notes`
   - **Target**: `yourplatform.com.` *(Include the trailing dot if prompted)*
   - **TTL**: `Automatic`
4. Click the green checkmark to save.

### AWS Route 53
1. Open the **AWS Route 53 Console** and click **Hosted zones**.
2. Select your domain.
3. Click **Create record**:
   - **Record name**: `notes`
   - **Record type**: `CNAME`
   - **Value**: `yourplatform.com`
   - **TTL**: `300`
4. Click **Create records**.

---

## 5. How to Verify DNS Propagation

DNS changes usually take between **2 minutes and 2 hours** to update worldwide.

### Method 1: In the Multi-Tenant Platform
1. Log in to your **Workspace Dashboard** or **Platform Admin Console**.
2. Open **Domain Settings**.
3. Click the **"Verify DNS"** button next to your custom domain.
4. If DNS has propagated, the status badge will switch to **Verified** in green.

### Method 2: Online DNS Lookup Tool
Open [whatsmydns.net](https://www.whatsmydns.net/):
1. Enter your domain: `notes.yourcompany.com`.
2. Select `CNAME` from the dropdown.
3. Click **Search**.
4. Check that green checkmarks appear globally pointing to your platform.

### Method 3: Command Line Terminal
Open your terminal (macOS / Linux / Windows PowerShell):
```bash
# Check CNAME record
nslookup -type=CNAME notes.yourcompany.com

# Or using dig (Linux/macOS)
dig +short CNAME notes.yourcompany.com
```

---

## 6. Administrator Guide: Platform Setup & Wildcards

### Wildcard DNS Setup
To allow tenants to instantly claim subdomains (e.g. `tenant1.yourplatform.com`, `tenant2.yourplatform.com`) without adding DNS records every time:

Add a **Wildcard A Record** in your platform DNS zone:
- **Type**: `A`
- **Name**: `*`
- **Value**: `YOUR_VPS_PUBLIC_IP`
- **TTL**: `300`

Add a Root Record:
- **Type**: `A`
- **Name**: `@`
- **Value**: `YOUR_VPS_PUBLIC_IP`

### Let's Encrypt Wildcard SSL Setup
Run the following Certbot command on your Linux VPS using DNS challenge (Certbot will request a TXT DNS record):
```bash
sudo certbot certonly \
  --manual \
  --preferred-challenges=dns \
  -d yourplatform.com \
  -d "*.yourplatform.com"
```
Or use the automated Cloudflare Certbot plugin:
```bash
sudo apt install python3-certbot-dns-cloudflare
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d yourplatform.com \
  -d "*.yourplatform.com"
```

### Host Header Security & Direct IP Rejection
In enterprise multi-tenancy, attackers scan server IP addresses directly. Our production Nginx configuration terminates these requests instantly:

```nginx
# Catch-all: Drop direct IP access and rogue domains with zero bytes returned
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    ssl_reject_handshake on; # Nginx >= 1.19.4
    return 444; # Nginx non-standard code: Close connection immediately
}
```

Furthermore, Django's `AppTenantMiddleware` enforces:
1. Direct IPv4 / IPv6 host header rejection (`403 Forbidden: DIRECT_IP_ACCESS_DENIED`).
2. Unregistered domain rejection (`404 Not Found: TENANT_NOT_FOUND`).
3. Deactivated tenant isolation (`403 Forbidden: TENANT_INACTIVE`).

---

## 7. Troubleshooting & Frequently Asked Questions

#### Q: I added the DNS record, but the browser says "Tenant / domain not configured" (HTTP 404).
**Cause**: The domain is pointing to the server, but has not yet been registered inside the Platform Admin Console.  
**Fix**: Log into `prod.yourplatform.com/admin/tenants` and ensure the domain is added to the tenant's domain list.

#### Q: The site shows "Tenant account is currently inactive" (HTTP 403).
**Cause**: The tenant's subscription or status was changed to `INACTIVE` by the Platform Admin.  
**Fix**: Reactivate the tenant from the Platform Admin dashboard.

#### Q: How long does DNS take to start working?
**Answer**: While DNS propagation can theoretically take up to 24-48 hours, modern providers (Cloudflare, GoDaddy, Route 53) typically propagate within **2 to 10 minutes** when TTL is set to 300 seconds.
