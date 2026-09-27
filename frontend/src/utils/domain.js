/**
 * Formats a tenant domain into a proper browser URL.
 * 
 * Logic:
 * 1. For local development domains (.localhost or 127.0.0.1):
 *    If currently running on a custom dev port (e.g. Vite :5173), keeps the port
 *    so local multi-domain switching works seamlessly.
 * 2. For real custom / production domains (e.g. flowiq.in, company.com):
 *    NEVER appends local development ports (:5173), resolving directly to standard HTTP/HTTPS.
 * 3. In production environments (ports 80 / 443 / empty):
 *    No port is ever appended.
 */
export function formatDomainUrl(domain) {
  if (!domain) return '#';

  // Strip any accidental protocol or port already present
  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/:\d+$/, '').trim();
  const isLocalDomain = cleanDomain.endsWith('.localhost') || cleanDomain === 'localhost' || cleanDomain === '127.0.0.1';
  const currentPort = window.location.port;

  // If local domain on dev server with custom port (e.g. :5173)
  if (isLocalDomain && currentPort && currentPort !== '80' && currentPort !== '443') {
    return `http://${cleanDomain}:${currentPort}`;
  }

  // Real custom domain or production deployment (standard ports)
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${cleanDomain}`;
}
