# Open Source Self-Hosting + Paid Cloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish this project under AGPL-3.0 so anyone can self-host it, while the hosted deployment is subscription-only and offers non-subscribers the self-host route.

**Architecture:** One repository serves both deployments. A `DEPLOYMENT_MODE` flag makes the billing system inert when self-hosted, so the same code either enforces a subscription or grants unlimited access. A public marketing and documentation surface moves onto `/`, pushing the dashboard to `/workflows`.

**Tech Stack:** Next.js 16 (App Router), React 19, Clerk, Drizzle ORM, Neon/Postgres, Trigger.dev, Liveblocks, Browserbase + Stagehand, Dodo Payments, Tailwind 4, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-09-20-open-core-self-hosting-design.md`

## Global Constraints

- **Never run git commands.** No `add`, `commit`, `push`, `reset`, branch or tag operations, and no GitHub CLI. Every task ends without committing. The maintainer handles all version control themselves.
- **Never modify `trigger.config.ts`.** Its hardcoded `project` field stays exactly as it is. Self-hosters edit that file by hand; nothing reads the project reference from the environment.
- **No test framework exists in this project.** `package.json` has no vitest, jest, or playwright. Do not add one, and do not write test files that cannot run. Each task's verification is `npm run typecheck`, `npm run lint`, and the written manual check.
- **Read the shipped Next.js docs before writing App Router code.** `node_modules/next/dist/docs/`. This version has breaking changes from training data.
- **Escape apostrophes and quotes in JSX text.** Use `&apos;` and `&quot;` between JSX tags. The `react/no-unescaped-entities` lint rule fails the build otherwise. This matters constantly in Tasks 4 and 5, which are prose-heavy.
- **Database types come from the Drizzle schema.** Use `typeof table.$inferSelect` and narrow with `Pick`/`Omit`. Never hand-write a row shape.
- **Verification commands:** `npm run typecheck` and `npm run lint` must both pass at the end of every task.

---

## File Structure

**Created:**
- `lib/deployment.ts` — answers "is this a self-hosted deployment?" and nothing else
- `app/(dashboard)/workflows/page.tsx` — workflow list, moved off `/`
- `app/(dashboard)/workflows/layout.tsx` — the subscription gate for product routes
- `app/(dashboard)/upgrade/page.tsx` — paywall with subscribe and self-host doors
- `app/(marketing)/layout.tsx` — public shell (nav + footer, no sidebar)
- `app/(marketing)/page.tsx` — landing page composition
- `features/marketing/components/*.tsx` — one file per landing section
- `app/(marketing)/docs/[[...slug]]/page.tsx` — documentation renderer
- `features/docs/lib/docs.ts` — reads and parses Markdown from `content/docs/`
- `content/docs/*.md` — documentation source
- `Dockerfile`, `docker-compose.yml`, `.dockerignore` additions
- `.env.example`, `LICENSE`, `CONTRIBUTING.md`, rewritten `README.md`

**Modified:**
- `features/billing/lib/entitlement.ts` — self-hosted short-circuit
- `features/billing/plans.ts` — free becomes the unsubscribed state
- `features/workflows/actions.ts` — server-side entitlement assertions, `/workflows` redirects, background-runs config check
- `components/app-sidebar.tsx` — post-org-switch URLs, hide billing when self-hosted
- `proxy.ts` — `/` and `/docs` become public
- `next.config.ts` — standalone output
- `lib/db/index.ts` — driver split for plain Postgres

**Untouched by decision:** `trigger.config.ts`.

---

### Task 1: Deployment mode and entitlement short-circuit

Establishes the flag every later task branches on. Nothing user-visible changes yet.

**Files:**
- Create: `lib/deployment.ts`
- Modify: `features/billing/lib/entitlement.ts`
- Modify: `features/billing/plans.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `isSelfHosted: boolean` and `REPO_URL: string` from `@/lib/deployment`. `getEntitlement(orgId: string): Promise<Entitlement>` keeps its existing signature and returns `isPro: true` when self-hosted. `plans.free.limits.workflows` becomes `0`.

- [ ] **Step 1: Create the deployment module**

Create `lib/deployment.ts`:

```ts
/**
 * Which deployment this process is: the hosted, paid product, or somebody's own
 * installation.
 *
 * Anything other than the exact string "self-hosted" is treated as cloud. This
 * fails closed — a cloud deployment whose environment is misconfigured denies
 * access rather than handing every visitor a Pro plan.
 */
export const isSelfHosted = process.env.DEPLOYMENT_MODE === "self-hosted"

/** Where self-hosters are sent. Used by the paywall, landing page, and footer. */
export const REPO_URL = "https://github.com/saksham-dev0/browser-automation"
```

Ask the maintainer to confirm `REPO_URL` before the repository is published, and correct it here if the name differs.

- [ ] **Step 2: Make the free plan the unsubscribed state**

In `features/billing/plans.ts`, the `free` entry stops being a usable tier. Replace its `description`, `features`, and `limits`:

```ts
  free: {
    id: "free",
    name: "Free",
    description: "Not subscribed. Subscribe to use the hosted app, or self-host it for free.",
    price: "$0",
    interval: "forever",
    features: [
      "No workflows on the hosted app",
      "Unlimited everything when you self-host",
    ],
    limits: { workflows: 0 },
    productId: null,
  },
```

Leave `pro`, `paidPlans`, `getPlan`, and `findPlanByProductId` exactly as they are.

- [ ] **Step 3: Short-circuit the entitlement when self-hosted**

In `features/billing/lib/entitlement.ts`, add the import:

```ts
import { isSelfHosted } from "@/lib/deployment"
```

Add a constant beside the existing `FREE_ENTITLEMENT`:

```ts
/**
 * Self-hosted installations are not billed and have no subscription rows, so
 * they resolve to full access without touching the database or the payment
 * provider.
 */
const SELF_HOSTED_ENTITLEMENT: Entitlement = {
  plan: plans.pro,
  isPro: true,
  status: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  needsAttention: false,
}
```

Then make it the first thing `getEntitlement` does:

```ts
export async function getEntitlement(orgId: string): Promise<Entitlement> {
  if (isSelfHosted) return SELF_HOSTED_ENTITLEMENT

  return toEntitlement(await getSubscription(orgId))
}
```

Leave `toEntitlement` untouched — the payment webhook still uses it to interpret real subscription rows, and it must keep behaving the same.

- [ ] **Step 4: Verify types and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass. A type error on `SELF_HOSTED_ENTITLEMENT` means `plans` is not imported in that file — it already is, via the existing `getPlan, plans, type Plan` import.

- [ ] **Step 5: Manual check**

Run `npm run dev` with no `DEPLOYMENT_MODE` set, sign in, and open `/billing`. It must still show the Free plan and the Pro upgrade card — cloud behavior is unchanged.

Stop the dev server, add `DEPLOYMENT_MODE=self-hosted` to `.env.local`, restart, reload `/billing`. The summary must now report the Pro plan with no subscription status. Remove the line from `.env.local` before moving on, so later tasks develop against cloud behavior.

---

### Task 2: Move the dashboard off `/`

Frees the root route for the landing page. No gating yet — that is Task 3.

**Files:**
- Create: `app/(dashboard)/workflows/page.tsx`
- Delete: `app/(dashboard)/page.tsx`
- Modify: `proxy.ts`
- Modify: `components/app-sidebar.tsx`
- Modify: `features/workflows/actions.ts` (`deleteWorkflowAction`)

**Interfaces:**
- Consumes: the existing `getWorkflowLimit(orgId)`, unchanged.
- Produces: the workflow list lives at `/workflows`. Every in-app redirect targets `/workflows`, never `/`.

- [ ] **Step 1: Move the page**

Create `app/(dashboard)/workflows/page.tsx` with the exact contents of the current `app/(dashboard)/page.tsx`:

```tsx
import { auth } from "@clerk/nextjs/server"

import { WorkflowEmptyState } from "@/features/workflows/components/workflow-empty-state"
import { getWorkflowLimit } from "@/features/workflows/lib/workflow-limit"

export default async function Page() {
  const { orgId } = await auth()

  if (!orgId) return null

  return <WorkflowEmptyState workflowLimit={await getWorkflowLimit(orgId)} />
}
```

Then delete `app/(dashboard)/page.tsx` with the file tools. Do not use `git rm`.

- [ ] **Step 2: Open `/` and `/docs` to the public**

In `proxy.ts`, change the matcher so the root is no longer protected:

```ts
const isProtectedRoute = createRouteMatcher([
  "/workflows(.*)",
  "/billing(.*)",
  "/upgrade(.*)",
])
```

`/` and `/docs` are absent, so they are public. Leave `config.matcher` alone — it already excludes static assets.

- [ ] **Step 3: Point organization switching at the dashboard**

In `components/app-sidebar.tsx`, the three `OrganizationSwitcher` URLs currently send users to `/`, which will become the landing page:

```tsx
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/workflows"
            afterSelectOrganizationUrl="/workflows"
            afterLeaveOrganizationUrl="/workflows"
```

Leave the `appearance` prop unchanged.

- [ ] **Step 4: Fix the delete redirect**

In `features/workflows/actions.ts`, `deleteWorkflowAction` ends by revalidating and redirecting to `/`. Both must move:

```ts
  revalidatePath("/workflows", "layout")

  redirect("/workflows")
```

`createWorkflowAction` already revalidates `/workflows` and redirects to `/workflows/${workflow.id}`; leave it alone.

- [ ] **Step 5: Update the Clerk redirect URLs**

In `.env.local`, set the two fallback redirect variables so signing in lands on the dashboard rather than the landing page:

```
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/workflows
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/workflows
```

- [ ] **Step 6: Verify types and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 7: Manual check**

With `npm run dev`: `/workflows` shows the workflow list or empty state. Creating a workflow lands on its canvas. Deleting a workflow returns to `/workflows`, not a 404 at `/`. Switching organizations lands on `/workflows`. Visiting `/` returns a 404 — expected until Task 4 adds the landing page.

---

### Task 3: Subscription gate and paywall

Makes the hosted product paid-only and gives non-subscribers somewhere real to land.

**Files:**
- Create: `app/(dashboard)/workflows/layout.tsx`
- Create: `app/(dashboard)/upgrade/page.tsx`
- Modify: `features/workflows/actions.ts`
- Modify: `features/billing/components/entitlement-provider.tsx`
- Modify: `components/app-sidebar.tsx`

**Interfaces:**
- Consumes: `getEntitlement(orgId)` and `isSelfHosted`/`REPO_URL` from Task 1.
- Produces: unentitled cloud users are redirected to `/upgrade`. A module-private `requireEntitledOrg(): Promise<{ orgId: string } | { error: string }>` in `features/workflows/actions.ts` guards every mutating action in that file.

- [ ] **Step 1: Gate the product routes**

The gate lives on `/workflows`, not the dashboard layout. Layouts do not receive the pathname, so gating in `app/(dashboard)/layout.tsx` could not exempt `/upgrade` and `/billing` without a client-side pathname read. Nesting solves it structurally: `/upgrade` and `/billing` sit outside `/workflows` and are never gated.

Create `app/(dashboard)/workflows/layout.tsx`:

```tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { getEntitlement } from "@/features/billing/lib/entitlement"

/**
 * The product itself is subscription-only on the hosted deployment. This is a
 * routing convenience, not the authorization boundary — server actions check
 * entitlement themselves, because they can be invoked without ever rendering
 * this layout.
 */
export default async function WorkflowsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { orgId } = await auth()

  if (!orgId) redirect("/choose-organization")

  const { isPro } = await getEntitlement(orgId)

  if (!isPro) redirect("/upgrade")

  return children
}
```

- [ ] **Step 2: Read the plan card's real props**

Open `features/billing/components/plan-card.tsx` and note its exact props before writing the next step. The paywall below assumes `plan` and `canManage`. If they differ, use the real ones — do not change that component to fit this page.

- [ ] **Step 3: Build the paywall page**

Create `app/(dashboard)/upgrade/page.tsx`. Two doors with equal visual weight:

```tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ExternalLinkIcon } from "lucide-react"

import { PlanCard } from "@/features/billing/components/plan-card"
import { getEntitlement } from "@/features/billing/lib/entitlement"
import { plans } from "@/features/billing/plans"
import { REPO_URL } from "@/lib/deployment"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function UpgradePage() {
  const { orgId, has } = await auth()

  if (!orgId) redirect("/choose-organization")

  const { isPro } = await getEntitlement(orgId)

  // Already subscribed: nothing to sell. Send them back to the product.
  if (isPro) redirect("/workflows")

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Two ways to run your workflows
          </h1>
          <p className="text-sm text-muted-foreground">
            Subscribe and we&apos;ll run it for you, or host it yourself for
            free. Both give you every feature.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <PlanCard plan={plans.pro} canManage={has({ role: "org:admin" })} />

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Self-host</CardTitle>
              <CardDescription>
                Run it on your own infrastructure. Every feature, no limits, no
                subscription.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>Open source under AGPL-3.0</li>
                <li>Docker Compose quickstart</li>
                <li>Your own API keys and your own data</li>
                <li>Community support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  View on GitHub
                  <ExternalLinkIcon />
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Enforce entitlement in server actions**

A layout redirect does not protect a server action. In `features/workflows/actions.ts`, add a shared helper below the imports:

```ts
/**
 * Resolves the caller's organization and confirms it may use the product.
 * Server actions are independently addressable, so this repeats the check the
 * workflows layout makes rather than trusting that a page was rendered.
 */
async function requireEntitledOrg(): Promise<{ orgId: string } | { error: string }> {
  const { orgId } = await auth()

  if (!orgId) return { error: "No active organization" }

  const { isPro } = await getEntitlement(orgId)

  if (!isPro) {
    return { error: "This organization has no active subscription." }
  }

  return { orgId }
}
```

Use it at the top of `createWorkflowAction`, replacing its current `auth()` call and `orgId` guard:

```ts
  const resolved = await requireEntitledOrg()

  if ("error" in resolved) return resolved

  const { orgId } = resolved
```

Do the same in `runWorkflowAction`. That action currently throws on a missing org, but its return type already includes `{ error: string }` for premium nodes, so returning the error object is consistent and survives Next's production error redaction.

For `deleteWorkflowAction` and `cancelWorkflowRunAction`, which throw rather than return errors, keep their throwing style:

```ts
  const resolved = await requireEntitledOrg()

  if ("error" in resolved) throw new Error(resolved.error)

  const { orgId } = resolved
```

`cancelWorkflowRunAction` does not currently use `orgId`. Leave that as-is rather than inventing new behavior — it only needs the guard. If the unused binding trips lint, destructure nothing and call the helper for its check alone.

- [ ] **Step 5: Send the client-side gate to the paywall**

In `features/billing/components/entitlement-provider.tsx`, `useProGate` currently routes to `/billing`. The paywall is the better destination for someone with no subscription at all:

```tsx
    toast.error(`${feature} is a Pro feature.`, {
      action: { label: "Upgrade", onClick: () => router.push("/upgrade") },
    })
```

- [ ] **Step 6: Hide billing navigation when self-hosted**

A self-hoster has no subscription to manage. In `components/app-sidebar.tsx`:

```tsx
import { isSelfHosted } from "@/lib/deployment"
```

```tsx
      <SidebarFooter className="gap-2 p-2 group-data-[collapsible=icon]:items-center">
        {isSelfHosted ? null : <BillingNav />}
        <UserButton showName={false} />
      </SidebarFooter>
```

- [ ] **Step 7: Verify types and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass. Watch for unescaped apostrophes in the paywall copy — `we&apos;ll` above is already escaped; keep any new prose escaped too.

- [ ] **Step 8: Manual check**

Sign in as an organization with no subscription. Visiting `/workflows` must redirect to `/upgrade`. Both buttons there work: the Pro card starts a checkout, the GitHub button opens the repository. `/billing` must remain reachable — it is outside the gate.

Then set `DEPLOYMENT_MODE=self-hosted`, restart, and confirm `/workflows` loads with no redirect, the billing item is gone from the sidebar, and no payment-provider request is made. Remove the variable afterwards.

---

### Task 4: Landing page

**Files:**
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(marketing)/page.tsx`
- Create: `features/marketing/components/marketing-header.tsx`
- Create: `features/marketing/components/marketing-footer.tsx`
- Create: `features/marketing/components/hero-section.tsx`
- Create: `features/marketing/components/how-it-works-section.tsx`
- Create: `features/marketing/components/features-section.tsx`
- Create: `features/marketing/components/pricing-section.tsx`
- Create: `features/marketing/components/faq-section.tsx`

**Interfaces:**
- Consumes: `REPO_URL` from `@/lib/deployment`, `plans` from `@/features/billing/plans`.
- Produces: `/` renders the landing page for signed-out and signed-in visitors alike.

One section per file. They are prose-heavy and will be edited independently; a single 600-line page component would be worse to work with.

- [ ] **Step 1: Read the App Router docs for route groups and metadata**

Read `node_modules/next/dist/docs/` for the current route-group and `metadata` API. This Next version differs from training data. Confirm how a second root-level route group coexists with `(dashboard)` and `(auth)` under the shared `app/layout.tsx`.

- [ ] **Step 2: Build the marketing shell**

Create `app/(marketing)/layout.tsx`. It must not mount `EntitlementProvider`, `SidebarProvider`, or anything requiring an authenticated organization:

```tsx
import { MarketingFooter } from "@/features/marketing/components/marketing-footer"
import { MarketingHeader } from "@/features/marketing/components/marketing-header"

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
```

- [ ] **Step 3: Build the header**

Create `features/marketing/components/marketing-header.tsx`:

```tsx
import Link from "next/link"

import { REPO_URL } from "@/lib/deployment"
import { Button } from "@/components/ui/button"

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Browser Automation
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="#how-it-works">How it works</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="#pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/docs">Docs</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Build the footer**

Create `features/marketing/components/marketing-footer.tsx`:

```tsx
import Link from "next/link"

import { REPO_URL } from "@/lib/deployment"

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Open source under AGPL-3.0.</p>
        <nav className="flex gap-4">
          <Link href="/docs">Documentation</Link>
          <Link href="/docs/self-hosting">Self-host</Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Build the hero**

Create `features/marketing/components/hero-section.tsx`:

```tsx
import Link from "next/link"

import { REPO_URL } from "@/lib/deployment"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24 text-center">
      <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Automate the web on a canvas, run it in the cloud
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
        Drag nodes onto a canvas to open pages, act on them, observe them, and
        extract structured data. Run the workflow and watch every step happen,
        with a full session replay when it finishes.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/sign-up">Start automating</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            Self-host it free
          </a>
        </Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Build the how-it-works section**

Create `features/marketing/components/how-it-works-section.tsx`. Describe the real model — canvas, nodes, run, replay — not invented features:

```tsx
const steps = [
  {
    title: "Draw the workflow",
    body: "Drop nodes onto a canvas and connect them. Each node is one step: open a URL, act on the page, observe what is there, or extract structured data.",
  },
  {
    title: "Reference earlier steps",
    body: "Every node publishes named outputs. Later nodes interpolate them into their own inputs, so an extracted value flows straight into the next step.",
  },
  {
    title: "Run it",
    body: "Runs execute in the background on a real cloud browser. The canvas lights up step by step as each node moves from pending to running to done.",
  },
  {
    title: "Watch the replay",
    body: "Every run records the session. Open the replay to see exactly what happened, or read each step's output in the run console.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Build the features section**

Create `features/marketing/components/features-section.tsx`. Before writing the copy, read `features/workflows/nodes/node-registry.ts` so the claims match the node kinds that actually exist:

```tsx
const features = [
  {
    title: "A real canvas",
    body: "Pan, zoom, and rearrange. The graph is the program, and it runs in the order the edges describe.",
  },
  {
    title: "Collaborative by default",
    body: "Workflows are multiplayer. Teammates see each other's cursors and edits on the same canvas in real time.",
  },
  {
    title: "Live run progress",
    body: "Steps stream their status and output while the run is still going, so a long workflow is never a black box.",
  },
  {
    title: "Session replays",
    body: "Each run is recorded. Play it back to see precisely what happened, step by step.",
  },
  {
    title: "Runs in the background",
    body: "Close the tab. Runs execute on durable background infrastructure and keep going without you.",
  },
  {
    title: "Yours to host",
    body: "The whole application is open source. Run it on your own machines with your own keys whenever you want to.",
  },
]

export function FeaturesSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <h2 className="text-3xl font-semibold tracking-tight">
        Everything the run needs
      </h2>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-2">
            <h3 className="text-lg font-medium">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Build the pricing section**

Create `features/marketing/components/pricing-section.tsx`. Two columns of equal weight — self-hosting is a real option, not a downgrade. Read the price from `plans.pro` so it never drifts from the plan catalog:

```tsx
import Link from "next/link"

import { plans } from "@/features/billing/plans"
import { REPO_URL } from "@/lib/deployment"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const selfHostFeatures = [
  "Every feature, no limits",
  "Runs on your infrastructure",
  "Your own API keys and data",
  "AGPL-3.0, community support",
]

export function PricingSection() {
  return (
    <section id="pricing" className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-4xl px-6 py-24">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Pricing</h2>
          <p className="text-muted-foreground">
            Pay us to run it, or run it yourself for nothing. Same features
            either way.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Hosted</CardTitle>
              <CardDescription>{plans.pro.description}</CardDescription>
              <p className="pt-2 text-3xl font-semibold tracking-tight">
                {plans.pro.price}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  {plans.pro.interval}
                </span>
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {plans.pro.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Self-hosted</CardTitle>
              <CardDescription>
                Run the same application on your own infrastructure.
              </CardDescription>
              <p className="pt-2 text-3xl font-semibold tracking-tight">
                Free
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  forever
                </span>
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {selfHostFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button asChild variant="outline" className="w-full">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  View on GitHub
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/docs/self-hosting">Read the setup guide</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 9: Build the FAQ**

Create `features/marketing/components/faq-section.tsx`. Answer the questions self-hosters actually have, honestly — including the external accounts they still need:

```tsx
const faqs = [
  {
    question: "Is it really the same product when I self-host?",
    answer:
      "Yes. There is one codebase and no feature gates. Self-hosted installations get everything the hosted plan gets.",
  },
  {
    question: "What do I still need accounts for?",
    answer:
      "Self-hosting needs your own accounts for Clerk, Liveblocks, Browserbase, Trigger.dev, and a model provider. Those services are not self-hostable, though each has a free tier. Postgres runs in the Docker Compose stack.",
  },
  {
    question: "Is there a free tier on the hosted app?",
    answer:
      "No. The hosted app is subscription-only. If you do not want to pay, self-hosting is free and complete.",
  },
  {
    question: "What license is it under?",
    answer:
      "AGPL-3.0. You can run, modify, and self-host it freely. If you offer it to others as a network service, you have to publish your modifications.",
  },
  {
    question: "Can I move from hosted to self-hosted later?",
    answer:
      "Yes. It is the same schema and the same application, so a database dump moves with you.",
  },
]

export function FaqSection() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-24">
      <h2 className="text-3xl font-semibold tracking-tight">
        Frequently asked questions
      </h2>
      <dl className="mt-12 flex flex-col gap-8">
        {faqs.map((faq) => (
          <div key={faq.question} className="flex flex-col gap-2">
            <dt className="font-medium">{faq.question}</dt>
            <dd className="text-muted-foreground">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
```

- [ ] **Step 10: Compose the page**

Create `app/(marketing)/page.tsx`:

```tsx
import type { Metadata } from "next"

import { FaqSection } from "@/features/marketing/components/faq-section"
import { FeaturesSection } from "@/features/marketing/components/features-section"
import { HeroSection } from "@/features/marketing/components/hero-section"
import { HowItWorksSection } from "@/features/marketing/components/how-it-works-section"
import { PricingSection } from "@/features/marketing/components/pricing-section"

export const metadata: Metadata = {
  title: "Browser Automation — build automations on a canvas",
  description:
    "Build automations on a canvas and run them in the cloud, or self-host the whole thing for free.",
}

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <FaqSection />
    </>
  )
}
```

- [ ] **Step 11: Verify types and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass. `react/no-unescaped-entities` is the likely failure — check every apostrophe sitting directly between JSX tags. Apostrophes inside the `faqs`, `steps`, and `features` arrays are ordinary JavaScript strings and need no escaping; only literal JSX text does.

- [ ] **Step 12: Manual check**

Sign out entirely, then open `/`. The page must render without redirecting to sign-in. Every anchor link scrolls to its section. Check the layout at a narrow width — the grids must collapse to one column. Toggle the system colour scheme and confirm both themes read correctly, since the page uses the existing tokens.

---

### Task 5: Documentation

**Files:**
- Create: `features/docs/lib/docs.ts`
- Create: `app/(marketing)/docs/[[...slug]]/page.tsx`
- Create: `content/docs/index.md`
- Create: `content/docs/self-hosting.md`
- Create: `content/docs/trigger-dev.md`
- Create: `content/docs/environment-variables.md`
- Create: `content/docs/nodes.md`
- Create: `content/docs/architecture.md`
- Modify: `package.json` (two dependencies)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getDoc(slug: string): Promise<DocPage | null>` and `listDocs(): Promise<DocMeta[]>` from `@/features/docs/lib/docs`, where `DocMeta = { slug: string; title: string; order: number }` and `DocPage = DocMeta & { body: string }`.

- [ ] **Step 1: Install the Markdown renderer**

Run: `npm install react-markdown remark-gfm`

These render Markdown to React elements without a build-time MDX pipeline, which keeps the documentation plain Markdown that also reads correctly on GitHub.

- [ ] **Step 2: Write the docs loader**

Create `features/docs/lib/docs.ts`. Front matter is a `title` and `order` pair, parsed directly rather than adding a YAML dependency:

```ts
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

const DOCS_DIR = path.join(process.cwd(), "content", "docs")

export type DocMeta = {
  slug: string
  title: string
  order: number
}

export type DocPage = DocMeta & {
  body: string
}

/**
 * Front matter is deliberately tiny — a title and a sort order, delimited by
 * `---` lines. Anything richer would mean a YAML parser for two fields.
 */
function parse(slug: string, raw: string): DocPage {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)

  if (!match) {
    return { slug, title: slug, order: 999, body: raw }
  }

  const fields = new Map(
    match[1]
      .split("\n")
      .map((line) => line.split(/:\s(.+)/))
      .filter((parts): parts is [string, string] => parts.length >= 2)
      .map(([key, value]) => [key.trim(), value.trim()])
  )

  return {
    slug,
    title: fields.get("title") ?? slug,
    order: Number(fields.get("order") ?? 999),
    body: raw.slice(match[0].length),
  }
}

export async function listDocs(): Promise<DocMeta[]> {
  const entries = await readdir(DOCS_DIR)
  const pages = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".md"))
      .map(async (entry) => {
        const slug = entry.replace(/\.md$/, "")
        return parse(slug, await readFile(path.join(DOCS_DIR, entry), "utf8"))
      })
  )

  return pages
    .sort((a, b) => a.order - b.order)
    .map(({ slug, title, order }) => ({ slug, title, order }))
}

export async function getDoc(slug: string): Promise<DocPage | null> {
  try {
    const raw = await readFile(path.join(DOCS_DIR, `${slug}.md`), "utf8")
    return parse(slug, raw)
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Read the Next docs for optional catch-all routes**

Read `node_modules/next/dist/docs/` on `generateStaticParams` and optional catch-all segments before writing the route. Confirm the current shape of the `params` prop — in this Next version it is a promise and must be awaited.

- [ ] **Step 4: Build the docs route**

Create `app/(marketing)/docs/[[...slug]]/page.tsx`:

```tsx
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { getDoc, listDocs } from "@/features/docs/lib/docs"

type Props = { params: Promise<{ slug?: string[] }> }

export async function generateStaticParams() {
  const docs = await listDocs()

  return docs.map((doc) => ({
    slug: doc.slug === "index" ? [] : [doc.slug],
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = await getDoc(slug?.[0] ?? "index")

  return { title: doc ? `${doc.title} — Docs` : "Docs" }
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params
  const [doc, docs] = await Promise.all([
    getDoc(slug?.[0] ?? "index"),
    listDocs(),
  ])

  if (!doc) notFound()

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-12 px-6 py-12">
      <nav className="hidden w-56 shrink-0 md:block">
        <ul className="sticky top-20 flex flex-col gap-1 text-sm">
          {docs.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={entry.slug === "index" ? "/docs" : `/docs/${entry.slug}`}
                className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose prose-neutral min-w-0 flex-1 dark:prose-invert">
        <Markdown remarkPlugins={[remarkGfm]}>{doc.body}</Markdown>
      </article>
    </div>
  )
}
```

If Tailwind's typography plugin is not installed, the `prose` classes do nothing. Check `app/globals.css` for `@plugin "@tailwindcss/typography"`. If it is absent, either install `@tailwindcss/typography` and register it there, or replace `prose prose-neutral dark:prose-invert` with explicit spacing and heading classes. Do not leave the page styled by classes that are not active.

- [ ] **Step 5: Write the docs index**

Create `content/docs/index.md`:

```markdown
---
title: Introduction
order: 1
---

# Documentation

This application builds automations on a canvas and runs them in the background
on a real cloud browser.

There are two ways to use it:

- **Hosted.** Subscribe and we run it for you. Nothing to install.
- **Self-hosted.** Run the same application yourself, free, under AGPL-3.0.

If you are self-hosting, start with the [self-hosting guide](/docs/self-hosting),
then work through [Trigger.dev setup](/docs/trigger-dev) — workflow runs do not
work until that is done.
```

- [ ] **Step 6: Write the self-hosting guide**

Create `content/docs/self-hosting.md`. This is the page the landing page and README both point at, so it must be complete and honest about the external accounts required:

```markdown
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
| Model provider | Powers act, extract, and observe | Depends on provider |

Each has a free tier that is enough to evaluate the application.

## Quickstart

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in every required value. The
   [environment variable reference](/docs/environment-variables) explains each one.
3. Complete [Trigger.dev setup](/docs/trigger-dev). **Workflow runs will not work
   until you do this.** It includes editing a file in the repository, not only
   setting environment variables.
4. Start the stack:

   ```bash
   docker compose up
   ```

5. Open http://localhost:3000.

Database migrations run automatically on startup.

## Deployment mode

Set `DEPLOYMENT_MODE=self-hosted` in your `.env`. This makes the billing system
inert: no subscription is required, the billing page is hidden, and no payment
credentials are needed.

Leaving it unset makes the installation behave like the hosted product and
require a subscription. That default is deliberate, so a misconfigured hosted
deployment denies access instead of giving it away.
```

- [ ] **Step 7: Write the Trigger.dev setup page**

Create `content/docs/trigger-dev.md`. The project reference is edited in source, which is unusual and must be impossible to miss:

```markdown
---
title: Trigger.dev setup
order: 3
---

# Trigger.dev setup

Workflow runs execute as a Trigger.dev task. Nothing in the application runs
workflows on its own, so **a self-hosted installation is not functional until
this is done**. `docker compose up` alone is not enough.

This is the one part of setup that is not just environment variables.

## 1. Get a Trigger.dev instance

Either create an account on Trigger.dev Cloud, or stand up your own instance by
following [their self-hosting guide](https://trigger.dev/docs/self-hosting/overview).
Self-hosting the Trigger.dev platform needs a Docker registry and its own
Compose stack, and is not part of this repository's stack.

## 2. Edit the project reference in source

Create a project in Trigger.dev and copy its reference. Then open
`trigger.config.ts` in the repository and replace the `project` value:

```ts
export default defineConfig({
  project: "proj_your_reference_here",
  // ...
})
```

This value ships in the repository pointing at the hosted deployment's own
project. **If you do not change it, your deploy targets a project you do not own
and will fail.** It is read from the file, not from the environment, so there is
no variable that overrides it.

## 3. Set the secret key

Copy a secret key for your target environment into `.env`:

```
TRIGGER_SECRET_KEY=tr_dev_...
```

If you are running your own Trigger.dev instance rather than their cloud, also
set `TRIGGER_API_URL` to that instance's URL, both in `.env` and in the
environment where you run the CLI.

## 4. Deploy the task code

Task code is deployed to your Trigger.dev instance. It does not run as one of
the Compose services.

For a running installation:

```bash
npx trigger.dev@latest deploy
```

While developing:

```bash
npx trigger.dev@latest dev
```

Without this step, no tasks are registered and every workflow run fails.

## 5. Re-deploy after changes

Any change under `features/workflows/` — a new node, a changed executor —
requires running `npx trigger.dev@latest deploy` again before it takes effect.
```

- [ ] **Step 8: Write the environment variable reference**

Create `content/docs/environment-variables.md`. Keep it in exact agreement with `.env.example`, which Task 7 writes:

```markdown
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
| `DATABASE_URL` | Yes | Postgres connection string. The Compose stack sets this for you. |

## Authentication — Clerk

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key. |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Yes | `/workflows` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Yes | `/workflows` |

Organizations must be enabled on your Clerk instance. Every workflow belongs to
an organization, not to a user.

## Background runs — Trigger.dev

| Variable | Required | Purpose |
| --- | --- | --- |
| `TRIGGER_SECRET_KEY` | Yes | Secret key for your Trigger.dev environment. |
| `TRIGGER_API_URL` | Only when self-hosting Trigger.dev | URL of your own Trigger.dev instance. |

The Trigger.dev **project reference is not an environment variable.** It lives in
`trigger.config.ts` and you edit it by hand. See [Trigger.dev setup](/docs/trigger-dev).

## Realtime canvas — Liveblocks

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Yes | Liveblocks public key. |
| `LIVEBLOCKS_SECRET_KEY` | Yes | Liveblocks secret key. |

## Cloud browsers — Browserbase

| Variable | Required | Purpose |
| --- | --- | --- |
| `BROWSERBASE_API_KEY` | Yes | Browserbase API key. Also powers session replays. |
| `BROWSERBASE_PROJECT_ID` | Yes | Browserbase project id. |

## Email — Resend

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | No | Transactional email. Leave unset if you do not need it. |

## Billing — Dodo Payments

Not required when `DEPLOYMENT_MODE=self-hosted`. Self-hosted installations never
call the payment provider.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DODO_PAYMENTS_API_KEY` | Hosted only | Dodo API key. |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Hosted only | Verifies webhooks at `/api/webhooks/dodo`. |
| `DODO_PAYMENTS_ENVIRONMENT` | Hosted only | `test_mode` or `live_mode`. |
| `DODO_PRO_PRODUCT_ID` | Hosted only | Product id for the Pro plan. |
```

- [ ] **Step 9: Write the node reference**

Create `content/docs/nodes.md`. Read `features/workflows/nodes/node-registry.ts` and `features/workflows/lib/interpolate.ts` first, and document what actually exists — real labels, real input fields, real outputs, real interpolation syntax. Use this structure:

```markdown
---
title: Nodes
order: 5
---

# Nodes

A workflow is a graph of nodes. Each node takes inputs, does one thing, and
publishes named outputs that later nodes can reference.

## Referencing earlier outputs

[Document the real interpolation syntax from interpolate.ts, with a working
example. Do not guess at the delimiters.]

## Node reference

[One subsection per entry in node-registry.ts: its label, what it does, each
input field, and each output downstream nodes can reference.]
```

The bracketed lines are instructions to you, the implementer. Replace both with real content before finishing this step — a shipped file containing them is a failed task.

- [ ] **Step 10: Write the architecture overview**

Create `content/docs/architecture.md`:

```markdown
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

## Data

Postgres, accessed through Drizzle ORM. The schema lives in `lib/db/schema/`,
and migrations in `lib/db/migrations/` are applied by `drizzle-kit migrate`.
Everything is scoped to a Clerk organization id.

## Running a workflow

Pressing Run saves the graph and triggers a Trigger.dev task
(`features/workflows/tasks/run-workflow.ts`). The task sorts the graph
topologically, walks the nodes in order, and publishes each step's status to run
metadata, which the canvas subscribes to. Steps that need a browser share one
cloud session, created lazily so a graph without them never opens one.

## Adding a node

Three files under `features/workflows/nodes/`:

1. The implementation, for example `open-url.ts`.
2. Registration in `node-executors.ts`. The `satisfies` contract turns a missing
   executor into a compile error.
3. A manifest entry in `node-registry.ts` — kind, label, icon, accent, input
   fields, and outputs.

The run task and the canvas step node are driven by the registry. Neither needs
editing to add a node.

## Billing

`getEntitlement(orgId)` in `features/billing/lib/entitlement.ts` is the single
answer to what an organization may do. When `DEPLOYMENT_MODE=self-hosted` it
returns full access immediately, without reading the database or contacting the
payment provider.
```

- [ ] **Step 11: Verify types and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 12: Manual check**

Signed out, open `/docs`. The index renders and the sidebar lists all six pages in order. Each sidebar link loads its page. `/docs/does-not-exist` renders the not-found page rather than crashing. Confirm the Markdown is actually styled — headings, tables, and code blocks must be visibly formatted, not unstyled text. The environment variables page is the one to check, since its tables prove `remark-gfm` is working.

---

### Task 6: Fail loudly when background runs are unconfigured

A canvas whose Run button dies at the last moment is the worst outcome for a new self-hoster.

**Files:**
- Modify: `features/workflows/actions.ts`

**Interfaces:**
- Consumes: `requireEntitledOrg` from Task 3.
- Produces: `runWorkflowAction` returns `{ error: string }` naming the documentation when `TRIGGER_SECRET_KEY` is absent.

- [ ] **Step 1: Check the configuration before triggering**

In `features/workflows/actions.ts`, inside `runWorkflowAction`, add this immediately before the `tasks.trigger` call:

```ts
  // A missing key surfaces from the SDK as an opaque failure well after the run
  // appears to start. Self-hosters hit this constantly, so name the cause.
  //
  // An unedited `project` reference in trigger.config.ts cannot be detected
  // here — it fails at deploy time, on their machine. The setup guide is the
  // only guard for that, which is why it is a numbered quickstart step.
  if (!process.env.TRIGGER_SECRET_KEY) {
    return {
      error:
        "Background runs are not configured, so workflows cannot run. See the Trigger.dev setup guide at /docs/trigger-dev.",
    }
  }
```

- [ ] **Step 2: Verify types and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass. If `runWorkflowAction`'s return type does not already admit `{ error: string }`, widen it using the handle type that `tasks.trigger` returns — do not cast.

- [ ] **Step 3: Manual check**

Comment out `TRIGGER_SECRET_KEY` in `.env.local`, restart the dev server, open a workflow, and press Run. The error must name the documentation path rather than showing a generic failure. Restore the variable and confirm runs work again.

---

### Task 7: Packaging for self-hosting

**Files:**
- Modify: `next.config.ts`
- Modify: `lib/db/index.ts`
- Modify: `package.json` (one dependency)
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Modify: `.dockerignore`
- Create: `.env.example`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `docker compose up` from a clean clone serves the application on port 3000 against a Compose-managed Postgres.

- [ ] **Step 1: Enable standalone output**

In `next.config.ts`:

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    devIndicators: false,
    // Emits a self-contained server bundle with only the dependencies it
    // actually uses, which is what the Docker image copies.
    output: "standalone",
}

export default nextConfig
```

Read `node_modules/next/dist/docs/` on `output: "standalone"` to confirm which directories the image must copy in this Next version before writing the Dockerfile.

- [ ] **Step 2: Install the Postgres driver**

Run: `npm install pg && npm install --save-dev @types/pg`

- [ ] **Step 3: Split the database driver**

`lib/db/index.ts` always builds a Neon HTTP client, which cannot reach a plain Postgres server. Rewrite `getDb` to choose, keeping the existing lazy construction and its reasoning intact:

```ts
import { neon } from "@neondatabase/serverless"
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http"
import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

type Database = NeonHttpDatabase<typeof schema> | NodePgDatabase<typeof schema>

let instance: Database | undefined

/**
 * Built on first query, not at import. Next evaluates every server module while
 * collecting page data at build time, and a build machine has no reason to hold
 * a working `DATABASE_URL` — connecting eagerly turns a missing or malformed
 * value into a build failure instead of a runtime one.
 */
function getDb(): Database {
  if (instance) return instance

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  // Neon's driver speaks HTTP to Neon's endpoint and cannot reach an ordinary
  // Postgres server, so installations pointing at their own database get the
  // TCP driver instead.
  instance = connectionString.includes("neon.tech")
    ? drizzleNeon(neon(connectionString), { schema })
    : drizzleNode(new Pool({ connectionString }), { schema })

  return instance
}
```

Leave the `Proxy` export and `export * from "./schema"` exactly as they are.

- [ ] **Step 4: Verify the driver split compiles**

Run: `npm run typecheck`
Expected: passes. A union of two database types can produce errors at call sites using driver-specific APIs. If that happens, check `features/billing/data.ts` — its comment notes the Neon HTTP driver has no interactive transactions, so nothing should rely on `db.transaction`. Report any call site that does not type-check under the union rather than casting it away.

- [ ] **Step 5: Write the Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next inlines NEXT_PUBLIC_* values at build time, so they must be present here
# and not only at runtime.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

The documentation directory must exist at runtime, since `features/docs/lib/docs.ts` reads it from disk. Confirm whether `content/` lands in the standalone output. If it does not, add `COPY --from=builder /app/content ./content` to the runner stage.

- [ ] **Step 6: Write the Compose stack**

Create `docker-compose.yml`. Three services — there is deliberately no worker, because Trigger.dev task code is deployed rather than run here:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 5s
      retries: 10

  migrate:
    build: .
    command: npx drizzle-kit migrate
    env_file: .env
    environment:
      DATABASE_URL: postgres://app:app@postgres:5432/app
    depends_on:
      postgres:
        condition: service_healthy

  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY: ${NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY}
        NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: /sign-in
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: /sign-up
        NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: /workflows
        NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: /workflows
    env_file: .env
    environment:
      DATABASE_URL: postgres://app:app@postgres:5432/app
    ports:
      - "3000:3000"
    depends_on:
      migrate:
        condition: service_completed_successfully

volumes:
  postgres-data:
```

The `migrate` service needs `drizzle-kit` and the migration files, which the standalone runner stage does not contain. If `npx drizzle-kit migrate` fails in that image, give the migrate service its own Dockerfile stage that keeps `node_modules`, `drizzle.config.ts`, and `lib/db/`, and point the service at it.

- [ ] **Step 7: Check the Docker ignore list**

Read `.dockerignore` and confirm it excludes `.next`, `node_modules`, `.env.local`, `.env`, `.git`, `.trigger`, and `.neon`. Add any that are missing. `.env.local` must never be copied into an image.

- [ ] **Step 8: Write the environment template**

Create `.env.example`. Every key, with a signup link and a note on whether it is required. Keep it in exact agreement with `content/docs/environment-variables.md` from Task 5:

```bash
# Deployment ------------------------------------------------------------------
# "self-hosted" disables billing entirely. Anything else means the paid hosted
# mode, which requires a subscription.
DEPLOYMENT_MODE=self-hosted
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database --------------------------------------------------------------------
# Docker Compose sets this for you. Override only if you bring your own Postgres.
DATABASE_URL=postgres://app:app@postgres:5432/app

# Authentication — https://clerk.com (organizations must be enabled) ----------
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/workflows
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/workflows

# Background runs — https://trigger.dev ---------------------------------------
# REQUIRED SETUP: this key is not enough on its own. You must also edit the
# `project` field in trigger.config.ts and deploy the task code.
# See /docs/trigger-dev.
TRIGGER_SECRET_KEY=
# Only when running your own Trigger.dev instance rather than their cloud.
# TRIGGER_API_URL=

# Realtime canvas — https://liveblocks.io -------------------------------------
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
LIVEBLOCKS_SECRET_KEY=

# Cloud browsers — https://browserbase.com ------------------------------------
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=

# Email — https://resend.com (optional) ---------------------------------------
RESEND_API_KEY=

# Billing — https://dodopayments.com ------------------------------------------
# Not needed when DEPLOYMENT_MODE=self-hosted.
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PRO_PRODUCT_ID=
```

- [ ] **Step 9: Verify types and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 10: Manual check**

Build the image: `docker compose build`. Then, with a `.env` filled from `.env.example`, run `docker compose up`. The migrate service must complete successfully and the application must answer on http://localhost:3000. Sign in, create a workflow, and confirm the canvas loads. Workflow runs will fail until Trigger.dev is set up — that is expected, and Task 6's message is what explains it.

---

### Task 8: Repository documents

The last task before the maintainer's publishing checklist.

**Files:**
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Rewrite: `README.md`

**Interfaces:**
- Consumes: the documentation written in Task 5.
- Produces: nothing other code depends on.

- [ ] **Step 1: Add the license**

Create `LICENSE` containing the verbatim GNU Affero General Public License v3.0, from https://www.gnu.org/licenses/agpl-3.0.txt. Do not retype or summarize it — a modified licence text is not the licence.

- [ ] **Step 2: Rewrite the README**

`README.md` is currently the untouched shadcn starter template. Replace it entirely:

```markdown
# Browser Automation

Build automations on a canvas and run them on real cloud browsers.
Open source under AGPL-3.0.

Drop nodes onto a canvas to open pages, act on them, observe them, and extract
structured data. Connect them, press Run, and watch each step execute live —
with a full session replay when it finishes.

## Two ways to run it

**Hosted.** Subscribe and we run it for you. Nothing to install.

**Self-hosted.** Run the same application yourself, free. No feature gates, no
limits, no subscription. See the [self-hosting guide](content/docs/self-hosting.md).

## Quickstart (self-hosting)

```bash
cp .env.example .env
# fill in .env — see content/docs/environment-variables.md
docker compose up
```

Then open http://localhost:3000.

**Before workflow runs will work**, you must complete
[Trigger.dev setup](content/docs/trigger-dev.md). That includes editing
`trigger.config.ts` with your own project reference and deploying the task code.
It is not only environment variables, and nothing runs without it.

## Services you need accounts for

Self-hosting is not dependency-free. Clerk, Liveblocks, and Browserbase cannot
be self-hosted, though each has a free tier. Trigger.dev can be self-hosted or
used via their cloud. Postgres runs in the Compose stack.

Full list with signup links: [environment variables](content/docs/environment-variables.md).

## Documentation

- [Self-hosting](content/docs/self-hosting.md)
- [Trigger.dev setup](content/docs/trigger-dev.md)
- [Environment variables](content/docs/environment-variables.md)
- [Nodes](content/docs/nodes.md)
- [Architecture](content/docs/architecture.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

AGPL-3.0. You may run, modify, and self-host this freely. If you offer it to
others as a network service, you must publish your modifications.
```

- [ ] **Step 3: Write the contributing guide**

Create `CONTRIBUTING.md`:

```markdown
# Contributing

## Getting set up

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in. See
   [environment variables](content/docs/environment-variables.md).
3. `npm run db:migrate`
4. `npm run dev`
5. In a second terminal, `npx trigger.dev@latest dev` so workflow runs work.

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npm run format
```

All three must be clean.

## Adding a workflow node

Three edits under `features/workflows/nodes/`:

1. The implementation file, for example `open-url.ts`.
2. Registration in `node-executors.ts`.
3. A manifest entry in `node-registry.ts`.

The run task and the canvas step node are registry-driven. Do not edit them to
add a node.

After changing anything under `features/workflows/`, run
`npx trigger.dev@latest deploy` for the change to take effect in a deployed
environment.

## Conventions

- Database types come from the Drizzle schema. Use `typeof table.$inferSelect`
  and narrow with `Pick` or `Omit`. Never hand-write a row shape.
- Escape apostrophes and quotes in JSX text content — `&apos;` and `&quot;`.
  The `react/no-unescaped-entities` lint rule will fail the build otherwise.
- This project pins specific major versions of Next.js, React Flow, and
  Stagehand whose APIs differ from older releases. Check the installed
  package's own documentation before using an API from memory.

## License

Contributions are accepted under AGPL-3.0.
```

- [ ] **Step 4: Verify lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 5: Manual check**

Read the README as someone who has never seen the project. Every documentation link must resolve to a file that exists. The Trigger.dev requirement must be impossible to miss.

---

## Maintainer checklist before publishing

**These steps belong to the maintainer, not the implementer. No agent performs them.**

The implementation is finished, but the repository must not be made public until:

1. **Scan the full history for secrets.** `.env.local` is untracked today, but
   history is permanent — a force-push does not reliably remove a leaked
   credential from forks, caches, or clones. Run gitleaks or an equivalent over
   the entire history.
2. **Rotate every credential that has ever appeared in a commit.** Clerk, Neon,
   Trigger.dev, Liveblocks, Browserbase, Resend, and Dodo.
3. **Decide about the Trigger.dev project reference.** `trigger.config.ts`
   contains this deployment's own project reference and stays that way by
   decision. It is an identifier rather than a secret, but it becomes public.
4. **Confirm `REPO_URL`** in `lib/deployment.ts` matches the real repository.
5. **Check ignore rules** cover `.trigger/`, `.neon/`, `.mcp.json`, `.env*`.

## Verification matrix

Run before publishing:

| Scenario | Expected |
| --- | --- |
| Cloud, signed in, no subscription, open `/workflows` | Redirected to `/upgrade` |
| Cloud, no subscription, `createWorkflowAction` invoked directly | Refused with an error |
| Cloud, active subscription | Full application |
| `DEPLOYMENT_MODE=self-hosted` | No paywall, billing nav hidden, no payment-provider requests |
| Signed out, open `/` and `/docs` | Render without redirecting to sign-in |
| `TRIGGER_SECRET_KEY` unset, press Run | Message naming the Trigger.dev setup docs |
| Trigger.dev configured and task deployed | Workflow run completes |
| Clean clone, `.env` filled, `docker compose up` | Application serves on port 3000 |
