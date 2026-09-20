export type WorkflowLimit = {
  /** Workflows the plan allows, or `null` when unlimited. */
  limit: number | null
  used: number
  canCreate: boolean
  planName: string
  isPro: boolean
}

export function workflowLimitMessage(limit: WorkflowLimit) {
  return `The ${limit.planName} plan is limited to ${limit.limit} workflows. Upgrade to Pro to create more.`
}
