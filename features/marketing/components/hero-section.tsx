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
        extract structured data. Press Run and watch every step happen, with a
        full session replay when it finishes.
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
      <p className="mt-6 text-sm text-muted-foreground">
        Open source under AGPL-3.0. Host it yourself, or let us run it.
      </p>
    </section>
  )
}
