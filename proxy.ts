import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// `/` and `/docs` are the public marketing surface, so they are absent here.
const isProtectedRoute = createRouteMatcher([
  "/workflows(.*)",
  "/billing(.*)",
  "/upgrade(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
