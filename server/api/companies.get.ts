import { eq, and, or } from 'drizzle-orm'
import { companies } from '../database/schema'
import { db } from '../utils/db'
import { requireAdmin, requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId ? parseInt(query.companyId as string) : undefined

  if (companyId) {
    // Called from quotes/sales/customers pages to list the relevant company context.
    // Verify user has access to this company.
    requireCompanyAccess(event, companyId)

    // Security Hardening: Only return the company itself or its customer-records.
    // This prevents one tenant from seeing other tenants listed.
    const results = await db
      .select()
      .from(companies)
      .where(
        or(
          eq(companies.id, companyId), // The tenant company itself
          and(
            eq(companies.isCustomer, true),
            eq(companies.ownerCompanyId, companyId)
          )
        )
      )
      .all()

    return { companies: results }
  }

  // Called from Global Admin panel - only real tenant companies.
  requireAdmin(event)
  const allCompanies = await db
    .select()
    .from(companies)
    .where(eq(companies.isCustomer, false))
    .all()
  return { companies: allCompanies }
})
