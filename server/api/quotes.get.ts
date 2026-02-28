import { db } from '../utils/db'
import { requireAdmin, requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined
  const status = query.status as
    | 'draft'
    | 'sent'
    | 'approved'
    | 'rejected'
    | 'expired'
  const startDate = query.startDate
    ? new Date(query.startDate as string)
    : undefined
  const endDate = query.endDate
    ? new Date(query.endDate as string)
    : undefined

  if (companyId) {
    requireCompanyAccess(event, companyId)
    return {
      quotes: await db.query.quotes.findMany({
        where: (quotes, { eq, and, gte, lte }) => {
          const conds = [eq(quotes.companyId, companyId)]
          if (status) conds.push(eq(quotes.status, status))
          if (startDate) conds.push(gte(quotes.createdAt, startDate))
          if (endDate) conds.push(lte(quotes.createdAt, endDate))
          return and(...conds)
        },
        with: {
          items: true
        },
        orderBy: (quotes, { desc }) => [desc(quotes.createdAt)]
      })
    }
  }

  // Admin access required for cross-company quote listing
  requireAdmin(event)
  return {
    quotes: await db.query.quotes.findMany({
      orderBy: (quotes, { desc }) => [desc(quotes.createdAt)]
    })
  }
})
