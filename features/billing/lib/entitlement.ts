import { getSubscription } from "@/features/billing/data"
import { getPlan, plans, type Plan } from "@/features/billing/plans"
import { isSelfHosted } from "@/lib/deployment"
import type { Subscription } from "@/lib/db/schema"

/**
 * Statuses that still grant paid access. `past_due` is a grace window Dodo is
 * still retrying, so access holds; `on_hold`, `paused`, `cancelled`, `failed`,
 * and `expired` do not.
 */
const ENTITLED_STATUSES = new Set(["active", "past_due"])

export type Entitlement = {
  plan: Plan
  isPro: boolean
  /** Dodo's status, or null when the org never subscribed. */
  status: Subscription["status"] | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  /** Paid subscription that needs the customer's attention to stay active. */
  needsAttention: boolean
}

const FREE_ENTITLEMENT: Entitlement = {
  plan: plans.free,
  isPro: false,
  status: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  needsAttention: false,
}

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

export function toEntitlement(subscription?: Subscription): Entitlement {
  if (!subscription) return FREE_ENTITLEMENT

  const isPro = ENTITLED_STATUSES.has(subscription.status)

  return {
    plan: isPro ? getPlan(subscription.planId) : plans.free,
    isPro,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    needsAttention:
      subscription.status === "past_due" || subscription.status === "on_hold",
  }
}

/**
 * The single place that answers "what is this org allowed to do?". Feature
 * gates should call this rather than reading the subscription row directly.
 */
export async function getEntitlement(orgId: string): Promise<Entitlement> {
  if (isSelfHosted) return SELF_HOSTED_ENTITLEMENT

  return toEntitlement(await getSubscription(orgId))
}
