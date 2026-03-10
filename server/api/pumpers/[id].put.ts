import { eq } from 'drizzle-orm'
import { pumpers } from '#server/database/schema'
import { pumperUpdateSchema } from '#server/utils/schemas'
import { db } from '#server/utils/db'
import { requireCompanyAccess } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })
  const pumperId = parseInt(id)

  const body = await readBody(event)
  const result = pumperUpdateSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: result.error.flatten()
    })
  }

  const existing = await db
    .select()
    .from(pumpers)
    .where(eq(pumpers.id, pumperId))
    .get()
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Pumper not found' })

  await requireCompanyAccess(event, existing.companyId)

  try {
    const [updated] = await db
      .update(pumpers)
      .set(result.data)
      .where(eq(pumpers.id, pumperId))
      .returning()
    if (!updated)
      throw createError({ statusCode: 404, statusMessage: 'Pumper not found' })
    return { pumper: updated }
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode) throw e
    console.error('Update Pumper Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor',
      data: { message: e instanceof Error ? e.message : 'Erro desconhecido' }
    })
  }
})
