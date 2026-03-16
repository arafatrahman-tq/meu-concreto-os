import { eq } from 'drizzle-orm'
import { users, userCompanies, companies } from '../../database/schema'
import { db } from '../../utils/db'

// GET /api/auth/me - Retorna dados atualizados do usuário logado e suas empresas
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  
  if (!auth) {
    throw createError({
      statusCode: 401,
      message: 'Não autorizado. Por favor, faça login.'
    })
  }
  
  const userId = auth.userId

  // Busca dados atualizados do usuário
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuário não encontrado'
    })
  }

  // Busca todas as empresas do usuário
  const userCompanyList = await db
    .select({
      id: companies.id,
      name: companies.name,
      role: userCompanies.role
    })
    .from(userCompanies)
    .innerJoin(companies, eq(userCompanies.companyId, companies.id))
    .where(eq(userCompanies.userId, userId))
    .all()

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      defaultCompanyId: user.defaultCompanyId
    },
    companies: userCompanyList
  }
})
