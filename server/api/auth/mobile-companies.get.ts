import { eq, and } from 'drizzle-orm'
import { companies } from '../../database/schema'
import { db } from '../../utils/db'

export default defineEventHandler(async () => {
  // Public endpoint used by /mobile login page to show available companies
  const results = await db
    .select({
      id: companies.id,
      name: companies.name,
      code: companies.quickAccessCode
    })
    .from(companies)
    .where(and(eq(companies.quickAccessEnabled, true)))
    .all()

  // Filter out any without codes
  return results.filter(c => c.code)
})
