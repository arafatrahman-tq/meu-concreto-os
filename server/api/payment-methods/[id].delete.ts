import { paymentMethods } from '../../database/schema'
import { db } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { requireCompanyAccess, requireManager } from '../../utils/session'
import { createNotification } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })
  const paymentMethodId = parseInt(id)

  try {
    const payment = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, paymentMethodId))
      .get()

    if (!payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment Method not found'
      })
    }

    requireCompanyAccess(event, payment.companyId)
    requireManager(event) // Restrict deletion to managers/admins

    await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, paymentMethodId))
      .returning()

    if (payment) {
      await createNotification({
        companyId: payment.companyId,
        type: 'transaction',
        title: 'Forma de pagamento excluída',
        body: `${payment.name} foi removida`,
        link: '/formas-de-pagamento',
        icon: 'i-heroicons-trash'
      })
    }

    return { success: true, id: paymentMethodId }
  } catch (e: any) {
    console.error('Delete Payment Method Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
