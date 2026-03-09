import { eq, desc, and, gte, lte } from 'drizzle-orm'
import { schedules } from '../database/schema'
import { db } from '../utils/db'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId ? parseInt(query.companyId as string) : undefined
  const status = query.status as string
  const startDate = query.startDate as string
  const endDate = query.endDate as string

  if (!companyId) {
    throw createError({
      statusCode: 400,
      message: 'Company ID is required'
    })
  }

  // Security check: Verify user has access to this company
  requireCompanyAccess(event, companyId)

  try {
    const conditions = [eq(schedules.companyId, companyId)]

    if (status) {
      conditions.push(eq(schedules.status, status as any))
    }

    if (startDate) {
      conditions.push(gte(schedules.date, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(schedules.date, new Date(endDate)))
    }

    const allSchedules = await db.query.schedules.findMany({
      where: and(...conditions),
      orderBy: [desc(schedules.date), desc(schedules.startTime)],
      with: {
        user: {
          columns: {
            name: true,
            email: true
          }
        },
        sale: true
      }
    })

    return { schedules: allSchedules }
  } catch (e: any) {
    console.error('Get Schedules Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
