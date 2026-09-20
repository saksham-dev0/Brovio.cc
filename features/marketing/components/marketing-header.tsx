import Image from "next/image"
import Link from "next/link"

import { HeaderAuthButton } from "@/features/marketing/components/header-auth-button"
import { REPO_URL } from "@/lib/deployment"
import { Button } from "@/components/ui/button"

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Image
            src="/Logo.png"
            alt=""
            width={500}
            height={500}
            priority
            className="size-7 rounded-md"
          />
          Brovio.cc
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/#how-it-works">How it works</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/#pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/docs">Docs</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </Button>
          {/*
            A signed-in visitor reaching the landing page — bookmark, logo
            click, or a stale tab — has no gate to move them along, so the
            header has to offer the way in.
          */}
          <HeaderAuthButton />
        </nav>
      </div>
    </header>
  )
}
