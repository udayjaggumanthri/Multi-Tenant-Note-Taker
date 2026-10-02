import os
import re
import socket
import logging
import threading
import subprocess
from django.conf import settings

logger = logging.getLogger('tenant')

NGINX_CONF_PATH = '/etc/nginx/sites-enabled/flowiq.in.conf'
CERT_NAME = 'flowiq-platform'
WEBROOT_PATH = '/var/www/html'


def get_current_nginx_conf():
    """Reads the current Nginx configuration file using sudo."""
    try:
        res = subprocess.run(['sudo', 'cat', NGINX_CONF_PATH], capture_output=True, text=True, timeout=10)
        if res.returncode == 0:
            return res.stdout
    except Exception as exc:
        logger.error(f"[Auto-SSL] Error reading Nginx conf: {exc}")
    return None


def apply_nginx_conf(new_content):
    """
    Safely writes new configuration, tests syntax with nginx -t,
    and reloads Nginx if valid. Rolls back if invalid.
    """
    temp_path = '/tmp/flowiq_nginx_pending.conf'
    try:
        with open(temp_path, 'w') as f:
            f.write(new_content)

        # Backup current conf
        subprocess.run(['sudo', 'cp', NGINX_CONF_PATH, f'{NGINX_CONF_PATH}.bak'], check=True, timeout=10)

        # Copy new conf
        subprocess.run(['sudo', 'cp', temp_path, NGINX_CONF_PATH], check=True, timeout=10)
        subprocess.run(['sudo', 'chmod', '644', NGINX_CONF_PATH], check=True, timeout=10)

        # Validate with nginx -t
        t_res = subprocess.run(['sudo', 'nginx', '-t'], capture_output=True, text=True, timeout=15)
        if t_res.returncode == 0:
            subprocess.run(['sudo', 'nginx', '-s', 'reload'], check=True, timeout=15)
            logger.info("[Auto-SSL] Nginx configuration verified and reloaded successfully.")
            return True
        else:
            logger.error(f"[Auto-SSL] Nginx syntax test failed: {t_res.stderr}. Rolling back configuration.")
            subprocess.run(['sudo', 'cp', f'{NGINX_CONF_PATH}.bak', NGINX_CONF_PATH], check=True, timeout=10)
            subprocess.run(['sudo', 'nginx', '-s', 'reload'], check=True, timeout=15)
            return False
    except Exception as exc:
        logger.error(f"[Auto-SSL] Exception applying Nginx configuration: {exc}")
        return False
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


def update_nginx_server_names(domains=None):
    """
    Ensures all active tenant and custom domains are present in Nginx server_name
    directives inside the multi-tenant configuration file.
    """
    try:
        from tenants.models import Domain

        if domains is None:
            domains = list(
                Domain.objects.exclude(domain__endswith='.localhost')
                              .exclude(domain__in=['localhost', '127.0.0.1'])
                              .values_list('domain', flat=True)
            )

        base_domains = {'flowiq.in', 'www.flowiq.in', 'prod.flowiq.in', '*.flowiq.in'}
        all_domains = set(base_domains)

        for d in domains:
            d_clean = d.strip().lower()
            if d_clean:
                all_domains.add(d_clean)
                # If apex custom domain, also ensure www is included
                if not d_clean.startswith('www.') and not d_clean.endswith('.flowiq.in') and '.' in d_clean:
                    all_domains.add(f'www.{d_clean}')

        server_name_str = ' '.join(sorted(all_domains))

        content = get_current_nginx_conf()
        if not content:
            logger.error("[Auto-SSL] Could not read Nginx config file.")
            return False

        # Replace all server_name lines with the unified list
        new_content = re.sub(
            r'server_name\s+[^;]+;',
            f'server_name {server_name_str};',
            content
        )

        # Ensure certificates point to the unified flowiq-platform cert
        new_content = re.sub(
            r'ssl_certificate\s+/etc/letsencrypt/live/[^/]+/fullchain\.pem;',
            f'ssl_certificate /etc/letsencrypt/live/{CERT_NAME}/fullchain.pem;',
            new_content
        )
        new_content = re.sub(
            r'ssl_certificate_key\s+/etc/letsencrypt/live/[^/]+/privkey\.pem;',
            f'ssl_certificate_key /etc/letsencrypt/live/{CERT_NAME}/privkey.pem;',
            new_content
        )

        if new_content != content:
            return apply_nginx_conf(new_content)
        return True
    except Exception as exc:
        logger.error(f"[Auto-SSL] Error updating Nginx server_names: {exc}")
        return False


def sync_certificates_for_domains():
    """
    Automatically synchronizes Nginx server_name and Let's Encrypt SSL
    certificates for all registered and DNS-propagated domains.
    Uses certbot with webroot plugin to guarantee zero downtime and prevent
    any configuration corruption.
    """
    try:
        from tenants.models import Domain

        # 1. Fetch all registered non-local domains
        all_domains = list(
            Domain.objects.exclude(domain__endswith='.localhost')
                          .exclude(domain__in=['localhost', '127.0.0.1'])
                          .values_list('domain', flat=True)
        )
        if not all_domains:
            return

        server_ip = getattr(settings, 'SERVER_PUBLIC_IP', '139.99.47.143')

        # 2. Update Nginx configuration so it accepts traffic and ACME challenges for all domains
        update_nginx_server_names(all_domains)

        # 3. Only pass domains that have actually resolved to this server IP in DNS
        ready_domains = []
        verified_domain_names = []

        base_domains = ['flowiq.in', 'www.flowiq.in', 'prod.flowiq.in']
        for b in base_domains:
            ready_domains.append(b)

        for d in all_domains:
            d_clean = d.strip().lower()
            if not d_clean:
                continue

            if d_clean.endswith('.flowiq.in') or d_clean == 'flowiq.in':
                ready_domains.append(d_clean)
                verified_domain_names.append(d_clean)
            else:
                # Custom domain check
                try:
                    resolved = socket.gethostbyname(d_clean)
                    if resolved == server_ip:
                        ready_domains.append(d_clean)
                        verified_domain_names.append(d_clean)
                        # Also check www
                        try:
                            www_d = f"www.{d_clean}"
                            if socket.gethostbyname(www_d) == server_ip:
                                ready_domains.append(www_d)
                        except Exception:
                            pass
                    else:
                        logger.info(f"[Auto-SSL] Domain {d_clean} resolves to {resolved} (expected {server_ip}), skipping SSL for now.")
                except Exception as e:
                    logger.info(f"[Auto-SSL] Skipping unresolvable domain: {d_clean} ({e})")

        # Mark verified in database
        if verified_domain_names:
            Domain.objects.filter(domain__in=verified_domain_names, is_verified=False).update(is_verified=True)

        unique_ready = sorted(set(ready_domains))
        if not unique_ready:
            return

        cmd = [
            'sudo', 'certbot', 'certonly', '--webroot', '-w', WEBROOT_PATH,
            '--non-interactive', '--agree-tos', '--register-unsafely-without-email',
            '--cert-name', CERT_NAME, '--expand'
        ]
        for d in unique_ready:
            cmd.extend(['-d', d])

        logger.info(f"[Auto-SSL] Requesting SSL for ready domains: {unique_ready}")
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if res.returncode == 0:
            logger.info("[Auto-SSL] SSL certificates successfully deployed and updated!")
            subprocess.run(['sudo', 'nginx', '-s', 'reload'], check=True, timeout=15)
        else:
            logger.warning(f"[Auto-SSL] Certbot output: {res.stderr or res.stdout}")
    except Exception as exc:
        logger.error(f"[Auto-SSL] Unexpected error during SSL sync: {exc}")


def trigger_ssl_provisioning():
    """Runs SSL provisioning asynchronously."""
    thread = threading.Thread(target=sync_certificates_for_domains, daemon=True)
    thread.start()
