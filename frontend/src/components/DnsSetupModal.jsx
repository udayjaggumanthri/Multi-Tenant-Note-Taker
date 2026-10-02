import React, { useState } from 'react';
import { X, Copy, Check, Globe, HelpCircle, Server, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export default function DnsSetupModal({ isOpen, onClose, initialDomain = 'company.com' }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'providers' | 'verify' | 'security'

  const { platformDomain = 'flowiq.in', serverIp = '139.99.47.143' } = useTenant();

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const domain = initialDomain || 'company.com';
  const isSubdomain = domain.split('.').length > 2;
  const hostLabel = isSubdomain ? domain.split('.')[0] : '@';
  const cnameTarget = platformDomain || 'flowiq.in';
  const publicIp = serverIp || '139.99.47.143';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div className="card" style={{
        maxWidth: '820px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '2.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60A5FA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Globe size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>DNS & Custom Domain Configuration</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              How to point <strong>{domain}</strong> to this SaaS platform with zero downtime
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', margin: '1.5rem 0 1.25rem' }}>
          <button
            onClick={() => setActiveTab('records')}
            className={`nav-link ${activeTab === 'records' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', cursor: 'pointer', paddingBottom: '0.75rem' }}
          >
            Required DNS Records
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`nav-link ${activeTab === 'providers' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', cursor: 'pointer', paddingBottom: '0.75rem' }}
          >
            Registrar Instructions
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`nav-link ${activeTab === 'verify' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', cursor: 'pointer', paddingBottom: '0.75rem' }}
          >
            Testing & Propagation
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', cursor: 'pointer', paddingBottom: '0.75rem', color: activeTab === 'security' ? '#FCA5A5' : undefined }}
          >
            🛡️ IP & Domain Security
          </button>
        </div>

        {/* TAB 1: REQUIRED DNS RECORDS */}
        {activeTab === 'records' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              To connect <strong>{domain}</strong> to your multi-tenant instance, log in to your DNS provider (e.g. Cloudflare, GoDaddy, Namecheap) and add <strong>either</strong> an <code>A</code> record or a <code>CNAME</code> record:
            </p>

            {/* Method A: CNAME */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#60A5FA' }}>
                  Option A: CNAME Record (Recommended for subdomains like notes.{domain})
                </span>
                <span className="badge badge-tenant">Subdomain Routing</span>
              </div>
              <div className="table-container" style={{ margin: '0.75rem 0' }}>
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Host / Name</th>
                      <th>Value / Points To</th>
                      <th>TTL</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono" style={{ fontWeight: 700, color: '#38BDF8' }}>CNAME</td>
                      <td className="mono">{hostLabel}</td>
                      <td className="mono">{cnameTarget}</td>
                      <td>Auto / 300s</td>
                      <td>
                        <button
                          onClick={() => handleCopy(cnameTarget, 'cname')}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {copiedKey === 'cname' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          {copiedKey === 'cname' ? 'Copied' : 'Copy Target'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                * Points your subdomain to your SaaS platform cluster: <code>{cnameTarget}</code>.
              </div>
            </div>

            {/* Method B: A Record */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#34D399' }}>
                  Option B: A Record (Required for root apex domains like {domain})
                </span>
                <span className="badge badge-active">Apex Routing</span>
              </div>
              <div className="table-container" style={{ margin: '0.75rem 0' }}>
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Host / Name</th>
                      <th>IP Address</th>
                      <th>TTL</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono" style={{ fontWeight: 700, color: '#10B981' }}>A</td>
                      <td className="mono">@</td>
                      <td className="mono">{publicIp}</td>
                      <td>Auto / 300s</td>
                      <td>
                        <button
                          onClick={() => handleCopy(publicIp, 'a')}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {copiedKey === 'a' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          {copiedKey === 'a' ? 'Copied' : 'Copy IP'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                * Points your apex root domain directly to your platform VPS server IP: <code>{publicIp}</code>.
              </div>
            </div>

            {/* How Nginx & Django Handle It */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#93C5FD', marginBottom: '0.35rem' }}>
                How the Request Reaches the Tenant:
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                1. DNS points client traffic to your VPS IP: <code>{publicIp}</code>.<br />
                2. Nginx accepts the connection and preserves <code>Host: {domain}</code>.<br />
                3. Django's <code>AppTenantMiddleware</code> queries registered domains for <code>{domain}</code>.<br />
                4. The corresponding tenant schema is activated and their isolated notes and branding are rendered.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTRAR WALKTHROUGHS */}
        {activeTab === 'providers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Cloudflare */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ color: '#F59E0B', marginBottom: '0.4rem', fontSize: '0.95rem', fontWeight: 700 }}>
                1. Cloudflare DNS
              </h4>
              <ol style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Log in to Cloudflare and select your domain.</li>
                <li>Go to <strong>DNS &rarr; Records</strong> and click <strong>Add record</strong>.</li>
                <li>Set <strong>Type</strong> to <code>A</code> (Host: <code>@</code>, IPv4: <code>{publicIp}</code>) or <code>CNAME</code> (Host: <code>{hostLabel}</code>, Target: <code>{cnameTarget}</code>).</li>
                <li>Set <strong>Proxy status</strong>: Toggle to <strong>DNS only (Grey cloud)</strong> during initial verification so Let's Encrypt / Certbot can issue the SSL certificate directly.</li>
                <li>Click <strong>Save</strong>.</li>
              </ol>
            </div>

            {/* GoDaddy */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ color: '#10B981', marginBottom: '0.4rem', fontSize: '0.95rem', fontWeight: 700 }}>
                2. GoDaddy
              </h4>
              <ol style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Go to your <strong>Domain Portfolio</strong> &rarr; click your domain.</li>
                <li>Select <strong>DNS</strong> tab and click <strong>Add New Record</strong>.</li>
                <li>For Root Domain: Type <code>A</code>, Name <code>@</code>, Value <code>{publicIp}</code>.</li>
                <li>For Subdomain: Type <code>CNAME</code>, Name <code>{hostLabel}</code>, Value <code>{cnameTarget}</code>.</li>
                <li>TTL: <strong>1/2 Hour</strong> (or default). Click <strong>Save</strong>.</li>
              </ol>
            </div>

            {/* Namecheap */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ color: '#EF4444', marginBottom: '0.4rem', fontSize: '0.95rem', fontWeight: 700 }}>
                3. Namecheap
              </h4>
              <ol style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Go to <strong>Domain List</strong> &rarr; click <strong>Manage</strong>.</li>
                <li>Open the <strong>Advanced DNS</strong> tab.</li>
                <li>Click <strong>Add New Record</strong>.</li>
                <li>For Root Domain: Choose <code>A Record</code>, Host <code>@</code>, Value <code>{publicIp}</code>.</li>
                <li>For Subdomain: Choose <code>CNAME Record</code>, Host <code>{hostLabel}</code>, Target <code>{cnameTarget}</code>.</li>
                <li>Click the green checkmark to save.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 3: VERIFICATION */}
        {activeTab === 'verify' && (
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              How to Test DNS Propagation
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              DNS records typically propagate within 2 to 15 minutes. You can verify your domain status using standard tools:
            </p>

            <div style={{ background: '#030712', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.4rem', fontWeight: 700 }}>
                TERMINAL / COMMAND PROMPT:
              </div>
              <pre className="mono" style={{ color: '#6EE7B7', fontSize: '0.825rem', overflowX: 'auto', margin: 0 }}>
                {`# Test with nslookup\nnslookup ${domain}\n\n# Test with dig\ndig +short ${domain}`}
              </pre>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Automatic HTTPS / SSL Provisioning
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Our platform automatically detects newly registered domains and expands your Let's Encrypt SSL certificate in the background. You can also manually trigger an instant certificate renewal on your VPS:
            </p>

            <div style={{ background: '#030712', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <pre className="mono" style={{ color: '#93C5FD', fontSize: '0.825rem', margin: 0 }}>
                {`sudo certbot --nginx -d ${domain}`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: IP & HOST SECURITY */}
        {activeTab === 'security' && (
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#FCA5A5' }}>
              Host Protection & Direct IP Access Prevention
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              If an external party or internet scanner discovers your server's public IP address ({publicIp}), our multi-tenant architecture protects your platform across 4 distinct layers:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: '#60A5FA', fontSize: '0.85rem' }}>1. Nginx Connection Drop (Code 444):</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Any direct IP visit or unrecognized domain is caught by Nginx's <code>default_server</code> and immediately closed without sending any response headers or bytes.
                </p>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: '#34D399', fontSize: '0.85rem' }}>2. Django Direct IP Blocker:</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Django <code>AppTenantMiddleware</code> inspects the <code>Host</code> header. Public IP addresses are strictly rejected with HTTP <code>403 DIRECT_IP_ACCESS_DENIED</code>.
                </p>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: '#F59E0B', fontSize: '0.85rem' }}>3. Rogue Domain Pointing Prevention:</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  If someone points their own unauthorized domain (e.g. <code>evil-site.com &rarr; {publicIp}</code>), the database lookup fails and returns <code>404 TENANT_NOT_FOUND</code>.
                </p>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: '#A78BFA', fontSize: '0.85rem' }}>4. Cloudflare Proxy Protection:</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  In production, enabling Cloudflare CDN masks your origin IP completely from DNS lookups.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            Got It, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
