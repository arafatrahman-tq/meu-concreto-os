import { eq, and } from 'drizzle-orm'
import { companies, userCompanies } from '../../database/schema'
import { db } from '../../utils/db'
import { getAuthSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code, pin } = body

  if (!code || !pin) {
    throw createError({
      statusCode: 400,
      message: 'Código e PIN são obrigatórios'
    })
  }

  const company = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.quickAccessCode, code),
        eq(companies.quickAccessEnabled, true)
      )
    )
    .get()

  if (!company) {
    throw createError({
      statusCode: 401,
      message: 'Empresa não encontrada ou acesso desativado'
    })
  }

  if (company.quickAccessPin !== pin) {
    throw createError({
      statusCode: 401,
      message: 'PIN inválido'
    })
  }

  // Find a user for the schedule attribute (usually the first admin or manager)
  const firstUser = await db
    .select()
    .from(userCompanies)
    .where(eq(userCompanies.companyId, company.id))
    .get()

  if (!firstUser) {
    // Isso não deveria acontecer para empresas ativas, mas vamos ser prevenidos
    throw createError({
      statusCode: 500,
      message: 'Não foi possível encontrar um usuário para esta empresa.'
    })
  }

  const session = await getAuthSession(event)
  await session.update({
    userId: firstUser.userId,
    authorizedCompanyIds: [company.id],
    role: 'Vendedor', // Virtual role for mobile access
    isQuickAccess: true
  })

  // We return a mock user or the first user data to the client so setUser() works
  return {
    ok: true,
    user: {
      id: firstUser.userId,
      name: 'Vendedor Mobile',
      email: 'mobile@' + company.quickAccessCode + '.com',
      role: 'Vendedor',
      companyId: company.id
    },
    companies: [
      {
        id: company.id,
        name: company.name,
        role: 'Vendedor'
      }
    ]
  }
})
