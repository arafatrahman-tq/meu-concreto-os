import { eq } from 'drizzle-orm'
import { transactions } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid ID' })

  try {
    const transaction = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
      with: {
        sale: true,
        user: true,
        company: true
      }
    })

    if (!transaction) {
      throw createError({ statusCode: 404, statusMessage: 'Transaction not found' })
    }

    await requireCompanyAccess(event, transaction.companyId)

    return { transaction }
  } catch (e: any) {
    console.error('Get Transaction Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
