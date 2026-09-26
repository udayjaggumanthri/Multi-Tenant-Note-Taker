import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ArrowLeft, Copy, Check, Server, ShieldCheck, HelpCircle, Layers, CheckCircle2 } from 'lucide-react';

export default function DnsGuidePage() {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      <div className="page-header">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-tenant">System Architecture & Infrastructure</span>
        </div>
        <h1 className="page-title">Domain & DNS Configuration Guide</h1>
        <p className="page-desc">
          Complete manual for connecting subdomains, custom enterprise domains, and configuring Nginx reverse proxy.
        </p>
      </div>

      {/* Visual Flow Banner */}
      <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: '#60A5FA' }}>
          How Domain Resolution Works in this Multi-Tenant Architecture
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          A common misconception is that DNS selects the tenant. In reality, <strong>DNS only directs the user's browser to your VPS IP address</strong>. The original domain name is sent in the HTTP request's <code>Host</code> header. Nginx preserves this header, and Django's <code>TenantMiddleware</code> matches it in the PostgreSQL database.
        </p>

        <div style={{
          background: '#0B0F19',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.825rem',
          color: '#93C5FD',
          overflowX: 'auto',
          lineHeight: 1.7
        }}>
          Browser Request (abc.company.com)<br />
          &nbsp;&nbsp;↓<br />
          DNS Resolver (Points to VPS Public IP)<br />
          &nbsp;&nbsp;↓<br />
          Nginx Web Server (Listens on port 80/443)<br />
          &nbsp;&nbsp;↓ (Preserves: proxy_set_header Host $host)<br />
          Django REST Backend (Gunicorn 127.0.0.1:8000)<br />
          &nbsp;&nbsp;↓<br />
          TenantMiddleware (Queries custom_domains table for "abc.company.com")<br />
          &nbsp;&nbsp;↓<br />
          Attaches request.tenant = Tenant 101<br />
          &nbsp;&nbsp;↓<br />
          Database Queries (WHERE tenant_id = 101)<br />
          &nbsp;&nbsp;↓<br />
          React Frontend (Renders ABC branding & isolated data)
        </div>
      </div>

      {/* 2-Column Options */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Subdomain */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="badge badge-tenant">Option 1</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Platform Subdomains</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            Tenants access your application via a subdomain under your SaaS platform (e.g. <code>acme.prod.com</code>).
          </p>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, color: '#38BDF8', marginBottom: '0.4rem' }}>
              One-Time Platform DNS Setup:
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Add a wildcard DNS record in your platform's domain registrar:
            </div>
            <div className="mono" style={{ background: '#000', padding: '0.5rem', borderRadius: '4px', marginTop: '0.4rem', color: '#6EE7B7' }}>
              Type: A | Host: * | Value: YOUR_VPS_IP
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Once this wildcard record exists, <strong>any</strong> new tenant subdomain (e.g. <code>xyz.prod.com</code>) works instantly without touching DNS again!
          </p>
        </div>

        {/* Custom Domain */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="badge badge-active">Option 2</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Independent Custom Domains</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            Enterprise clients who want their own brand (e.g. <code>notes.clientbrand.com</code> or <code>clientbrand.com</code>).
          </p>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, color: '#34D399', marginBottom: '0.4rem' }}>
              Client DNS Setup:
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              The client creates a CNAME pointing to your SaaS platform:
            </div>
            <div className="mono" style={{ background: '#000', padding: '0.5rem', borderRadius: '4px', marginTop: '0.4rem', color: '#6EE7B7' }}>
              Type: CNAME | Host: notes | Value: prod.yourdomain.com
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Nginx captures the incoming domain name and Django matches it in <code>custom_domains</code> automatically.
          </p>
        </div>
      </div>

      {/* Registrar Walkthroughs */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Step-by-Step DNS Instructions by Provider
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Cloudflare */}
          <div style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ color: '#F59E0B', fontWeight: 700, marginBottom: '0.5rem' }}>Cloudflare</h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>Navigate to your domain in the Cloudflare dashboard and click <strong>DNS</strong>.</li>
              <li>Click <strong>Add Record</strong> and choose <code>CNAME</code>.</li>
              <li>Enter your subdomain prefix (e.g. <code>notes</code>) in <strong>Name</strong>.</li>
              <li>Enter your SaaS base domain (e.g. <code>prod.yourdomain.com</code>) in <strong>Target</strong>.</li>
              <li><strong>Crucial Step:</strong> Set Proxy Status to <strong>DNS Only</strong> (Grey cloud icon) so Let's Encrypt SSL certificates can be issued directly to your VPS.</li>
              <li>Click <strong>Save</strong>.</li>
            </ul>
          </div>

          {/* GoDaddy */}
          <div style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ color: '#10B981', fontWeight: 700, marginBottom: '0.5rem' }}>GoDaddy</h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>Go to <strong>Domain Portfolio</strong> &rarr; click your domain name.</li>
              <li>Select the <strong>DNS</strong> tab and click <strong>Add New Record</strong>.</li>
              <li>Select Type: <code>CNAME</code>.</li>
              <li>Name: Enter your subdomain (e.g. <code>notes</code> or <code>portal</code>).</li>
              <li>Value: Enter your platform domain (e.g. <code>prod.yourdomain.com</code>).</li>
              <li>TTL: Select <strong>1/2 Hour</strong> and click <strong>Save</strong>.</li>
            </ul>
          </div>

          {/* Namecheap */}
          <div style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ color: '#EF4444', fontWeight: 700, marginBottom: '0.5rem' }}>Namecheap</h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>Open your <strong>Domain List</strong> and click <strong>Manage</strong> next to your domain.</li>
              <li>Click on the <strong>Advanced DNS</strong> tab.</li>
              <li>Click <strong>Add New Record</strong> and choose <code>CNAME Record</code>.</li>
              <li>Host: <code>notes</code> | Target: <code>prod.yourdomain.com</code>.</li>
              <li>Click the green checkmark to save.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SSL / Certbot Instructions */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: '#A78BFA' }}>
          Free Automatic SSL (HTTPS) with Let's Encrypt & Certbot
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Once the client or tenant has pointed their DNS record to your server, generate a trusted TLS/SSL certificate directly on your VPS with Certbot:
        </p>

        <div style={{ background: '#030712', borderRadius: 'var(--radius-md)', padding: '1.25rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>BASH COMMAND ON VPS:</span>
            <button
              onClick={() => handleCopy('sudo certbot --nginx -d customdomain.com', 'certbot')}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            >
              {copiedKey === 'certbot' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
              {copiedKey === 'certbot' ? 'Copied' : 'Copy Command'}
            </button>
          </div>
          <pre className="mono" style={{ color: '#93C5FD', margin: 0, fontSize: '0.85rem' }}>
            sudo certbot --nginx -d customdomain.com
          </pre>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          Certbot automatically provisions the certificate, enables HTTP to HTTPS redirection, and configures automated 90-day renewal in systemd.
        </p>
      </div>

      {/* SECURITY & HOST PROTECTION SECTION */}
      <div className="card" style={{ marginTop: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <ShieldCheck size={22} color="#EF4444" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FCA5A5' }}>
            Security: What If Someone Discovers Our VPS IP & Points Their Domain to It?
          </h3>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          A common security concern in multi-tenant SaaS architecture is: <em>"If an attacker or port scanner finds our server IP address, can they point a rogue domain to our server or scan our application directly?"</em>
          <br /><br />
          Our platform implements a <strong>4-Layer Defense-in-Depth architecture</strong> that completely prevents unauthorized domain pointing, direct IP scans, and host header spoofing:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Layer 1 */}
          <div style={{ background: '#0B0F19', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60A5FA', marginBottom: '0.4rem' }}>
              LAYER 1: NGINX DEFAULT_SERVER DROP
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Nginx includes a <code>default_server</code> catch-all block. Any HTTP or HTTPS request that does not match an authorized tenant domain is dropped immediately using Nginx code <code>444</code> (Connection Closed Without Response). Zero bytes sent.
            </p>
          </div>

          {/* Layer 2 */}
          <div style={{ background: '#0B0F19', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34D399', marginBottom: '0.4rem' }}>
              LAYER 2: DIRECT IP ACCESS DENIAL
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Django's <code>TenantMiddleware</code> inspects every incoming <code>Host</code> header. If a visitor accesses the public IP directly, the middleware rejects the request with HTTP <code>403 DIRECT_IP_ACCESS_DENIED</code>.
            </p>
          </div>

          {/* Layer 3 */}
          <div style={{ background: '#0B0F19', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F59E0B', marginBottom: '0.4rem' }}>
              LAYER 3: DATABASE DOMAIN WHITELIST
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              If an attacker configures <code>evil-site.com &rarr; YOUR_IP</code>, Django performs a strict database lookup in <code>custom_domains</code>. Since the domain is unregistered, it is immediately blocked with HTTP 404/400.
            </p>
          </div>

          {/* Layer 4 */}
          <div style={{ background: '#0B0F19', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#A78BFA', marginBottom: '0.4rem' }}>
              LAYER 4: CLOUDFLARE ORIGIN MASKING
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              In production, placing Cloudflare in front of the platform hides your origin VPS IP from DNS lookups. Linux UFW firewall rules can be configured to only accept incoming traffic from Cloudflare proxy IPs.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '0.4rem' }}>
            Verification in Test Suite:
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Automated test cases <code>test_direct_ip_access_blocked</code> and <code>test_unregistered_domain_blocked</code> continuously verify that direct IP and rogue domain pointing are 100% blocked.
          </p>
        </div>
      </div>
    </div>
  );
}
