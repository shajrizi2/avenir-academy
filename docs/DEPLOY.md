# Deploying Avenir Academy

Production runs on **one DigitalOcean Droplet with Docker Compose** (PLAN D20, D26–D28).
Follow sections 1–10 once, in order; section 11 is for every day after launch.

```
                    ┌──────────────── Droplet (Ubuntu 24.04, FRA1) ─────────────────┐
 avenir.academy ───▶│ caddy :443 ──▶ web  (Next.js :3000) ──┐                       │
 www.  (308 → apex) │   HTTPS,       api  (NestJS  :4000) ◀─┘──▶ postgres (internal │
 api.avenir.academy▶│   HSTS                │                     network only)     │
                    │                       │                   backup ──┐          │
                    └───────────────────────│────────────────────────────│──────────┘
                                            ▼                            ▼
                         R2 avenir-materials, Resend SMTP      R2 avenir-backups
```

- The browser loads pages from `avenir.academy` and calls the API at `api.avenir.academy`
  (CORS allows only `https://avenir.academy`; the refresh cookie is
  `Domain=.avenir.academy; Secure; HttpOnly; SameSite=Lax`).
- Images are built by GitHub Actions and pulled from GitHub Container Registry
  (`ghcr.io/<owner>/avenir-web`, `avenir-api`, and `avenir-migrate` = the api image plus the
  Prisma CLI), tagged with the git SHA. Without GitHub Actions, `scripts/ship.sh` builds
  them on your laptop and copies them over SSH instead (step 7, option B).
- Everything about the stack lives in `deploy/`:

| File                        | What it is                                                        |
| --------------------------- | ----------------------------------------------------------------- |
| `docker-compose.prod.yml`   | caddy, web, api, migrate (one-off), postgres, backup              |
| `Caddyfile`                 | HTTPS, www → apex, headers, 25 MB body limit                      |
| `.env.production.example`   | Every setting, documented. The real file lives only on the server |
| `backup/`                   | The backup container (pg_dump → gzip → R2, 14 daily + 8 weekly)   |
| `scripts/server-setup.sh`   | One-time Droplet setup (user, SSH, firewall, Docker, swap)        |
| `scripts/compose.sh`        | `docker compose` with the right env file and image tag            |
| `scripts/deploy.sh <tag>`   | Pull, migrate, start, health-check, auto-rollback                 |
| `scripts/ship.sh <host>`    | (laptop) Build, copy over SSH and deploy, without GitHub Actions  |
| `scripts/rollback.sh [tag]` | Back to an earlier image tag                                      |
| `scripts/restore.sh`        | List / test-restore / restore database backups                    |

Commands below marked **(laptop)** run on your computer, **(server)** in an SSH session as
`deploy` on the Droplet.

---

## 1. Create the Droplet

DigitalOcean → **Create → Droplets**:

| Setting        | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Region         | **Frankfurt, FRA1**                                                |
| Image          | **Ubuntu 24.04 (LTS) x64**                                         |
| Size           | **Basic → Regular → 4 GB RAM / 2 vCPUs / 80 GB SSD**               |
| Backups        | **Enable automated backups → Weekly**                              |
| Authentication | **SSH Key** (see below; never a password)                          |
| Advanced       | **Enable IPv6** (free), **Add improved metrics monitoring** (free) |
| Hostname       | `avenir-prod`                                                      |

SSH key **(laptop)**, if you don't have one yet:

```sh
ssh-keygen -t ed25519 -C "you@example.com"     # Enter for the default path; set a passphrase
cat ~/.ssh/id_ed25519.pub                      # paste this into "New SSH Key"
```

Write down the Droplet's **IPv4** (and **IPv6**) address from its page.

## 2. DNS at Hostinger

hPanel → **Domains → avenir.academy → DNS / Nameservers → DNS records**.

1. **Delete** the records that would conflict: any `A` or `AAAA` record for `@`, `www` or
   `api` (Hostinger's parking page), and a `CNAME` for `www`. Leave `MX` and other `TXT`
   records alone (they belong to email).
2. **Add** (TTL 300 while you set up; 3600 later is fine):

| Type   | Name  | Points to                                                                         |
| ------ | ----- | --------------------------------------------------------------------------------- |
| `A`    | `@`   | Droplet IPv4                                                                      |
| `A`    | `www` | Droplet IPv4                                                                      |
| `A`    | `api` | Droplet IPv4                                                                      |
| `AAAA` | `@`   | Droplet IPv6 (only if IPv6 is on)                                                 |
| `AAAA` | `www` | Droplet IPv6                                                                      |
| `AAAA` | `api` | Droplet IPv6                                                                      |
| `CAA`  | `@`   | `0 issue "letsencrypt.org"` (optional: only Let's Encrypt may issue certificates) |

3. Check propagation **(laptop)**. Every line must print the Droplet's address before the
   first deploy, or Caddy can't get certificates:

```sh
for h in avenir.academy www.avenir.academy api.avenir.academy; do
  echo "$h: $(dig +short A $h @1.1.1.1) $(dig +short AAAA $h @1.1.1.1)"
done
```

Or look the names up on <https://dnschecker.org>. It usually takes minutes, sometimes a few
hours.

## 3. Prepare the server

**(laptop)**:

```sh
scp deploy/scripts/server-setup.sh root@<droplet-ip>:/root/
ssh -t root@<droplet-ip> bash /root/server-setup.sh
```

The script (safe to run again) updates the system; creates the user **`deploy`** (sudo, your
SSH key, it asks you for a sudo password); turns off root and password logins; allows only
ports 22, 80 and 443 (ufw); sets up fail2ban, automatic security updates, the
`Europe/Tirane` timezone and a 2 GB swap file; installs Docker Engine and the Compose plugin
from Docker's repository; and creates `/opt/avenir`.

**Keep the root session open** and test from a second terminal:

```sh
ssh deploy@<droplet-ip>
docker ps             # works without sudo
sudo -v               # asks for the password you chose
```

From now on, always log in as `deploy`.

## 4. Cloudflare R2 (files and backups)

1. Create a Cloudflare account, open **R2 Object Storage** and activate it (it asks for a
   payment method; 10 GB storage and the request volume we need are in the free tier).
2. **Create two buckets**, both private (public access stays **off**):
   - `avenir-materials`, location hint **Europe** (or jurisdiction **EU**)
   - `avenir-backups`, same location
3. **API tokens:** R2 → **Manage R2 API Tokens → Create API token**, twice:
   - `avenir-api`: permission **Object Read & Write**, **apply to the bucket
     `avenir-materials` only**
   - `avenir-backup`: **Object Read & Write** on **`avenir-backups` only**

   Copy each token's **Access Key ID** and **Secret Access Key** right away (shown once), and
   the **S3 endpoint** `https://<account-id>.r2.cloudflarestorage.com` (with jurisdiction EU:
   `https://<account-id>.eu.r2.cloudflarestorage.com`).

4. **CORS:** not needed. The browser never talks to R2: uploads and downloads go through the
   API (`GET /materials/:id/download`), which checks that the student may open the module and
   streams the file (PLAN D27). Leave the bucket without a CORS policy and without public
   access.
5. Optional safety net on `avenir-backups`: **Settings → Object lifecycle rules → delete
   objects older than 70 days**. The backup container already deletes old backups; this only
   catches a misconfiguration.

## 5. Resend (email)

1. Sign up at <https://resend.com>. **Domains → Add Domain** → `avenir.academy`, region
   **Ireland (eu-west-1)**.
2. Resend shows the DNS records to add. At Hostinger, add them **exactly as shown** (Hostinger
   wants the name without `.avenir.academy`). They are typically:

| Type  | Name                | Value                                                        |
| ----- | ------------------- | ------------------------------------------------------------ |
| `MX`  | `send`              | `feedback-smtp.eu-west-1.amazonses.com`, priority 10         |
| `TXT` | `send`              | `v=spf1 include:amazonses.com ~all` (SPF)                    |
| `TXT` | `resend._domainkey` | `p=MIGfMA0G…` (DKIM, copy the long value from Resend)        |
| `TXT` | `_dmarc`            | `v=DMARC1; p=none; rua=mailto:you@example.com` (recommended) |

They live on the `send` subdomain, so they don't touch any mailbox you have on
`avenir.academy`. Click **Verify** in Resend; it turns green once DNS has propagated. 3. **API Keys → Create API key**: name `avenir-prod`, permission **Sending access**, domain
`avenir.academy`. Copy the key (`re_…`). 4. The app sends through Resend's SMTP (no code change, PLAN D21): host `smtp.resend.com`,
port `465`, TLS, user `resend`, password = the API key. From address:
`Avenir Academy <no-reply@avenir.academy>`.

## 6. Create `.env.production` on the server

**(laptop)** copy the template:

```sh
scp deploy/.env.production.example deploy@<droplet-ip>:/opt/avenir/deploy/.env.production
```

**(server)** generate the secrets in place, then fill in the rest:

```sh
cd /opt/avenir/deploy
chmod 600 .env.production
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 32)|" .env.production
for k in JWT_ACCESS_SECRET JWT_REFRESH_SECRET JWT_RESET_SECRET; do
  sed -i "s|^$k=.*|$k=$(openssl rand -base64 48 | tr -d '\n')|" .env.production
done
nano .env.production
```

Fill in: `ACME_EMAIL`, `IMAGE_REGISTRY` (`ghcr.io/<your-github-user-or-org>`, lowercase), the
`S3_*` values (token `avenir-api`), `SMTP_PASS` (Resend key), the `BACKUP_S3_*` values (token
`avenir-backup`) and the two `STRIPE_*` keys (step 8b; use the **test** keys until launch).
Every variable is explained in the file. Check that nothing is left empty:

```sh
grep -nE '^[A-Z_]+=$|<' .env.production    # prints nothing when complete
```

Keep a copy of this file in your password manager: without `POSTGRES_PASSWORD` and the R2
keys you can't restore a backup onto a new server.

## 7. GitHub and the first deploy

There are two ways to deploy; pick one (you can switch later).

- **Option A, GitHub Actions** (a–d below): merging to `main` deploys automatically, with CI
  checks first. Needs Actions to work on your account (free: unlimited for public
  repositories, 2,000 minutes a month for private ones).
- **Option B, from your laptop** (e): `deploy/scripts/ship.sh` builds, copies and deploys.
  No GitHub Actions, registry or tokens; you start every deploy yourself.

**a) A deploy key for GitHub Actions (laptop).** A separate key that can only log in as
`deploy`:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/avenir-ci -C "github-actions" -N ""
ssh-copy-id -i ~/.ssh/avenir-ci.pub deploy@<droplet-ip>
ssh-keyscan -t ed25519 <droplet-ip>       # compare with the Droplet console (below), then use it
```

To check the host key, open the Droplet's **Console** in DigitalOcean and run
`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`; it must match
`ssh-keyscan -t ed25519 <droplet-ip> | ssh-keygen -lf -` on your laptop.

**b) Repository secrets** (GitHub → Settings → Secrets and variables → Actions → **Secrets**):

| Secret               | Value                                          |
| -------------------- | ---------------------------------------------- |
| `DEPLOY_HOST`        | the Droplet's IPv4 address                     |
| `DEPLOY_USER`        | `deploy`                                       |
| `DEPLOY_SSH_KEY`     | the whole private key: `cat ~/.ssh/avenir-ci`  |
| `DEPLOY_KNOWN_HOSTS` | the `ssh-keyscan -t ed25519 <droplet-ip>` line |

**Variables** (same page, **Variables** tab), baked into the web image at build time:

| Variable              | Value                                                    |
| --------------------- | -------------------------------------------------------- |
| `SITE_URL`            | `https://avenir.academy`                                 |
| `NEXT_PUBLIC_API_URL` | `https://api.avenir.academy/api/v1`                      |
| `NEXT_PUBLIC_GA_ID`   | `G-…` (optional; empty = no analytics, no cookie banner) |
| `API_HEALTH_URL`      | `https://api.avenir.academy/api/v1/health`               |

Optional: Settings → **Environments → production** → _Required reviewers_, so each deploy
waits for your click.

**c) Let the server pull images.** GitHub → your avatar → Settings → Developer settings →
**Personal access tokens → Tokens (classic) → Generate new token**: scope **`read:packages`**
only, expiry 1 year (put a reminder in your calendar). **(server)**:

```sh
docker login ghcr.io -u <github-user>      # paste the token as the password
```

**d) First deploy.** The workflow `Deploy` (`.github/workflows/deploy.yml`) runs after `CI`
succeeds on `main`. Merge the `deploy` branch into `main` (a pull request), and watch
**Actions**: CI, then _Build web image_ / _Build api image_, then _Deploy to the Droplet_.
Later you can also start it by hand: **Actions → Deploy → Run workflow**.

The deploy job copies `deploy/` to `/opt/avenir/deploy` (your `.env.production` is left
alone), then runs `deploy/scripts/deploy.sh <sha>`, which pulls the images, runs
`prisma migrate deploy`, starts everything, waits for every container to be healthy, and
checks `https://api.avenir.academy/api/v1/health` and `https://avenir.academy` through Caddy.
If anything fails it switches back to the previous tag (on the very first deploy there is
none, so it just stops). Finally the runner checks both URLs from the internet.

The first start takes a minute longer: Caddy requests the three certificates. If it can't,
`deploy/scripts/compose.sh logs caddy` says why (almost always DNS not pointing here yet, or
port 80/443 blocked).

After the first deploy, the GHCR packages are **private**; leave them that way (the server
logs in with the token from step c).

**e) Option B: deploy from your laptop.** Needs Docker, pnpm and SSH access as `deploy`
(your key from step 3). In `.env.production` on the server, set `IMAGE_REGISTRY=avenir` (any
name works; nothing is pulled from it). Then, from the repo on `main` **(laptop)**:

```sh
git checkout main && git pull
deploy/scripts/ship.sh deploy@<droplet-ip>
```

It refuses to run with uncommitted changes, then:

1. runs `pnpm lint`, `pnpm type-check` and `pnpm test` (`--skip-checks` skips them);
2. builds the three images for the current commit, for `linux/amd64`;
3. copies `deploy/` to `/opt/avenir/deploy` (your `.env.production` is left alone);
4. streams the images over SSH (`docker save | gzip | docker load`, about 250 MB each time);
5. runs `deploy/scripts/deploy.sh <sha>` on the server: migrations, health checks and the
   automatic rollback, exactly as option A.

The web image bakes in `https://avenir.academy` and `https://api.avenir.academy/api/v1`; for
Google Analytics run it with `NEXT_PUBLIC_GA_ID=G-… deploy/scripts/ship.sh …`. Steps a–d
are not needed. `deploy.sh` keeps the current and the previous version's images on the
server, so `rollback.sh` works without a registry.

## 8. Create the first admin

Production has no seed data. **(server)**:

```sh
cd /opt/avenir/deploy
read -r -p "Admin email: " ADMIN_EMAIL
read -r -s -p "Admin password (8-72 characters): " ADMIN_PASSWORD; echo
export ADMIN_EMAIL ADMIN_PASSWORD
scripts/compose.sh run --rm --no-deps -e ADMIN_EMAIL -e ADMIN_PASSWORD \
  -e ADMIN_FIRST_NAME=Your -e ADMIN_LAST_NAME=Name \
  api node dist/src/cli/seed-admin.js
unset ADMIN_PASSWORD
```

It creates only that admin account, nothing else. Running it again changes nothing (an
existing account keeps its password and is made an admin).

**8a. The courses and the first groups.** The three courses (Development & Vibe Coding
përmes AI, Digital Marketing & AI, SEO përmes AI) with four modules each, €89 a month instead
of €150, and one group per course starting on 1 November 2026 (Mon/Wed/Fri 19:00–21:00, 10
seats, 48 lectures generated) come from `apps/api/prisma/catalog.ts`. **(server)**:

```sh
scripts/compose.sh run --rm --no-deps api node dist/src/cli/seed-courses.js
```

No students, instructors or testimonials are created. Running it again leaves existing
courses and groups alone. Then, in the admin at `https://avenir.academy/admin`:

- **Grupet**: set each group's real Google Meet link (it is copied to every lecture) and its
  instructor; adjust the schedule if needed (lectures are regenerated).
- **Kurset**: review the descriptions and module titles (placeholders written by us), the
  prices (cents) and the instructors per module; add offline lessons under **Mësimdhënia**.
- **Cilësimet e faqes**: the bank details for transfers (beneficiary, IBAN, bank, SWIFT),
  which payment methods are on, contact details. The refund policy text is in
  `apps/web/messages/sq.json` (`landing.faq.items[1]`) and still says `[VENDOS POLITIKËN…]`.
- **Përdoruesit**: give the instructors their role; they fill in their public profile.

**8b. Stripe (card payments).** Create the account at <https://dashboard.stripe.com>,
complete the business details so live payments are allowed, then:

1. **Developers → API keys**: copy the **Secret key**. Use the _test_ key (`sk_test_…`) first.
2. **Developers → Webhooks → Add endpoint**: URL
   `https://api.avenir.academy/api/v1/payments/stripe/webhook`, events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   Copy the endpoint's **Signing secret** (`whsec_…`).
3. **(server)** put both in `.env.production` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`),
   then `scripts/compose.sh up -d api`. The API refuses to start without them while
   `STRIPE_ENABLED=true`; set `STRIPE_ENABLED=false` to run with bank transfers only.
4. Test it end to end with the test keys: register a student, pick a group, pay with card
   `4242 4242 4242 4242` (any future date, any CVC). The success page waits for the webhook,
   then the student gets the timetable email. Stripe → **Developers → Webhooks** shows the
   event as delivered (200). A redelivered event is ignored (the ids are stored).
5. **At launch**, repeat steps 1–3 with the **live** keys (`sk_live_…`, and a webhook
   endpoint created in live mode with its own `whsec_…`), restart the API, and make one real
   payment of €89 with your own card, then refund it from **Admin → Pagesat**.

Only the signed webhook confirms a card payment; the browser's return to the site never does.
Bank transfers need no Stripe: the student gets the IBAN and a reference `AV-XXXXXXXX`, the
seat is held 48 hours, and an admin confirms the payment in **Admin → Pagesat**.

**8c. Scheduled emails.** The API itself runs the jobs (Europe/Tirane): hold expiry every
minute, lecture reminders every 5 minutes (24 h and 1 h before), the offline-learning email at
09:00 on days without a lecture, hold warnings hourly, group statuses nightly. They need
nothing on the server besides `CRON_ENABLED=true` (the default). **Admin → Email-et** lists
every email with its status; a job that runs twice never sends twice.

## 9. After-deploy checklist

- [ ] `https://avenir.academy` loads with a valid certificate; `https://www.avenir.academy`
      redirects to it (308); `https://api.avenir.academy/api/v1/health` returns
      `{"status":"ok","db":"up"}`; `http://` redirects to `https://` on all three.
- [ ] `curl -sI https://avenir.academy | grep -i strict-transport` shows HSTS.
- [ ] `https://avenir.academy/sitemap.xml` and `/robots.txt` use `https://avenir.academy`.
- [ ] Journey (use a second browser or a private window for the student): register a
      student → pick a course and group → pay by **card** (test key, `4242…`) → the success
      page confirms within seconds → the timetable email arrives with the `.ics` → the
      student sees the 12 lectures (Join opens 15 minutes before) and the offline lessons.
      Then a second student pays by **bank transfer** → as admin, confirm it in **Admin →
      Pagesat** → the student is enrolled and the group shows one seat less.
- [ ] Reminders: the day before the first lecture, the 24-hour email appears in **Admin →
      Email-et** for every paid student; an hour before, the 1-hour one.
- [ ] Log out and back in; reload a signed-in page (the refresh cookie works across
      `avenir.academy` and `api.avenir.academy`).
- [ ] Email: "Forgot password" for your own account → the email arrives (check spam), the
      link works. Resend → **Emails** shows it as delivered.
- [ ] The uploaded PDF is in R2 → `avenir-materials`.
- [ ] Backups: run one now and see it in R2 → `avenir-backups/daily/`:
      `deploy/scripts/compose.sh exec backup avenir-backup backup`
- [ ] **Test restore** (required before launch) into a scratch database, so production is
      untouched:

      ```sh
      deploy/scripts/restore.sh --list
      deploy/scripts/restore.sh daily/avenir_<date>.dump.gz --into restore_test
      ```

      It prints the number of users and courses it restored; they must match the live site.
      Drop the scratch database afterwards (the script prints the command).

- [ ] `deploy/scripts/compose.sh ps`: every service `healthy` (`migrate` exited 0 and is
      gone).

## 10. Uptime monitoring (free)

At <https://uptimerobot.com> (free plan, 5-minute checks, email alerts) add two **HTTP(s)**
monitors:

1. `https://avenir.academy` (the site)
2. `https://api.avenir.academy/api/v1/health`, type **Keyword**, keyword `"ok"` (the API and
   its database)

Optional: a free check at <https://healthchecks.io> with a daily period and 2-hour grace;
put its ping URL into `BACKUP_PING_URL` in `.env.production` and run
`deploy/scripts/compose.sh up -d backup`. You then get an email when a nightly backup did
**not** succeed.

DigitalOcean's free monitoring (enabled in step 1) can alert on CPU, memory and disk: Droplet
→ **Monitoring → Create alert policy** (for example disk > 80 %, memory > 90 % for 10 min).

---

## 11. Day-2 operations

All commands **(server)**, from anywhere; `compose.sh` always uses the right env file and the
deployed image tag.

```sh
alias avenir=/opt/avenir/deploy/scripts/compose.sh     # put it in ~/.bashrc
```

**Deploy.** Merge to `main`; CI then Deploy run on their own (option B: run
`deploy/scripts/ship.sh deploy@<droplet-ip>` from your laptop). By hand: Actions → Deploy → Run
workflow. On the server: `deploy/scripts/deploy.sh <git-sha>` (the images must be in GHCR or already on the server).
`cat /opt/avenir/deploy/.image-tag` shows what is running.

**Roll back.**

```sh
/opt/avenir/deploy/scripts/rollback.sh              # to the previous tag
/opt/avenir/deploy/scripts/rollback.sh <git-sha>    # to any earlier tag
```

Or from GitHub: Actions → Deploy → Run workflow → `tag` = the SHA. Migrations are not undone
(they only go forward), so a rollback is safe when the newer migration only added things. If
it removed or renamed data, restore the backup taken before that deploy instead
(`restore.sh`, below).

**Logs.** `avenir logs -f api` (or `web`, `caddy`, `backup`, `postgres`); `avenir logs --since
1h api`. Each container keeps 3 × 10 MB.

**Stripe.** Keys are rotated like any secret (`.env.production`, then `avenir restart api`);
the webhook endpoint stays. If Stripe shows failed deliveries, **Resend** them from the
dashboard: the API accepts redeliveries and skips the ones it already processed. Refunds go
through **Admin → Pagesat** (the money returns to the card through Stripe) or the Stripe
dashboard (the platform learns about it from the `charge.refunded` event).

**Restart a service.** `avenir restart api`. After editing `.env.production`:
`avenir up -d` (recreates only the services whose settings changed).

**Status.** `avenir ps`; `docker stats --no-stream` (memory against the limits: postgres 1 GB,
api 768 MB, web 768 MB).

**Disk space.** `df -h /` and `docker system df`. Old images pile up: `docker image prune -a`
removes every image no container uses (a rollback just pulls again).

**Database shell.** `avenir exec postgres psql -U avenir avenir`.

**Backups.** `avenir exec backup avenir-backup backup` (now); `deploy/scripts/restore.sh
--list`. Full restore over the live database (asks you to type `RESTORE PRODUCTION`, takes a
safety backup first, stops the site while it runs):

```sh
deploy/scripts/restore.sh daily/avenir_<date>.dump.gz
```

Material files are in R2 already and aren't part of these backups; R2 stores them
redundantly, and the app deletes a file only when someone deletes that material.

**Rotate secrets.** Edit `.env.production`, then `avenir up -d`.

| Secret               | Effect / steps                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET`  | Access tokens (15 min) end; users are refreshed silently.                                                                   |
| `JWT_REFRESH_SECRET` | Everyone is signed out.                                                                                                     |
| `JWT_RESET_SECRET`   | Open password-reset links stop working.                                                                                     |
| R2 / Resend keys     | Create the new key, put it in, `avenir up -d`, test, then revoke the old one.                                               |
| `POSTGRES_PASSWORD`  | First `avenir exec postgres psql -U avenir -c "ALTER USER avenir PASSWORD '<new>'"`, then edit the file and `avenir up -d`. |
| GHCR token           | New token, `docker login ghcr.io` again.                                                                                    |
| CI deploy key        | New key pair, add the public key to `~deploy/.ssh/authorized_keys`, update `DEPLOY_SSH_KEY`, remove the old line.           |

**Upgrade Postgres.**

- _Minor_ (16.x → 16.y, security fixes): `avenir pull postgres && avenir up -d postgres`.
- _Major_ (16 → 17): data files aren't compatible, so dump and restore. Plan 15 minutes of
  downtime: take a backup (`avenir exec backup avenir-backup backup`); in
  `docker-compose.prod.yml` change `postgres:16-alpine` → `postgres:17-alpine` and the volume
  `postgres-data` → `postgres17-data` (both places), and in `backup/Dockerfile`
  `FROM postgres:17-alpine`; commit and deploy. The new, empty database gets the schema from
  the migrations; then restore the backup into it with `deploy/scripts/restore.sh
daily/<that backup>`. Keep the old volume until you're sure, then
  `docker volume rm avenir_postgres-data`.

**Server updates.** Security updates install automatically. Kernel updates need a reboot:
when `/var/run/reboot-required` exists, `sudo reboot` at a quiet hour (all containers start
again on their own).

---

## Test the stack on your laptop

The production compose file runs locally with `localhost` names, Caddy's local CA, and a
stand-in for R2 (`docker-compose.local.yml`). **(laptop, repository root)**:

```sh
docker build -f apps/api/Dockerfile -t local/avenir-api:dev .
docker build -f apps/api/Dockerfile --target migrate -t local/avenir-migrate:dev .
docker build -f apps/web/Dockerfile -t local/avenir-web:dev --build-arg SITE_URL=https://localhost:8443 .
docker build -t avenir-backup:local deploy/backup
cp deploy/.env.local.example deploy/.env.local
export ENV_FILE=deploy/.env.local COMPOSE_OVERRIDE=deploy/docker-compose.local.yml
deploy/scripts/compose.sh up -d --wait
curl -k https://localhost:8443/robots.txt --resolve localhost:8443:127.0.0.1
curl -k https://api.localhost:8443/api/v1/health --resolve api.localhost:8443:127.0.0.1
deploy/scripts/compose.sh exec backup avenir-backup backup
deploy/scripts/compose.sh down -v     # stop and delete the test data
```

The local web image is built without `NEXT_PUBLIC_API_URL`, so the browser uses the
same-origin `/api/v1` proxy (`https://localhost:8443`, accept the certificate warning).

## Not covered by this setup

- **Material files are not backed up separately** (they live in R2, which is redundant
  storage). If you want a second copy, an `rclone sync` from `avenir-materials` to another
  bucket can be added to the backup container.
- **Zero-downtime deploys:** containers are replaced in place, so a deploy has a few seconds
  in which requests may fail. Fine for this size; blue/green would need a second set of
  containers.
