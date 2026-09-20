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

const selfHostFeatures = [
  "Open source under AGPL-3.0",
  "Docker Compose quickstart",
  "Your own API keys and your own data",
  "Community support",
]

/**
 * Where an unsubscribed organization lands. Two doors, deliberately weighted
 * the same: pay us to run it, or run it yourself.
 */
export default async function UpgradePage() {
  const { orgId, has } = await auth()

  if (!orgId) redirect("/choose-organization")

  const { isPro } = await getEntitlement(orgId)

  // Already subscribed: nothing to sell here.
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

        <div className="grid items-start gap-6 md:grid-cols-2">
          <PlanCard
            plan={plans.pro}
            isCurrent={false}
            canManage={has({ role: "org:admin" })}
          />

          <Card className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Self-host</CardTitle>
              <CardDescription>
                Run it on your own infrastructure. Every feature, no limits, no
                subscription.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="flex flex-col gap-2">
                {selfHostFeatures.map((feature) => (
                  <li key={feature} className="text-sm text-muted-foreground">
                    {feature}
                  </li>
                ))}
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
