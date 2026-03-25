import { eq } from 'drizzle-orm'
import { users } from '#server/database/schema'
import { db } from '#server/utils/db'
import { requireCompanyAccess } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, parseInt(id)))
    .get()

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Security: Admin can see everyone. Users can see themselves OR users from their company.
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  if (auth.role !== 'admin' && auth.userId !== user.id) {
    if (user.companyId) {
      requireCompanyAccess(event, user.companyId)
    } else {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  return { user }
})
