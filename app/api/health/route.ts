/**
 * Liveness probe for the container runtime.
 *
 * Deliberately does not touch the database. This answers "is the server
 * process up?", and a restart is the right response to that being false. A
 * database blip is not something restarting the application fixes, so checking
 * it here would turn a brief outage into a restart loop.
 */
export const dynamic = "force-dynamic"

export function GET() {
  return Response.json({ status: "ok" })
}
