import Link from "next/link"
import { CheckIcon } from "lucide-react"

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

function FeatureList({ features }: { features: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {features.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-2 text-sm text-muted-foreground"
        >
          <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-foreground" />
          {feature}
        </li>
      ))}
    </ul>
  )
}

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-14 border-t bg-muted/30">
      <div className="mx-auto w-full max-w-4xl px-6 py-24">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Pricing</h2>
          <p className="text-muted-foreground">
            Pay us to run it, or run it yourself for nothing. Same features
            either way.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-6 md:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Hosted</CardTitle>
              <CardDescription>{plans.pro.description}</CardDescription>
              <p className="flex items-baseline gap-1.5 pt-2">
                <span className="text-3xl font-semibold tracking-tight">
                  {plans.pro.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plans.pro.interval}
                </span>
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <FeatureList features={plans.pro.features} />
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Self-hosted</CardTitle>
              <CardDescription>
                Run the same application on your own infrastructure.
              </CardDescription>
              <p className="flex items-baseline gap-1.5 pt-2">
                <span className="text-3xl font-semibold tracking-tight">
                  Free
                </span>
                <span className="text-sm text-muted-foreground">forever</span>
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <FeatureList features={selfHostFeatures} />
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
