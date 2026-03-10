import { drizzle } from 'drizzle-orm/libsql'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from '../database/schema'

// Lazy initialization: createClient() is deferred until the first DB access.
// Calling it at module load time causes `nuxt build` to hang because the
// libsql client opens a persistent handle that keeps the event loop alive
// even after the build finishes.
let _client: ReturnType<typeof createClient> | undefined
let _db: LibSQLDatabase<typeof schema> | undefined

function getDb(): LibSQLDatabase<typeof schema> {
  if (!_db) {
    _client = createClient({
      url: process.env.DB_FILE_NAME || 'file:local.db'
    })
    _db = drizzle(_client, { schema })
  }
  return _db
}

// Proxy keeps the `db` export API identical — all consumers continue to work
// without any changes.
export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  }
})

/**
 * Parse a date-only string ("YYYY-MM-DD") as noon UTC so the stored timestamp
 * displays as the correct local calendar date in any timezone (UTC±12).
 * Without this, `new Date("YYYY-MM-DD")` is treated as UTC midnight, which in
 * Brazil (UTC-3) arrives as 21:00 of the *previous* day.
 * Also accepts an existing Date object or null/undefined (pass-through).
 */
export function parseDate(
  value: string | Date | null | undefined
): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  // If already a full ISO string (contains 'T'), let the runtime handle it.
  if (value.includes('T')) return new Date(value)
  return new Date(`${value}T12:00:00Z`)
}
