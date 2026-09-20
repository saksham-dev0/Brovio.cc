---
title: Self-hosting
order: 2
---

# Self-hosting

The entire application is open source under AGPL-3.0. Self-hosted installations
have no feature gates, no plan limits, and no subscription.

## What you still need accounts for

Self-hosting does not mean zero external services. Three of the platforms this
application is built on cannot be self-hosted at all:

| Service | Why it is needed | Self-hostable |
| --- | --- | --- |
| Clerk | Authentication and organizations | No — free tier available |
| Liveblocks | Realtime multiplayer canvas | No — free tier available |
| Browserbase | Cloud browsers and session replays | No — free tier available |
| Trigger.dev | Running workflows in the background | Yes, or use their cloud |
| Postgres | Application data | Yes — included in Compose |
| Model provider | Powers act, extract, observe, and agent | Depends on provider |

Each has a free tier that is enough to evaluate the application.

## Quickstart

1. Clone the repository.

2. Copy the environment template and fill it in:

   ```bash
   cp .env.example .env
   ```

   The [environment variable reference](/docs/environment-variables) explains
   every value.

3. Complete [Trigger.dev setup](/docs/trigger-dev). **Workflow runs will not
   work until you do this.** It includes editing a file in the repository, not
   only setting environment variables.

4. Start the stack, detached so it keeps running after you close the terminal:

   ```bash
   docker compose up -d --build
   ```

5. Deploy the workflow task code, once:

   ```bash
   docker compose run --rm trigger-deploy
   ```

6. Open <http://localhost:3000>.

Database migrations run automatically before the application starts.

## Keeping it running

The application and the database are declared `restart: unless-stopped`. That
means:

- If the process crashes, Docker restarts it.
- If the machine reboots, Docker starts the stack again, provided the Docker
  daemon itself starts on boot. On most Linux distributions:
  `sudo systemctl enable docker`.
- If you stop a service deliberately with `docker compose stop`, it stays
  stopped. That is the difference between `unless-stopped` and `always`.

The application also exposes a liveness endpoint at `/api/health`, which Docker
polls every 30 seconds. It is a process check and deliberately does not touch
the database — restarting the application does not fix a database outage, and
checking it there would turn a brief blip into a restart loop.

Check on it at any time:

```bash
docker compose ps
docker compose logs -f app
```

## Upgrading

```bash
git pull
docker compose up -d --build
docker compose run --rm trigger-deploy
```

Migrations re-apply on every start, so there is no separate migration step. The
last line is only needed when something under `features/workflows/` changed, but
running it is harmless.

## Deployment mode

Set `DEPLOYMENT_MODE=self-hosted` in your `.env`. This makes the billing system
inert: no subscription is required, the billing page is hidden, and no payment
credentials are needed.

Leaving it unset makes the installation behave like the hosted product and
require a subscription. That default is deliberate — a misconfigured hosted
deployment then denies access instead of giving itself away for free.

## Running without Docker

```bash
npm install
npm run db:migrate
npm run dev
```

You will need a Postgres instance and a `DATABASE_URL` pointing at it. Run
`npx trigger.dev@latest dev` in a second terminal so workflow runs work.

## Exposing it publicly

The Compose stack binds to port 3000 on the host and speaks plain HTTP. Put a
reverse proxy in front of it for TLS — Caddy, nginx, or Traefik — and set
`NEXT_PUBLIC_APP_URL` to the public origin.

`NEXT_PUBLIC_*` values are compiled into the client bundle, so changing that
origin needs a rebuild, not just a restart:

```bash
docker compose up -d --build
```
