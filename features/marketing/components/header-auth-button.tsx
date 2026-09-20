"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

/**
 * Sends a signed-in visitor into the product and everyone else to sign-in.
 *
 * Deliberately a client component reading `useAuth` rather than the server's
 * `auth()`. Calling `auth()` anywhere in the marketing tree opts the landing
 * page and every documentation page out of static rendering, and a marketing
 * page that cannot be prerendered is a bad trade for one button.
 *
 * Renders the signed-out label until Clerk has loaded, which is the correct
 * guess for a first-time visitor and costs a signed-in one a brief swap.
 */
export function HeaderAuthButton() {
  const { isLoaded, isSignedIn } = useAuth()

  const signedIn = isLoaded && isSignedIn

  return (
    <Button asChild size="sm">
      {signedIn ? (
        <Link href="/workflows">Dashboard</Link>
      ) : (
        <Link href="/sign-in">Sign in</Link>
      )}
    </Button>
  )
}
