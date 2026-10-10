# Deploying AI Academy

Production runs on **one Linux server with Docker Compose** (PLAN D20). Everything lives in
`deploy/`:

```
Internet ──443/80──▶ caddy (HTTPS, certificates, HSTS)
                       │
                       ▼
                     web (Next.js, :3000) ──/api/v1/*──▶ api (NestJS, :4000) ──▶ postgres
                                                             │
                                                             └── uploads volume (materials)
```

- **caddy** gets and renews Let's Encrypt certificates automatically and is the only service
  reachable from outside.
- **migrate** applies database migrations on every start, then exits; the API waits for it.
- **Volumes:** `postgres-data` (database), `uploads` (material files, PLAN D15), and Caddy's
  certificates. Back up the first two (see below).

## 1. Server

- A VPS with **2 vCPU and 4 GB RAM** (the web build needs about 2 GB), Ubuntu 24.04 LTS,
  and about 20 GB of disk. For example Hetzner CX22 or similar, roughly €5–10 a month.
- Install Docker Engine with the Compose plugin: <https://docs.docker.com/engine/install/ubuntu/>.
- Firewall: allow only SSH (22), HTTP (80) and HTTPS (443). For example:
  `ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable`.
- Log in with SSH keys only, and turn on automatic security updates
  (`apt install unattended-upgrades`).

## 2. DNS

Point an `A` record (and `AAAA` for IPv6) for your domain, and for `www.` if you want it, at
the server. Caddy can only get a certificate once DNS resolves to the server.

## 3. First deploy

```sh
git clone <repository-url> /opt/ai-academy
cd /opt/ai-academy/deploy
cp .env.example .env
nano .env                 # fill in every value (see the comments in the file)
docker compose up -d --build
docker compose ps         # every service "healthy" / "running"; migrate "exited (0)"
```

Generate the secrets with `openssl rand -hex 32` (database password) and
`openssl rand -base64 48` (each JWT secret). Keep `deploy/.env` only on the server.

Then set up the content:

1. Open `https://<your-domain>/register` and create **your own account**.
2. Make it an admin (production has no seed data or demo users):
   ```sh
   docker compose run --rm migrate node_modules/.bin/tsx scripts/promote-admin.ts you@example.com
   ```
3. Log out and back in. In the admin area: create the courses and modules (with the Albanian
   titles and descriptions), give instructors the Instructor role, and fill in **Site
   settings** (cohort date, price, contact details) and any real testimonials.

## 4. Email (password resets)

Any SMTP provider works (PLAN D21): for example Brevo or Mailjet (free tiers), Google
Workspace, or Amazon SES. Set `MAIL_TRANSPORT=smtp`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER` and `SMTP_PASS` in `deploy/.env`. Then add the provider's **SPF and
DKIM** DNS records for the sending domain, so the emails don't land in spam.

Test it: run "Forgot password" for your own account. A delivery failure is logged as
`Could not send …` in `docker compose logs api`; the page itself never shows it (so it can't
reveal which emails have accounts).

## 5. Google Analytics

Create a GA4 property and a web data stream, put the measurement ID (`G-…`) into
`NEXT_PUBLIC_GA_ID`, and rebuild: `docker compose up -d --build web`. The ID is baked in at
build time. Visitors see a consent banner, and nothing is sent to Google before they accept
(PLAN D22). Events: `cta_click`, `demo_answer`, `sign_up`, `enroll_request`, plus GA's own
page views.

## 6. Updates

```sh
cd /opt/ai-academy && git pull
cd deploy && docker compose up -d --build
```

Migrations run automatically before the new API starts. Migrations only go forward, so
**take a backup before updating** (`./backup.sh`). To roll back, check out the previous
version and rebuild; if that version's database schema differs, restore the backup you took.

## 7. Backups

`deploy/backup.sh` writes a compressed database dump and an archive of the uploaded materials
to `deploy/backups/`, keeping 14 days (`KEEP_DAYS`). Run it every night with cron
(`crontab -e`):

```
15 3 * * * /opt/ai-academy/deploy/backup.sh >> /var/log/ai-academy-backup.log 2>&1
```

**Copy the backups off the server.** A backup on the same disk doesn't survive losing the
server. Use your provider's snapshot/backup feature, or sync `deploy/backups` to object
storage (for example with `rclone`). Either may cost a little, so the product owner decides.

**Restore** (tested in Sprint 4):

```sh
cd /opt/ai-academy/deploy
docker compose exec -T postgres pg_restore -U academy -d ai_academy --clean --if-exists \
  --no-owner < backups/db_<date>.dump
docker run --rm -v ai-academy_uploads:/data/uploads -v "$PWD/backups:/backups" alpine \
  sh -c 'rm -rf /data/uploads/* && tar -xzf /backups/uploads_<date>.tar.gz -C /data'
docker compose restart api
```

## 8. Monitoring

- **Health checks:** Docker restarts an unhealthy `api` (`/api/v1/health`, which also checks
  the database) or `web` container. `docker compose ps` shows their state.
- **Uptime:** add a free external monitor (for example UptimeRobot or Better Stack) on
  `https://<your-domain>/api/v1/health`. That one URL goes through Caddy, the web app, the API
  and the database, and alerts you by email when any of them is down.
- **Logs:** `docker compose logs -f api` (or `web`, `caddy`). Each container's logs rotate at
  5 × 10 MB.
- **Disk:** keep an eye on `df -h` and `docker system df`; prune old images after updates
  with `docker image prune`.

## 9. Security notes

- Rate limits (120 requests/minute per IP, 10 for login, register and password resets) see the
  real visitor IP because Caddy sets `X-Forwarded-For` and the API trusts the private Docker
  network (`TRUST_PROXY=loopback, uniquelocal`; PLAN D3).
- Swagger (`/api/docs`) is off in production. Set `SWAGGER_ENABLED=true` in `deploy/.env` only
  to look something up, then turn it off again.
- Rotating `JWT_REFRESH_SECRET` signs everyone out; rotating `JWT_ACCESS_SECRET` only ends
  15-minute access tokens.
- Postgres is not exposed outside the Docker network. To inspect it:
  `docker compose exec postgres psql -U academy ai_academy`.
