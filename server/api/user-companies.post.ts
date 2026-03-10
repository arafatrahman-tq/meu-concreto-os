import { eq } from 'drizzle-orm'
import { userCompanies, users } from '#server/database/schema'
import { userCompanySchema } from '#server/utils/schemas'
import { db } from '#server/utils/db'
import { createNotification } from '#server/utils/notifications'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = userCompanySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Falha na validação',
      data: result.error.flatten()
    })
  }

  const { userId, companyId, role } = result.data

  try {
    const [entry] = await db
      .insert(userCompanies)
      .values({
        userId,
        companyId,
        role: role as 'admin' | 'user' | 'manager',
        createdAt: new Date()
      })
      .returning()

    // Notification
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get()
    if (user) {
      await createNotification({
        companyId,
        type: 'user',
        title: 'Usuário vinculado à empresa',
        body: `${user.name} foi adicionado como ${role}`,
        link: '/usuarios',
        icon: 'i-heroicons-user-plus'
      })
    }

    return { entry }
  } catch (e: any) {
    if (
      e.message?.includes('UNIQUE constraint')
      || e.message?.includes('constraint failed')
    ) {
      throw createError({
        statusCode: 409,
        message: 'O usuário já pertence a esta empresa',
        data: { message: 'Entrada duplicada' }
      })
    }
    throw createError({
      statusCode: 500,
      message: 'Erro interno do servidor'
    })
  }
})
