# Open Source + Paid Cloud: Design

Date: 2026-09-20
Status: Approved, not yet implemented

## Goal

Publish this project under an open source license so anyone can self-host it,
while the hosted deployment at our own domain is a paid product. A visitor who
does not subscribe is offered the self-host route instead of being turned away.

## Decisions

These were settled during brainstorming and are not open questions:

| Decision | Choice |
| --- | --- |
| Feature parity | Self-host gets every feature. No gates, no license key, no "open core" split. |
| License | AGPL-3.0. Self-hosting is free; offering a competing hosted service requires publishing modifications. |
| Repository | One public repository. `main` deploys the cloud. Billing code ships public but inert when self-hosted. |
| Cloud pricing | Paid only. There is no usable free tier on the hosted deployment. |
| Non-subscriber UX | In-app paywall page offering both a subscription and a link to self-host. Not a hard redirect off-site. |
| Self-host dependencies | Bring your own API keys for every external service. No second implementation of auth, collaboration, or browsers. |
| Self-host entry point | `docker compose up` after filling `.env`. |
| Landing page | Single scrolling marketing page, plus a documentation section rendered from Markdown in the repository. |

### Why "bring your own keys" and not provider abstractions

Three dependencies have no self-hosted edition: Clerk, Liveblocks, and
Browserbase. Supporting a truly dependency-free self-host would mean writing and
maintaining a second implementation of authentication, realtime collaboration,
and browser sessions. Each of those services has a free tier a self-hoster can
sign up for. The README states this honestly rather than implying the stack is
dependency-free.

Postgres is the exception: the compose stack runs it locally, so no Neon
account is needed.

Trigger.dev is a third case. It is genuinely self-hostable, but it cannot be
reduced to an environment variable, because task code is *deployed* to a
Trigger.dev instance rather than run as an ordinary container. Section
"Trigger.dev setup" below states what the operator must do by hand.

## Architecture

### Deployment mode

A single flag distinguishes the two deployments.

`lib/deployment.ts` exports `isSelfHosted`, derived from `DEPLOYMENT_MODE`. The
value defaults to `cloud` when the variable is missing or unrecognized. This
fails closed: a misconfigured cloud environment denies access rather than
granting Pro to everyone.

### Entitlement

`getEntitlement(orgId)` in `features/billing/lib/entitlement.ts` is already the
single answer to "what is this org allowed to do?". It gains one branch: when
`isSelfHosted`, it returns an unlimited Pro entitlement immediately, without
querying the subscription table or contacting Dodo. Self-hosted deployments
therefore need no Dodo credentials and no subscription rows.

In `features/billing/plans.ts`, the `free` plan stops representing a usable tier
and becomes the unsubscribed state: `limits.workflows` is `0`. The paywall, not
a per-feature limit, is what unsubscribed cloud users encounter.

### Authorization boundary

The layout redirect is a routing convenience, not a security boundary. Two
enforcement points:

1. `app/(dashboard)/layout.tsx` resolves the entitlement and redirects to
   `/upgrade` when the org is not entitled and the request is not already for
   `/upgrade` or `/billing`.
2. Every mutating server action in `features/workflows/actions.ts` asserts
   entitlement itself before touching data.

Point 2 is required. Server actions are independently addressable; a client that
never renders the layout can still invoke them.

## Routing

| Route | Group | Access |
| --- | --- | --- |
| `/` | `(marketing)` | Public landing page |
| `/docs`, `/docs/[[...slug]]` | `(marketing)` | Public documentation |
| `/sign-in`, `/sign-up`, `/choose-organization` | `(auth)` | Public |
| `/workflows` | `(dashboard)` | Signed in, entitled |
| `/workflows/[id]` | `(dashboard)` | Signed in, entitled |
| `/billing` | `(dashboard)` | Signed in; reachable while unentitled |
| `/upgrade` | `(dashboard)` | Signed in; reachable while unentitled |

Changes this forces:

- `app/(dashboard)/page.tsx` (the workflow list, currently served at `/`) moves
  to `app/(dashboard)/workflows/page.tsx`.
- `proxy.ts` drops `/` from `isProtectedRoute` and leaves `/docs` public. Its
  `config.matcher` already excludes static assets and needs no change.
- Clerk's sign-in and sign-up fallback redirect URLs point at `/workflows`.

## Components

### Marketing shell — `app/(marketing)/`

Its own layout with a public navigation bar and footer, no sidebar, no
`EntitlementProvider`. Built from the existing shadcn components and the tokens
in `app/globals.css` so the marketing surface and the product look like one
system.

Landing page sections, in order: hero, how it works (canvas to nodes to run to
replay), features, pricing, frequently asked questions, footer.

The pricing section presents two columns side by side: the hosted Pro
subscription and self-hosting. Self-hosting is presented as a real option with a
link to the repository, not as a downgrade.

### Documentation — `content/docs/*.md`

Markdown files in the repository, rendered by
`app/(marketing)/docs/[[...slug]]/page.tsx` and statically generated at build
time. Initial pages:

- Self-hosting quickstart
- Trigger.dev setup (required manual steps; see below)
- Environment variable reference
- Node reference
- Architecture overview

The README links into these pages rather than duplicating their content.

### Paywall — `app/(dashboard)/upgrade/page.tsx`

Two actions, presented with equal weight:

- Subscribe, reusing the existing Dodo checkout in `features/billing/actions.ts`.
- Self-host free, linking to the public repository and the self-hosting
  quickstart.

The page is never rendered in self-hosted mode; the entitlement short-circuit
means the redirect that leads here cannot fire.

### Database driver — `lib/db/index.ts`

The module currently constructs a `neon-http` Drizzle client. It gains a driver
choice: `node-postgres` for a standard Postgres connection, `neon-http` for a
Neon host. The existing lazy-construction behavior is preserved, since the
reasoning behind it (build machines have no working `DATABASE_URL`) is unchanged.

Schema and migrations are shared. Neither driver sees a different database
shape.

## Self-host packaging

- `next.config.ts` sets `output: "standalone"`.
- `Dockerfile` builds the standalone Next.js output.
- `docker-compose.yml` defines four services: `postgres`, a `migrate` init
  container running `drizzle-kit migrate`, and `app`. There is no worker
  service; see "Trigger.dev setup".
- `.env.example` lists every variable with its purpose, a signup link for the
  service it belongs to, and whether it is required.

A self-hoster supplies credentials for Clerk, Liveblocks, Browserbase,
Trigger.dev, and an LLM provider. Postgres runs in the compose stack. Dodo
credentials are not required.

## Trigger.dev setup

Workflow runs execute as a Trigger.dev task (`features/workflows/tasks/run-workflow.ts`).
Nothing in the application runs workflows on its own, so a self-hosted
deployment is not functional until Trigger.dev is configured. This cannot be
automated away by `docker compose up`, and the documentation must say so
plainly rather than listing Trigger.dev as one more API key.

### The project reference is edited by hand

`trigger.config.ts` hardcodes this project's own reference in its `project`
field, and stays that way by decision. It is not read from the environment.

A self-hoster must therefore open `trigger.config.ts` and replace that value
with their own project reference before deploying. Leaving it unchanged means
their deploy targets a project they do not own and fails.

This makes the file the one piece of source a self-hoster edits rather than
configures, so the quickstart calls it out as its own numbered step with the
exact line to change, and the environment variable reference notes that the
project reference lives in source, not in `.env`.

### Steps the operator must perform by hand

Documented as a required, numbered section of the self-hosting quickstart, not
a footnote:

1. Create a Trigger.dev account on Trigger.dev Cloud, *or* stand up a
   self-hosted Trigger.dev instance by following its own Docker guide.
2. Create a project and paste its reference into the `project` field of
   `trigger.config.ts`, replacing the value that ships in the repository.
3. Copy a secret key for the target environment into `TRIGGER_SECRET_KEY`.
4. When using a self-hosted Trigger.dev instance, set `TRIGGER_API_URL` to that
   instance's URL for both the application and the CLI.
5. Deploy the task code with `npx trigger.dev@latest deploy`, or run
   `npx trigger.dev@latest dev` while developing. Without this step the tasks
   are not registered and every workflow run fails.
6. Re-run the deploy after changing anything under `features/workflows/`.

### Failing loudly

A deployment missing `TRIGGER_SECRET_KEY` or `TRIGGER_PROJECT_REF` must not
present a working-looking canvas whose Run button fails at the last moment. The
run entry point checks for the configuration and surfaces a clear message
pointing at the Trigger.dev setup documentation.

### Not packaged

Self-hosting the Trigger.dev platform requires a Docker registry, its own
compose stack, and `TRIGGER_API_URL` wiring. That is Trigger.dev's project to
document, and this repository links to their guide rather than reproducing it.

## Publishing gate

The repository cannot be made public until the following completes. Git history
is permanent; a force-push does not reliably remove a leaked secret from forks,
caches, or clones.

1. Scan the full history for committed secrets with gitleaks or an equivalent.
2. Confirm `.trigger/`, `.neon/`, `.mcp.json`, and `.vscode/` are untracked or
   contain nothing sensitive, and that `.gitignore` covers them.
3. Rotate every credential that has ever appeared in a commit.

The scan and the report are automated. Rotating credentials and making the
repository public are manual steps taken by the maintainer.

## Error handling

- `DEPLOYMENT_MODE` missing or unrecognized: treated as `cloud`. A cloud
  deployment that fails to read the flag denies access; it does not grant it.
- Self-hosted deployment with Dodo variables absent: no code path reads them,
  because the entitlement short-circuit returns before any billing call.
- Cloud deployment with an unreachable subscription record: the existing
  `toEntitlement()` behavior applies and the user sees the paywall.
- Documentation slug that matches no Markdown file: renders the route's
  `not-found`.
- `TRIGGER_SECRET_KEY` missing: triggering a run fails with a message naming
  the Trigger.dev setup documentation, rather than a generic error. An
  unedited project reference in `trigger.config.ts` cannot be detected at
  runtime, so the quickstart carries the burden of making that step
  unmissable.

## Testing

Automated: `npm run typecheck` and `npm run lint` pass.

Manual matrix, each verified before publishing:

| Scenario | Expected |
| --- | --- |
| Cloud, signed in, no subscription | Redirected to `/upgrade`; both doors work |
| Cloud, signed in, no subscription, direct server action call | Rejected |
| Cloud, signed in, active subscription | Full application |
| Self-hosted | No paywall, billing navigation hidden, no Dodo requests |
| Clean clone, `.env` filled, `docker compose up` | Reaches a working canvas |
| Clean clone, `TRIGGER_SECRET_KEY` unset, Run pressed | Clear message pointing at the Trigger.dev setup docs |
| Clean clone, Trigger.dev configured and task deployed | Workflow run completes |
| `/` and `/docs` signed out | Render without redirecting to sign-in |

## Implementation order

1. Publishing-gate scan. Gates everything else.
2. Routing restructure, deployment mode flag, entitlement short-circuit.
3. Paywall page and plan changes.
4. Landing page.
5. Documentation routes and initial content, including the Trigger.dev setup page.
6. Docker, compose, database driver split.
7. README, LICENSE, CONTRIBUTING; then publish.

## Out of scope

- Replacing Clerk, Liveblocks, or Browserbase with self-hostable equivalents.
- A trial period. New organizations meet the paywall immediately.
- A local-browser mode. Browser sessions always run on Browserbase, using the
  operator's own API key, so session replay works identically in both
  deployments.
- Any license key or entitlement mechanism for self-hosted deployments.
- Packaging a self-hosted Trigger.dev platform in our compose stack. Operators
  who want one follow Trigger.dev's own self-hosting guide.
- Moving the Trigger.dev project reference out of `trigger.config.ts`. The file
  is left exactly as it is; self-hosters edit it.
