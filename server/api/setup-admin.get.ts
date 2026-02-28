import { eq } from 'drizzle-orm'
import { users, companies, userAuth } from '../database/schema'
import { db } from '../utils/db'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async () => {
  // Check if company exists
  let company = await db.query.companies.findFirst({
    where: eq(companies.document, '00000000000000')
  })

  if (!company) {
    const [newCompany] = await db.insert(companies).values({
      name: 'Meu Concreto Demo',
      document: '00000000000000',
      email: 'contact@meuconcreto.com',
      active: true
    }).returning()
    company = newCompany
  }

  if (!company) throw createError({ statusCode: 500, message: 'Failed to ensure company exists' })

  // Check if admin user exists
  let admin = await db.query.users.findFirst({
    where: eq(users.email, 'admin@meuconcreto.com')
  })

  if (!admin) {
    const [newAdmin] = await db.insert(users).values({
      companyId: company.id,
      name: 'Admin User',
      email: 'admin@meuconcreto.com',
      document: '00000000000',
      role: 'admin',
      active: true
    }).returning()
    admin = newAdmin

    if (!admin) throw createError({ statusCode: 500, message: 'Failed to ensure admin exists' })

    // Create auth record
    const passwordHash = await bcrypt.hash('123456', 10)
    await db.insert(userAuth).values({
      userId: admin.id,
      passwordHash
    })

    return { message: 'Setup complete. User created: admin@meuconcreto.com / 123456' }
  }

  return { message: 'Admin already exists. Use: admin@meuconcreto.com / 123456' }
})
