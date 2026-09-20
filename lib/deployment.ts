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
