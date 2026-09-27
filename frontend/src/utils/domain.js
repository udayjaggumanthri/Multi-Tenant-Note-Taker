/**
 * Formats a tenant domain into a proper browser URL.
 * 
 * Logic:
 * 1. For local development domains (.localhost or 127.0.0.1):
 *    If currently running on a custom dev port (e.g. Vite :5173), keeps the port
 *    so local multi-domain switching works seamlessly.
 * 2. Multi-level ngrok subdomains (e.g. hi.something.ngrok-free.dev):
 *    Ngrok free tier certificates do NOT match nested subdomains (causing NET::ERR_CERT_COMMON_NAME_INVALID).
 *    Routes safely via query param ?tenant= or local port.
 * 3. When currently accessing via ngrok tunnel:
 *    Links route via `${origin}/?tenant=${slug}`.
 * 4. For real custom / production domains (e.g. flowiq.in, company.com):
 *    NEVER appends local development ports (:5173), resolving directly to standard HTTP/HTTPS.
 */
export function formatDomainUrl(domain, slug = '') {
  if (!domain) return '#';

  // Strip any accidental protocol or port already present
  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/:\d+$/, '').trim();
  const currentHost = window.location.hostname.toLowerCase();
  const currentPort = window.location.port;
  const tenantSlug = slug || cleanDomain.split('.')[0];

  // If a multi-level ngrok domain was stored (causes SSL ERR_CERT_COMMON_NAME_INVALID on ngrok free tier)
  if (cleanDomain.includes('ngrok') && cleanDomain.split('.').length > 3) {
    if (currentHost.includes('ngrok')) {
      return `${window.location.origin}/?tenant=${tenantSlug}`;
    }
    return `http://${tenantSlug}.localhost:${currentPort || '5173'}`;
  }

  // If currently browsing via an ngrok tunnel, route tenant view via query parameter
  if (currentHost.includes('ngrok') && tenantSlug) {
    return `${window.location.origin}/?tenant=${tenantSlug}`;
  }

  const isLocalDomain = cleanDomain.endsWith('.localhost') || cleanDomain === 'localhost' || cleanDomain === '127.0.0.1';

  // If local domain on dev server with custom port (e.g. :5173)
  if (isLocalDomain && currentPort && currentPort !== '80' && currentPort !== '443') {
    return `http://${cleanDomain}:${currentPort}`;
  }

  // Real custom domain or production deployment (standard ports)
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${cleanDomain}`;
}
