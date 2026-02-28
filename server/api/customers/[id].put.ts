import { and, eq } from 'drizzle-orm'
import { companies } from '../../database/schema'
import { db } from '../../utils/db'
import { z } from 'zod'
import { requireCompanyAccess } from '../../utils/session'

const customerUpdateSchema = z.object({
    name: z.string().min(2).optional(),
    document: z.string().optional().transform(val => val?.replace(/\D/g, '')),
    phone: z.string().optional().transform(val => val?.replace(/\D/g, '')),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2).optional(),
    zip: z.string().optional().transform(val => val?.replace(/\D/g, '')),
    active: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, message: 'ID required' })
    const customerId = parseInt(id)

    const body = await readBody(event)
    const result = customerUpdateSchema.safeParse(body)

    if (!result.success) {
        throw createError({ statusCode: 400, message: 'Validation Error', data: result.error.flatten() })
    }

    // 1. Fetch current to check ownership
    const existing = await db
        .select()
        .from(companies)
        .where(and(eq(companies.id, customerId), eq(companies.isCustomer, true)))
        .get()

    if (!existing) {
        throw createError({ statusCode: 404, message: 'Customer not found' })
    }

    if (existing.ownerCompanyId) {
        requireCompanyAccess(event, existing.ownerCompanyId)
    }

    // 2. Update
    const updated = await db
        .update(companies)
        .set({
            ...result.data,
            updatedAt: new Date()
        })
        .where(eq(companies.id, customerId))
        .returning()
        .get()

    return { customer: updated }
})
