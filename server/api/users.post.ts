import { users, userAuth, userCompanies } from '../database/schema'
import { userSchema } from '../utils/schemas'
import { db } from '../utils/db'
import bcrypt from 'bcryptjs'
import { createNotification } from '../utils/notifications'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Validate input
  const result = userSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Falha na validação',
      data: result.error.flatten()
    })
  }

  const {
    name,
    email,
    document,
    phone,
    role,
    active,
    password,
    hwid,
    companyId,
    defaultCompanyId
  } = result.data

  // Security: Admin can create anyone. Managers can only create users FOR their company.
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: 'Não autorizado' })

  if (auth.role !== 'admin') {
    if (!companyId) {
      throw createError({
        statusCode: 403,
        message: 'Apenas administradores podem criar usuários globais'
      })
    }
    requireCompanyAccess(event, companyId)
  }

  try {
    // Start transaction to ensure both user and auth records are created or neither
    const newUser = await db.transaction(async (tx) => {
      // 1. Create User
      const [createdUser] = await tx
        .insert(users)
        .values({
          companyId,
          defaultCompanyId,
          name,
          email,
          document,
          phone,
          role,
          active,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning()

      if (!createdUser) throw new Error('Falha ao criar usuário')

      // 2. Hash Password (bcryptjs)
      const passwordHash = await bcrypt.hash(password, 10)

      // 3. Create Auth Record
      await tx.insert(userAuth).values({
        userId: createdUser.id,
        passwordHash,
        hwid,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // 4. Add to user_companies junction (multi-tenant)
      if (companyId) {
        await tx.insert(userCompanies).values({
          userId: createdUser.id,
          companyId,
          role: role as 'admin' | 'user' | 'manager',
          createdAt: new Date()
        })
      }

      return createdUser
    })

    // Notification trigger
    if (companyId) {
      await createNotification({
        companyId,
        type: 'user',
        title: 'Novo usuário cadastrado',
        body: `${newUser.name} (${newUser.email}) — perfil: ${newUser.role}`,
        link: '/usuarios',
        icon: 'i-heroicons-user-plus'
      })
    }

    return {
      user: newUser
    }
  } catch (e: any) {
    // Check for unique constraint violation (LibSQL/Drizzle wrapper)
    if (
      e.cause?.code === 'SQLITE_CONSTRAINT'
      || e.message?.includes('UNIQUE constraint failed')
      || e.message?.includes('constraint failed')
    ) {
      throw createError({
        statusCode: 409,
        message: 'Usuário já existe (e-mail ou documento)',
        data: { message: 'E-mail ou CPF/CNPJ já está em uso' }
      })
    }

    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Erro interno do servidor',
      data: { message: e.message, stack: e.stack }
    })
  }
})
