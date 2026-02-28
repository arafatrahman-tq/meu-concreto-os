import { eq } from 'drizzle-orm'
import { sales, transactions } from '../../../database/schema'
import { db } from '../../../utils/db'
import { requireCompanyAccess } from '../../../utils/session'
import { createNotification } from '../../../utils/notifications'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })
  const saleId = parseInt(id)

  const body = await readBody(event)
  const { paymentMethod, status: transStatus = 'paid' } = body

  const sale = await db.select().from(sales).where(eq(sales.id, saleId)).get()

  if (!sale)
    throw createError({ statusCode: 404, statusMessage: 'Sale not found' })

  // Security check: Verify user has access to this company
  requireCompanyAccess(event, sale.companyId)

  // Guard: Cannot bill a cancelled sale
  if (sale.status === 'cancelled') {
    throw createError({
      statusCode: 422,
      statusMessage: 'Não é possível faturar uma venda cancelada.'
    })
  }

  // Guard: Prevent double-billing — check if a transaction already exists for this sale
  const existingTransaction = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.saleId, saleId))
    .get()

  if (existingTransaction) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Esta venda já foi faturada. Não é possível faturar novamente.'
    })
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Create Transaction
      const desc = `Faturamento Venda #${String(sale.id).padStart(4, '0')} — ${sale.customerName}`
      const pMethod = paymentMethod || sale.paymentMethod || 'Não definido'

      const newTransaction = await tx
        .insert(transactions)
        .values({
          companyId: sale.companyId,
          userId: event.context.auth?.userId,
          saleId: sale.id,
          description: desc,
          amount: sale.total,
          type: 'income',
          category: 'Vendas',
          status: transStatus,
          date: new Date(),
          paymentMethod: pMethod
        })
        .returning()
        .get()

      // 2. Update Sale Status?
      // User says "Ao confirmar uma venda o status não é alterado",
      // but "Faturar" is a separate concept.
      // Usually faturar implies the sale is progressing.
      // Let's mark it as 'completed' or 'confirmed' if it was pending.
      let nextStatus = sale.status
      if (sale.status === 'pending') {
        nextStatus = 'confirmed'
      }

      await tx
        .update(sales)
        .set({
          status: nextStatus,
          paymentMethod: pMethod,
          updatedAt: new Date()
        })
        .where(eq(sales.id, sale.id))

      return { transaction: newTransaction, nextStatus }
    })

    // Notification trigger
    const tAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(sale.total / 100)
    await createNotification({
      companyId: sale.companyId,
      type: 'transaction',
      title: `Venda Faturada — Receita`,
      body: `Venda #${String(sale.id).padStart(4, '0')} — ${tAmount}`,
      link: '/transacoes',
      icon: 'i-heroicons-banknotes'
    })

    return result
  } catch (e: any) {
    console.error('Bill Sale Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
