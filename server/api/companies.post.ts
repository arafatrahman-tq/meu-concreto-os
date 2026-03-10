import { companies } from '../database/schema'
import { companySchema } from '../utils/schemas'
import { db } from '../utils/db'
import { requireAdmin } from '../utils/session'
import { createNotification } from '../utils/notifications'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)

  // Validate input
  const result = companySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Falha na validação',
      data: result.error.flatten()
    })
  }

  try {
    const newCompany = await db
      .insert(companies)
      .values({
        ...result.data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()
      .get()

    if (newCompany) {
      await createNotification({
        companyId: newCompany.id,
        type: 'system',
        title: 'Bem-vindo ao Meu Concreto',
        body: `A empresa ${newCompany.name} foi criada com sucesso`,
        link: '/configuracoes',
        icon: 'i-heroicons-building-office'
      })
    }

    return {
      company: newCompany
    }
  } catch (e: any) {
    // Check for unique constraint violation
    if (
      e.cause?.code === 'SQLITE_CONSTRAINT'
      || e.message?.includes('UNIQUE constraint failed')
      || e.message?.includes('constraint failed')
    ) {
      throw createError({
        statusCode: 409,
        message: 'Company already exists (document)',
        data: { message: 'Document (CNPJ) already in use' }
      })
    }

    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Erro interno do servidor',
      data: { message: e.message }
    })
  }
})
