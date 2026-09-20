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
