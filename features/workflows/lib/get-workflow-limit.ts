import { getEntitlement } from "@/features/billing/lib/entitlement"
import { countWorkflows } from "@/features/workflows/data"

import type { WorkflowLimit } from "./workflow-limit"

/**
 * The authoritative answer to "may this org create another workflow?". The
 * sidebar reads it to render state; `createWorkflowAction` re-reads it to
 * enforce, because the client copy can be stale or forged.
 *
 * Kept apart from `workflow-limit.ts` on purpose: that module holds the type
 * and the message, which client components need, while this one reaches the
 * database. Exporting both from one file pulls the Postgres driver into the
 * browser bundle and fails the build.
 */
export async function getWorkflowLimit(orgId: string): Promise<WorkflowLimit> {
  const entitlement = await getEntitlement(orgId)
  const limit = entitlement.plan.limits.workflows

  // Unlimited plans never render a usage count, so skip the query entirely.
  if (limit === null) {
    return {
      limit: null,
      used: 0,
      canCreate: true,
      planName: entitlement.plan.name,
      isPro: entitlement.isPro,
    }
  }

  const used = await countWorkflows(orgId)

  return {
    limit,
    used,
    canCreate: used < limit,
    planName: entitlement.plan.name,
    isPro: entitlement.isPro,
  }
}
