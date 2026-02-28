import { eq } from 'drizzle-orm'
import { quotes } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const quoteId = parseInt(id)

  const existing = await db.select({ companyId: quotes.companyId })
    .from(quotes).where(eq(quotes.id, quoteId)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Quote not found' })
  requireCompanyAccess(event, existing.companyId)

  try {
    const deletedQuote = await db.delete(quotes)
      .where(eq(quotes.id, quoteId))
      .returning()
      .get()

    if (!deletedQuote) {
      throw createError({ statusCode: 404, statusMessage: 'Quote not found' })
    }

    return { message: 'Quote deleted successfully', quote: deletedQuote }
  } catch (e: unknown) {
    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e instanceof Error ? e.message : 'Unknown error' }
    })
  }
})
