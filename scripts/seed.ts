import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from '../server/database/schema'
import bcrypt from 'bcryptjs'

const client = createClient({
  url: process.env.DB_FILE_NAME || 'file:local.db'
})

const db = drizzle(client, { schema })

async function seed() {
  console.log('🌱 Starting seed...')

  // 1. Create Company
  const [company] = await db
    .insert(schema.companies)
    .values({
      name: 'Meu Concreto Demo',
      document: '00000000000000',
      email: 'contato@meuconcreto.com',
      phone: '(11) 99999-9999',
      address: 'Av. das Industrias, 1000',
      city: 'São Paulo',
      state: 'SP',
      active: true
    })
    .returning()

  console.log('✅ Company created:', company.name)

  // 2. Create Admin User
  const [admin] = await db
    .insert(schema.users)
    .values({
      companyId: company.id,
      name: 'Administrador',
      email: 'admin@meuconcreto.com',
      document: '00000000000',
      role: 'admin',
      active: true
    })
    .returning()

  const passwordHash = await bcrypt.hash('123456', 10)
  await db.insert(schema.userAuth).values({
    userId: admin.id,
    passwordHash
  })

  // Link user to company explicitly via junction
  await db.insert(schema.userCompanies).values({
    userId: admin.id,
    companyId: company.id,
    role: 'admin'
  })

  console.log('✅ Admin user created: admin@meuconcreto.com / 123456')

  // 3. Create a Seller
  const [seller] = await db
    .insert(schema.sellers)
    .values({
      companyId: company.id,
      name: 'João Vendedor',
      email: 'joao@meuconcreto.com',
      phone: '5511999999999',
      active: true
    })
    .returning()

  console.log('✅ Seller created:', seller.name)

  // 4. Create Products
  const productsToAdd = [
    {
      companyId: company.id,
      name: 'Concreto FCK 20 - Brita 1',
      type: 'concrete' as const,
      unit: 'm3' as const,
      price: 35000, // R$ 350,00
      fck: 20,
      slump: 10,
      stoneSize: 'Brita 1',
      active: true
    },
    {
      companyId: company.id,
      name: 'Concreto FCK 30 - Brita 0',
      type: 'concrete' as const,
      unit: 'm3' as const,
      price: 39000, // R$ 390,00
      fck: 30,
      slump: 12,
      stoneSize: 'Brita 0',
      active: true
    },
    {
      companyId: company.id,
      name: 'Serviço de Bombeamento',
      type: 'pump' as const,
      unit: 'un' as const,
      price: 60000, // R$ 600,00
      active: true
    }
  ]

  await db.insert(schema.products).values(productsToAdd)
  console.log('✅ Standard products created')

  // 5. Create WhatsApp Settings
  await db.insert(schema.whatsappSettings).values({
    companyId: company.id,
    apiKey: 'demo-key',
    apiUrl: 'http://localhost:3001',
    isConnected: false,
    quotePdfToSeller: true,
    quotePdfToCustomer: true
  })
  console.log('✅ WhatsApp settings initialized')

  // 6. Create Payment Methods
  const pmsToAdd = [
    { companyId: company.id, name: 'Pix', type: 'pix' as const },
    { companyId: company.id, name: 'Dinheiro', type: 'cash' as const },
    {
      companyId: company.id,
      name: 'Cartão de Crédito',
      type: 'credit_card' as const
    },
    { companyId: company.id, name: 'Boleto', type: 'boleto' as const }
  ]
  await db.insert(schema.paymentMethods).values(pmsToAdd)
  console.log('✅ Payment methods created')

  console.log('✨ Seed finished successfully!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
