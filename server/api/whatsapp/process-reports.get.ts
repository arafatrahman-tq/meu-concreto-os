import { db } from '../../utils/db'
import { sales, quotes, transactions, companies, whatsappSettings } from '../../database/schema'
import { eq, and, gte, inArray } from 'drizzle-orm'
import { getWhatsappConfig, sendWhatsappMessage, buildReportMessage } from '../../utils/whatsapp'

export default defineEventHandler(async (_event) => {
  // Cron-only endpoint — no user auth required (relies on firewall / secret route).
  // Configure in Coolify Scheduled Tasks to run once per day at the desired hour.
  // Schedule logic:
  //   daily   → sends every day
  //   weekly  → sends only on Mondays (dayOfWeek === 1)
  //   monthly → sends only on the 1st of the month

  const results: Array<{ companyId: number, ok: boolean, reason?: string }> = []

  try {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday
    const dayOfMonth = now.getDate() // 1–31

    // 1. Fetch all companies with reports enabled
    const settings = await db
      .select()
      .from(whatsappSettings)
      .where(eq(whatsappSettings.reportsEnabled, true))
      .all()

    for (const setting of settings) {
      const companyId = setting.companyId
      const schedule = setting.reportSchedule ?? 'daily'

      // 2. Check if today is the right day to send for this schedule
      if (schedule === 'weekly' && dayOfWeek !== 1) {
        results.push({ companyId, ok: false, reason: 'not Monday — skipping weekly report' })
        continue
      }
      if (schedule === 'monthly' && dayOfMonth !== 1) {
        results.push({ companyId, ok: false, reason: 'not 1st of month — skipping monthly report' })
        continue
      }

      // 3. Verify WhatsApp is connected
      const config = await getWhatsappConfig(companyId)
      if (!config?.isConnected || !config.phoneNumber) {
        console.warn(`[Reports] Skipping company ${companyId}: WA not connected or no phone number.`)
        results.push({ companyId, ok: false, reason: 'WA not connected' })
        continue
      }

      // 4. Check recipients
      const recipients = (config.reportRecipients as string[]) ?? []
      if (recipients.length === 0) {
        console.warn(`[Reports] Skipping company ${companyId}: no report recipients configured.`)
        results.push({ companyId, ok: false, reason: 'no recipients' })
        continue
      }

      // 5. Compute date range for the report period
      const startDate = new Date(now)
      if (schedule === 'weekly') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (schedule === 'monthly') {
        startDate.setDate(startDate.getDate() - 30)
      }
      startDate.setHours(0, 0, 0, 0)

      try {
        // 6. Fetch data — matching the same filters as report.post.ts and the frontend KPIs

        // Sales in period — confirmed/in_progress/completed only
        const salesRows = await db
          .select()
          .from(sales)
          .where(and(
            eq(sales.companyId, companyId),
            gte(sales.date, startDate),
            inArray(sales.status, ['completed', 'confirmed', 'in_progress'])
          ))

        const salesTotal = salesRows.reduce((acc, s) => acc + s.total, 0)
        const salesCount = salesRows.length

        // Sent quotes awaiting response (no date filter — current outstanding)
        const quotesRows = await db
          .select()
          .from(quotes)
          .where(and(
            eq(quotes.companyId, companyId),
            eq(quotes.status, 'sent')
          ))

        const pendingQuotes = quotesRows.length
        const pendingQuotesTotal = quotesRows.reduce((acc, q) => acc + q.total, 0)

        // Transactions in period — paid only
        const txRows = await db
          .select()
          .from(transactions)
          .where(and(
            eq(transactions.companyId, companyId),
            gte(transactions.date, startDate),
            eq(transactions.status, 'paid')
          ))

        const incomeTotal = txRows.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
        const expenseTotal = txRows.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)

        // Company name
        const companyRow = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, companyId))
          .get()
        const companyName = companyRow?.name ?? 'Meu Concreto'

        // 7. Build and send message
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

        const sendResult = await sendWhatsappMessage(
          { apiUrl: config.apiUrl, apiKey: config.apiKey, phoneNumber: config.phoneNumber },
          recipients,
          text
        )

        results.push({
          companyId,
          ok: sendResult.sent.length > 0,
          reason: sendResult.sent.length > 0
            ? `sent to ${sendResult.sent.length} recipient(s)`
            : `failed — ${sendResult.failed.length} recipient(s) not reached`
        })
      } catch (err: unknown) {
        console.error(`[Reports] Error processing company ${companyId}:`, err)
        results.push({ companyId, ok: false, reason: err instanceof Error ? err.message : String(err) })
      }
    }

    return {
      success: true,
      processed: results.filter(r => r.ok).length,
      skipped: results.filter(r => !r.ok).length,
      details: results
    }
  } catch (err: unknown) {
    console.error('[Reports] Global task error:', err)
    throw createError({
      statusCode: 500,
      message: 'Error processing reports',
      data: { message: err instanceof Error ? err.message : String(err) }
    })
  }
})
