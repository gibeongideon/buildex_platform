# 06 — Deployment

Buildex Connect runs on a single DigitalOcean droplet, behind nginx, deployed by
GitHub Actions on every push to `main`.

| | |
| --- | --- |
| Host | `143.244.137.254` (`blxconnectprotoype`, Ubuntu 24.04.4) |
| Resources | 1 vCPU · 961 MB RAM · 24 GB disk |
| Public URL | `http://143.244.137.254` (IP only for now — see TLS below) |
| Runtime | Node 22 · Next.js standalone · systemd unit `buildex` |
| Proxy | nginx 1.24 on :80/:443 → `127.0.0.1:3000` |

## The one constraint that shaped everything

**The server has under 1 GB of RAM, and a Next.js build needs roughly two.** So the
server never builds. CI builds a standalone bundle, and the host only ever runs it. That
single fact rules out "git pull && npm run build" on the box, and it is why the pipeline
ships an artifact rather than source.

It is also why the systemd unit caps memory at 600 MB: a runaway request kills the app,
which systemd restarts, rather than taking the whole machine down with the OOM killer.
Measured in production the app sits at **52 MB RSS**, so the cap is a safety net, not a
squeeze.

## What happens on a push to main

```text
push to main
   │
   ├─ verify ─────────────────────────────────────────────
   │    typecheck · eslint · next build
   │    playwright install chromium
   │    35 e2e specs against `next start` (the production build)
   │    package .next/standalone + .next/static + public  → artifact
   │
   └─ deploy (needs verify, main only) ────────────────────
        download the artifact that was just tested
        scp  → /srv/buildex/incoming/<sha>.tar.gz
        ssh  → sudo buildex-activate <sha>
                 unpack   → /srv/buildex/releases/<sha>
                 symlink  → /srv/buildex/current   (atomic rename)
                 restart  → systemctl restart buildex
                 health   → 127.0.0.1:3000/api/health, 20 tries
                 on failure → re-point to the previous release and restart
                 prune    → keep the last 5 releases
        verify → the public /api/health reports this exact commit
```

The artifact that deploys is the one that was tested — downloaded from the verify job,
never rebuilt. And the final check reads the commit back out of the *public* endpoint, so
a deploy is only green when the new version is genuinely the one serving.

## Rollback

Releases are kept, so rollback needs no rebuild:

```bash
ssh root@143.244.137.254
ls -1t /srv/buildex/releases          # newest first
sudo /usr/local/bin/buildex-activate <older-sha>
```

`buildex-activate` runs the same health check on the way back, so a rollback that does not
come up healthy tells you rather than leaving you guessing.

## Entry points

Today the site is served on the bare IP over HTTP only. A certificate cannot be issued for
an IP address, so there is no TLS until a domain is pointed here.

| Address | Scheme | nginx block |
| --- | --- | --- |
| `143.244.137.254` | HTTP | `default_server` catch-all |

`deploy/nginx-buildex.conf` already contains the HTTPS and redirect blocks for
`buildexconnect.dibon.co.ke`; `provision.sh` installs only the catch-all until a
certificate exists, and the full config the moment one does. So adding the domain later is
a DNS record, one certbot command and a re-run of the script — no config authoring.

One rule that must survive that change: the domain block must never be the
`default_server`, or the IP would inherit its redirect to a hostname it has no certificate
for, and the IP entry point would break.

## Repository secrets

Settings → Secrets and variables → Actions.

| Secret | Holds |
| --- | --- |
| `DEPLOY_HOST` | `143.244.137.254` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Private half of the deploy-only keypair, `-----BEGIN` line through `-----END` line |
| `SSH_KNOWN_HOSTS` | Output of `ssh-keyscan -t ed25519,rsa 143.244.137.254`, pinning the host key |

Optional variable (not a secret): `PUBLIC_URL`. Unset today, so the post-deploy check and
the environment link both fall back to `http://$DEPLOY_HOST` — which is exactly what is
wanted while the site is IP-only. Set it to `https://buildexconnect.dibon.co.ke` when the
domain is live and nothing else in the pipeline changes.

If any secret is missing the deploy job **skips with a note** rather than failing — an
unconfigured repository should not report a broken build.

## Access model

The pipeline never logs in as root.

- `deploy` is a system user that owns `/srv/buildex` and runs the service.
- Its sudo rights are exactly one line: `NOPASSWD: /usr/local/bin/buildex-activate`. No
  shell, no apt, no arbitrary `systemctl`.
- The SSH key is dedicated to deploys and belongs to no person.
- The host key is pinned from a secret rather than trusted on first use, so a redirected
  DNS record cannot quietly receive a release.
- The Node process binds `127.0.0.1`, so nothing but nginx can reach it.

## Server layout

```text
/srv/buildex/
  current -> releases/<sha>     symlink; swapped by atomic rename
  releases/<sha>/               server.js, node_modules, .next/, public/
  incoming/                     uploads land here, deleted after activation
  release.env                   BUILDEX_RELEASE=<sha>, read by the systemd unit
/usr/local/bin/buildex-activate the whole release procedure, including rollback
/etc/systemd/system/buildex.service
/etc/nginx/sites-available/buildex.conf
/etc/nginx/snippets/buildex-proxy.conf
```

Everything under `deploy/` in this repository is the source of truth for those files;
`deploy/provision.sh` installs them and is safe to re-run.

## Re-provisioning from scratch

```bash
tar -czf /tmp/deploy.tar.gz deploy
scp /tmp/deploy.tar.gz root@143.244.137.254:/tmp/
ssh root@143.244.137.254 'cd /tmp && tar -xzf deploy.tar.gz && bash deploy/provision.sh'
```

Idempotent: it adds swap only if absent, installs Node only if the major version differs,
and installs the HTTPS nginx config only once a certificate exists.

## TLS — not enabled yet

The site is deliberately IP-only for now, so **traffic is unencrypted**. That is
acceptable for a prototype demo and not for anything carrying real data; the moment this
serves anything sensitive, the domain and certificate below stop being optional.

Certbot 2.9.0 and the nginx reload hook are already installed, so issuance is one command
once DNS points here.

Issued with the webroot challenge so certbot never edits the nginx config, which keeps
`deploy/nginx-buildex.conf` the single source of truth:

```bash
apt-get install -y certbot
certbot certonly --webroot -w /var/www/certbot -d buildexconnect.dibon.co.ke \
  --non-interactive --agree-tos -m <email>
bash /tmp/deploy/provision.sh      # re-run: installs the full HTTPS config
```

Renewal is certbot's own systemd timer. Add a deploy hook so nginx picks up the new
certificate:

```bash
echo -e '#!/bin/sh\nsystemctl reload nginx' > /etc/letsencrypt/renewal-hooks/deploy/nginx
chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx
```

**This requires an A record for `buildexconnect` pointing at `143.244.137.254`.** At the
time of writing the name resolves to `198.54.120.132` — the `dibon.co.ke` apex, via a
wildcard — so the HTTP-01 challenge would be answered by the wrong host and issuance would
fail. Checked against both `8.8.8.8` and `1.1.1.1`.

Then set the `PUBLIC_URL` repository variable so the pipeline verifies against the domain.

## Health and logs

```bash
curl http://143.244.137.254/api/health     # {"status","release","uptimeSeconds"}
systemctl status buildex
journalctl -u buildex -f                   # application logs
journalctl -u buildex -n 100 --no-pager
```

`release` is the deployed commit, which makes "is the new version live?" answerable from
outside the box — and is exactly what the pipeline asserts after every deploy.

## What is deliberately not here

No database, no migrations, no application secrets. The prototype's data lives in the
browser behind the repository seam (see [03 — Architecture](./03-architecture.md)), so a
deploy is only ever code. When Phase 9 puts Postgres behind those repositories, the deploy
gains a migration step and the service gains a `DATABASE_URL` — the shape above does not
otherwise change.
