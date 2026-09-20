---
title: Architecture
order: 6
---

# Architecture

## Request path

The application is a Next.js App Router project. Routes are grouped by audience:

- `app/(marketing)` — the public landing page and these documents
- `app/(auth)` — Clerk's sign-in, sign-up, and organization selection
- `app/(dashboard)` — the product, behind authentication

`proxy.ts` holds the Clerk middleware and decides which routes require a
session. `/` and `/docs` are deliberately absent from it.

## Data

Postgres, accessed through Drizzle ORM. The schema lives in `lib/db/schema/`,
and migrations in `lib/db/migrations/` are applied by `drizzle-kit migrate`.
Everything is scoped to a Clerk organization id.

`lib/db/index.ts` picks its driver from the connection string: Neon's HTTP
driver for a Neon host, a standard TCP pool for anything else. The client is
built on the first query rather than at import, so a build machine without a
working `DATABASE_URL` does not fail the build.

## Running a workflow

Pressing Run saves the graph and triggers a Trigger.dev task
(`features/workflows/tasks/run-workflow.ts`). The task:

1. Loads the saved graph.
2. Drops unconnected nodes and sorts the rest topologically.
3. Walks them in order, publishing each step's status to run metadata.
4. Returns the steps and the session id the run used.

The canvas subscribes to that metadata, which is why steps light up live rather
than at the end. Steps that need a browser share one cloud session, created
lazily so a graph without them never opens one.

## Collaboration

Each workflow has a Liveblocks room whose id is the workflow id. Rooms are
created with the owning organization as the only group granted write access, so
a workflow is private to its organization.

## Adding a node

Three files under `features/workflows/nodes/`:

1. The implementation, for example `open-url.ts`.
2. Registration in `node-executors.ts`. The `satisfies` contract turns a missing
   executor into a compile error.
3. A manifest entry in `node-registry.ts` — kind, label, icon, accent, input
   fields, and outputs.

The run task and the canvas step node are driven by the registry. Neither needs
editing to add a node.

## Billing and entitlement

`getEntitlement(orgId)` in `features/billing/lib/entitlement.ts` is the single
answer to what an organization may do. When `DEPLOYMENT_MODE=self-hosted` it
returns full access immediately, without reading the database or contacting the
payment provider.

Two enforcement points on the hosted deployment:

- `app/(dashboard)/workflows/layout.tsx` redirects unentitled organizations to
  `/upgrade`.
- Every mutating server action in `features/workflows/actions.ts` re-checks
  entitlement itself, because a server action can be invoked without that
  layout ever rendering.

The layout is a convenience. The server actions are the boundary.
