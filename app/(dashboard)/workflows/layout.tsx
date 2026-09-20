import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { getEntitlement } from "@/features/billing/lib/entitlement"

/**
 * The product itself is subscription-only on the hosted deployment. Self-hosted
 * installations resolve to an entitled plan, so this never redirects there.
 *
 * The gate sits here rather than on the dashboard layout because a layout never
 * sees the pathname: `/upgrade` and `/billing` have to stay reachable without a
 * subscription, and nesting is what keeps them outside it.
 *
 * This is a routing convenience, not the authorization boundary — server
 * actions re-check entitlement themselves, since they can be invoked without
 * this layout ever rendering.
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
