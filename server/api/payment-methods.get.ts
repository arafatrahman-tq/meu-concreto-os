import { eq, and, desc } from 'drizzle-orm'
import { paymentMethods } from '../database/schema'
import { db } from '../utils/db'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined
  const activeOnly = query.active === 'true'

  if (!companyId) {
    throw createError({ statusCode: 400, message: 'O ID da empresa é obrigatório' })
  }

  // Auditing: Ensure user belongs to company
  requireCompanyAccess(event, companyId)

  try {
    const conditions = [eq(paymentMethods.companyId, companyId)]

    if (activeOnly) {
      conditions.push(eq(paymentMethods.active, true))
    }

    const result = await db
      .select()
      .from(paymentMethods)
      .where(and(...conditions))
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt))
      .all()

    return { paymentMethods: result }
  } catch (e: any) {
    console.error('Get Payment Methods Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Erro interno do servidor',
      data: { message: e.message }
    })
  }
})
