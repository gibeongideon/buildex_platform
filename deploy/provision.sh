#!/usr/bin/env bash
#
# Prepares a fresh Ubuntu 24.04 host to run Buildex Connect. Idempotent: safe to
# re-run after changing any of the config files beside it.
#
#   scp -r deploy root@HOST:/tmp/ && ssh root@HOST 'bash /tmp/deploy/provision.sh'
#
# What it deliberately does NOT do: build the application. This host has 1 vCPU
# and under 1 GB of RAM, where a Next.js build runs out of memory. CI builds and
# ships a standalone bundle; the host only ever runs it.

set -euo pipefail

DOMAIN="buildexconnect.dibon.co.ke"
NODE_MAJOR=22
ROOT=/srv/buildex
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '\n=== %s\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }

log "Swap (1 GB of RAM needs a cushion, even though we never build here)"
if ! swapon --show=NAME --noheadings | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -qw vm.swappiness=10
  grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo "2 GB swap enabled"
else
  echo "swap already present — leaving it alone"
fi

log "Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg nginx ufw rsync >/dev/null

log "Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

log "Service account"
# A dedicated unprivileged user. It owns the releases and runs the app; it can
# restart the service through exactly one sudo rule and do nothing else as root.
if ! id -u deploy >/dev/null 2>&1; then
  useradd --system --create-home --shell /bin/bash deploy
fi
install -d -o deploy -g deploy -m 0755 "$ROOT" "$ROOT/releases" "$ROOT/incoming"
install -d -o deploy -g deploy -m 0700 /home/deploy/.ssh

log "Release tooling"
install -m 0755 "$HERE/buildex-activate" /usr/local/bin/buildex-activate
cat > /etc/sudoers.d/buildex <<'SUDO'
# The deploy user may activate a release — and only that. No shell, no apt, no
# arbitrary systemctl.
deploy ALL=(root) NOPASSWD: /usr/local/bin/buildex-activate
SUDO
chmod 0440 /etc/sudoers.d/buildex
visudo -cf /etc/sudoers.d/buildex >/dev/null

log "systemd unit"
install -m 0644 "$HERE/buildex.service" /etc/systemd/system/buildex.service
systemctl daemon-reload
systemctl enable buildex >/dev/null 2>&1 || true

log "nginx"
install -d /etc/nginx/snippets /var/www/certbot
install -m 0644 "$HERE/buildex-proxy.conf" /etc/nginx/snippets/buildex-proxy.conf
rm -f /etc/nginx/sites-enabled/default
# TLS certificates do not exist on a first run, and nginx refuses to start
# referencing a missing one — so the HTTPS block is only linked in once certbot
# has issued. The IP-over-HTTP block works from the start either way.
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  install -m 0644 "$HERE/nginx-buildex.conf" /etc/nginx/sites-available/buildex.conf
else
  # First run: keep only the catch-all HTTP block. It serves the app on the bare
  # IP *and* on the domain (no other server_name matches, so the default takes
  # it), which is what lets certbot's webroot challenge succeed. Redirecting to
  # HTTPS before a certificate exists would take the site down instead.
  echo "no certificate yet — installing the HTTP-only config for now"
  awk '/^# --- The domain over HTTP/{exit} {print}' "$HERE/nginx-buildex.conf" \
    > /etc/nginx/sites-available/buildex.conf
fi
ln -sfn /etc/nginx/sites-available/buildex.conf /etc/nginx/sites-enabled/buildex.conf
nginx -t
systemctl reload nginx || systemctl start nginx

log "Firewall"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ufw status | head -8

log "Unattended security updates"
apt-get install -y -qq unattended-upgrades >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

log "Done"
cat <<SUMMARY

Provisioned. Remaining, in order:

  1. Add the deploy public key to /home/deploy/.ssh/authorized_keys
  2. Issue the certificate with the webroot challenge, which leaves the nginx
     config alone so this script stays the single source of truth for it:
       apt-get install -y certbot
       certbot certonly --webroot -w /var/www/certbot -d $DOMAIN \
         --non-interactive --agree-tos -m <email>
     then re-run this script to install the full HTTPS config.
  3. Push to main. The pipeline ships the first release.

The service will not start until a release exists — that is expected.
SUMMARY
