import { neon } from "@neondatabase/serverless"
import {
  drizzle as drizzleNeon,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http"
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

/**
 * Deliberately the Neon HTTP type rather than a union with the node-postgres
 * one. A union makes Drizzle's builders resolve to an overload intersection and
 * breaks ordinary calls like `.returning()` at every call site.
 *
 * Typing to Neon's driver also pins the codebase to the smaller capability set
 * of the two — notably no interactive transactions — so nothing can be written
 * that works self-hosted and then fails on the hosted deployment.
 */
type Database = NeonHttpDatabase<typeof schema>

let instance: Database | undefined

/**
 * Built on first query, not at import. Next evaluates every server module while
 * collecting page data at build time, and a build machine has no reason to hold
 * a working `DATABASE_URL` — connecting eagerly turns a missing or malformed
 * value into a build failure instead of a runtime one.
 */
function getDb(): Database {
  if (instance) return instance

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  // Neon's driver is pooled HTTP: one round trip per query, no socket to keep
  // alive, which suits per-request serverless invocations. It can only talk to
  // Neon's endpoint though, so a self-hosted installation pointing at its own
  // Postgres gets an ordinary TCP pool instead.
  if (connectionString.includes("neon.tech")) {
    instance = drizzleNeon(neon(connectionString), { schema })
  } else {
    // The one place the two drivers meet. Both expose the same query builder
    // for everything this application does; the assertion narrows node-postgres
    // to the Neon-shaped subset declared above, which is the subset in use.
    instance = drizzleNode(new Pool({ connectionString }), {
      schema,
    }) as unknown as Database
  }

  return instance
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDb()
    const value = Reflect.get(database, property)

    // Drizzle's builders read `this`, so hand back a bound method rather than a
    // detached function.
    return typeof value === "function" ? value.bind(database) : value
  },
})

export * from "./schema"
