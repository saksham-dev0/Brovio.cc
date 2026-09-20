---
title: Environment variables
order: 4
---

# Environment variables

Copy `.env.example` to `.env` and fill these in.

## Deployment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEPLOYMENT_MODE` | Yes for self-hosting | Set to `self-hosted` to disable billing. Anything else means the paid hosted mode. |
| `NEXT_PUBLIC_APP_URL` | Yes | The origin the application is served from, for example `http://localhost:3000`. |

## Database

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. The Compose stack sets this for you. A Neon host uses Neon's HTTP driver; anything else uses a standard TCP connection. |
| `DATABASE_URL_UNPOOLED` | Yes | Used only by `drizzle-kit` when applying migrations, which need a direct connection on Neon. On a self-hosted install this is the same value as `DATABASE_URL`. |

## Authentication — Clerk

Sign up at <https://clerk.com>.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key. |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Yes | `/workflows` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Yes | `/workflows` |

**Organizations must be enabled** on your Clerk instance. Every workflow belongs
to an organization, not to a user.

## Background runs — Trigger.dev

Sign up at <https://trigger.dev>.

| Variable | Required | Purpose |
| --- | --- | --- |
| `TRIGGER_SECRET_KEY` | Yes | Secret key for your Trigger.dev environment. |
| `TRIGGER_API_URL` | Only when self-hosting Trigger.dev | URL of your own Trigger.dev instance. |

The Trigger.dev **project reference is not an environment variable.** It lives
in `trigger.config.ts` and you edit it by hand. See
[Trigger.dev setup](/docs/trigger-dev).

## Realtime canvas — Liveblocks

Sign up at <https://liveblocks.io>.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Yes | Liveblocks public key. |
| `LIVEBLOCKS_SECRET_KEY` | Yes | Liveblocks secret key. |

## Cloud browsers — Browserbase

Sign up at <https://browserbase.com>.

| Variable | Required | Purpose |
| --- | --- | --- |
| `BROWSERBASE_API_KEY` | Yes | Browserbase API key. Also powers session replays. |
| `BROWSERBASE_PROJECT_ID` | Yes | Browserbase project id. |

Model inference for the act, extract, observe, and agent nodes routes through
Browserbase's model gateway and bills to this key, so no separate provider key
is required.

## Email — Resend

Sign up at <https://resend.com>. Only needed if you use the Send Email node.

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | No | Transactional email. |

## Billing — Dodo Payments

**Not required when `DEPLOYMENT_MODE=self-hosted`.** Self-hosted installations
never call the payment provider.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DODO_PAYMENTS_API_KEY` | Hosted only | Dodo API key. |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Hosted only | Verifies webhooks at `/api/webhooks/dodo`. |
| `DODO_PAYMENTS_ENVIRONMENT` | Hosted only | `test_mode` or `live_mode`. |
| `DODO_PRO_PRODUCT_ID` | Hosted only | Product id for the Pro plan. |
