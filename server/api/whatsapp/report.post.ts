import { getWhatsappConfig, sendWhatsappMessage, buildReportMessage } from '../../utils/whatsapp'
import { db } from '../../utils/db'
import { sales, quotes, transactions, companies } from '../../database/schema'
import { eq, and, gte, inArray } from 'drizzle-orm'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = Number(query.companyId)
  if (!companyId) throw createError({ statusCode: 400, message: 'companyId required' })

  // Security check: Verify user has access to this company
  await requireCompanyAccess(event, companyId)

  const config = await getWhatsappConfig(companyId)
  if (!config) throw createError({ statusCode: 404, message: 'WhatsApp não configurado.' })
  if (!config.reportsEnabled) throw createError({ statusCode: 400, message: 'Relatórios automáticos não estão habilitados.' })
  if (!config.phoneNumber) throw createError({ statusCode: 400, message: 'Número de WhatsApp não configurado.' })

  const recipients = (config.reportRecipients as string[]) ?? []
  if (recipients.length === 0) {
    throw createError({ statusCode: 400, message: 'Nenhum destinatário de relatório configurado.' })
  }

  // ── Determine report date range based on schedule
  const schedule = config.reportSchedule ?? 'daily'
  const startDate = new Date()
  if (schedule === 'weekly') {
    startDate.setDate(startDate.getDate() - 7)
  } else if (schedule === 'monthly') {
    startDate.setDate(startDate.getDate() - 30)
  }
  startDate.setHours(0, 0, 0, 0)

  // Sales in period — exclude cancelled/pending to match frontend KPI
  const salesRows = await db
    .select()
    .from(sales)
    .where(and(
      eq(sales.companyId, companyId),
      gte(sales.date, startDate),
      inArray(sales.status, ['completed', 'confirmed', 'in_progress'])
    ))

  const salesTotal = salesRows.reduce((acc: number, s) => acc + s.total, 0)
  const salesCount = salesRows.length

  // Sent quotes awaiting response (current outstanding, no date filter)
  const quotesRows = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.companyId, companyId), eq(quotes.status, 'sent')))

  const pendingQuotes = quotesRows.length
  const pendingQuotesTotal = quotesRows.reduce((acc: number, q) => acc + q.total, 0)

  // Transactions in period — only paid, to match frontend KPI
  const txRows = await db
    .select()
    .from(transactions)
    .where(and(
      eq(transactions.companyId, companyId),
      gte(transactions.date, startDate),
      eq(transactions.status, 'paid')
    ))

  const incomeTotal = txRows.filter(t => t.type === 'income').reduce((acc: number, t) => acc + t.amount, 0)
  const expenseTotal = txRows.filter(t => t.type === 'expense').reduce((acc: number, t) => acc + t.amount, 0)

  // Fetch company name from DB
  const companyRow = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .get()
  const companyName = companyRow?.name ?? 'Meu Concreto'

  const text = buildReportMessage({
    companyName,
    schedule,
    salesTotal,
    salesCount,
    pendingQuotes,
    pendingQuotesTotal,
    incomeTotal,
    expenseTotal
  })

  const result = await sendWhatsappMessage(config, recipients, text)

  return {
    ok: result.sent.length > 0,
    sent: result.sent,
    failed: result.failed,
    message: result.sent.length > 0
      ? `Relatório enviado para ${result.sent.length} destinatário(s).`
      : 'Falha ao enviar relatório.'
  }
})
