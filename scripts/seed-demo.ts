import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from '../server/database/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

// Setup database connection
const client = createClient({
  url: process.env.DB_FILE_NAME || 'file:local.db'
})

const db = drizzle(client, { schema })

async function seedDemo() {
  console.log('🌱 Starting COMPLETE DEMO seed...')

  // 0. Cleanup (Optional - be careful in prod, but fine for local demo)
  // Deleting in order to avoid FK constraints issues if possible, though SQLite usually handles it if configured.
  // Ideally, we just append or check existence. For a clean demo, let's try to clear specific tables for the demo company if it exists.
  // For simplicity in this script, we'll just create new data. If "Concreta Demo" exists, we skip or delete it.

  const existingCompany = await db.query.companies.findFirst({
    where: eq(schema.companies.document, '12345678000199')
  })

  if (existingCompany) {
    console.log('⚠️ Demo company already exists. Cleaning up old data...')
    await db
      .delete(schema.companies)
      .where(eq(schema.companies.id, existingCompany.id))
    // Cascading deletes should handle the rest if set up in DB, otherwise we might need manual cleanup.
    // Assuming SQLite foreign keys ON DELETE CASCADE is active or handled by Drizzle.
  }

  // 1. Create Main Company (Tenant)
  const [company] = await db
    .insert(schema.companies)
    .values({
      name: 'Concreta Demo Ltda',
      document: '12345678000199',
      email: 'contato@concretademo.com',
      phone: '(11) 3333-4444',
      address: 'Av. Industrial, 5000',
      city: 'São Paulo',
      state: 'SP',
      zip: '01000-000',
      active: true,
      quickAccessEnabled: true,
      quickAccessCode: 'DEMO123'
    })
    .returning()

  console.log('✅ Company created:', company.name)

  // 2. Create Users (Admin, Manager, User)
  const passwordHash = await bcrypt.hash('123456', 10)

  const usersData = [
    {
      name: 'Admin Demo',
      email: 'admin@demo.com',
      role: 'admin',
      document: '11111111111'
    },
    {
      name: 'Gerente Demo',
      email: 'gerente@demo.com',
      role: 'manager',
      document: '22222222222'
    },
    {
      name: 'Vendedor Demo',
      email: 'vendedor@demo.com',
      role: 'user',
      document: '33333333333'
    }
  ]

  for (const u of usersData) {
    const [user] = await db
      .insert(schema.users)
      .values({
        companyId: company.id,
        name: u.name,
        email: u.email,
        document: u.document,
        role: u.role as 'admin' | 'manager' | 'user',
        active: true
      })
      .returning()

    await db.insert(schema.userAuth).values({
      userId: user.id,
      passwordHash
    })

    await db.insert(schema.userCompanies).values({
      userId: user.id,
      companyId: company.id,
      role: u.role as 'admin' | 'manager' | 'user'
    })
    console.log(`✅ User created: ${u.email}`)
  }

  // 3. Create Sellers
  const sellersData = [
    {
      name: 'Carlos Vendas',
      email: 'carlos@demo.com',
      phone: '5511999990001',
      commission: 3.0
    },
    {
      name: 'Ana Comercial',
      email: 'ana@demo.com',
      phone: '5511999990002',
      commission: 2.5
    }
  ]

  const sellers = []
  for (const s of sellersData) {
    const [seller] = await db
      .insert(schema.sellers)
      .values({
        companyId: company.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        commissionRate: s.commission,
        active: true
      })
      .returning()
    sellers.push(seller)
  }
  console.log('✅ Sellers created')

  // 4. Create Customers (Companies with isCustomer=true)
  const customersData = [
    {
      name: 'Construtora Horizonte',
      doc: '55555555000100',
      phone: '(11) 5555-1234',
      address: 'Rua das Obras, 10'
    },
    {
      name: 'Engenharia Silva',
      doc: '66666666000100',
      phone: '(11) 6666-5678',
      address: 'Av. Projetada, 200'
    },
    {
      name: 'Residencial Flores',
      doc: '77777777000100',
      phone: '(11) 7777-9012',
      address: 'Al. das Flores, 5'
    }
  ]

  const customers = []
  for (const c of customersData) {
    const [customer] = await db
      .insert(schema.companies)
      .values({
        name: c.name,
        document: c.doc,
        phone: c.phone,
        address: c.address,
        isCustomer: true,
        ownerCompanyId: company.id,
        active: true
      })
      .returning()
    customers.push(customer)
  }
  console.log('✅ Customers created')

  // 5. Create Products
  const productsData = [
    {
      name: 'Concreto FCK 20 - Brita 1',
      type: 'concrete',
      unit: 'm3',
      price: 38000,
      fck: 20,
      stone: 'Brita 1',
      slump: 10
    },
    {
      name: 'Concreto FCK 25 - Brita 1',
      type: 'concrete',
      unit: 'm3',
      price: 40000,
      fck: 25,
      stone: 'Brita 1',
      slump: 10
    },
    {
      name: 'Concreto FCK 30 - Brita 0',
      type: 'concrete',
      unit: 'm3',
      price: 42000,
      fck: 30,
      stone: 'Brita 0',
      slump: 12
    },
    {
      name: 'Concreto FCK 35 - Alto Desempenho',
      type: 'concrete',
      unit: 'm3',
      price: 46000,
      fck: 35,
      stone: 'Brita 1',
      slump: 15
    },
    { name: 'Bomba Lança 36m', type: 'pump', unit: 'un', price: 120000 },
    { name: 'Bomba Estacionária', type: 'pump', unit: 'un', price: 80000 },
    {
      name: 'Aditivo Plastificante',
      type: 'additive',
      unit: 'kg',
      price: 1500
    },
    { name: 'Aditivo Retardador', type: 'additive', unit: 'kg', price: 2000 },
    { name: 'Locação de Vibrador', type: 'rental', unit: 'hr', price: 5000 }
  ]

  const products = []
  for (const p of productsData) {
    const [prod] = await db
      .insert(schema.products)
      .values({
        companyId: company.id,
        name: p.name,
        type: p.type as any,
        unit: p.unit as any,
        price: p.price,
        fck: p.fck,
        stoneSize: p.stone,
        slump: p.slump,
        active: true
      })
      .returning()
    products.push(prod)
  }
  console.log('✅ Products created')

  // 6. Payment Methods
  const paymentMethodsData = [
    { name: 'Pix', type: 'pix' },
    { name: 'Boleto 30 Dias', type: 'boleto' },
    { name: 'Transferência Bancária', type: 'transfer' },
    { name: 'Cartão de Crédito', type: 'credit_card' }
  ]

  const paymentMethods = []
  for (const pm of paymentMethodsData) {
    const [method] = await db
      .insert(schema.paymentMethods)
      .values({
        companyId: company.id,
        name: pm.name,
        type: pm.type as any,
        active: true
      })
      .returning()
    paymentMethods.push(method)
  }
  console.log('✅ Payment Methods created')

  // 7. Create Quotes
  // Helper to pick random item
  const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

  // Create a few quotes
  for (let i = 0; i < 5; i++) {
    const customer = pick(customers)
    const seller = pick(sellers)
    const status = ['draft', 'sent', 'approved', 'rejected'][i % 4]

    const [quote] = await db
      .insert(schema.quotes)
      .values({
        companyId: company.id,
        customerName: customer.name,
        customerDocument: customer.document,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        sellerId: seller.id,
        status: status as any,
        date: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
        notes: `Orçamento demonstração #${i + 1}`
      })
      .returning()

    // Add items to quote
    const prod1 = pick(products)
    const prod2 = pick(products)

    let total = 0

    await db.insert(schema.quoteItems).values({
      quoteId: quote.id,
      productId: prod1.id,
      productName: prod1.name,
      quantity: 10,
      unitPrice: prod1.price,
      totalPrice: prod1.price * 10,
      unit: prod1.unit
    })
    total += prod1.price * 10

    if (prod1.id !== prod2.id) {
      await db.insert(schema.quoteItems).values({
        quoteId: quote.id,
        productId: prod2.id,
        productName: prod2.name,
        quantity: 1,
        unitPrice: prod2.price,
        totalPrice: prod2.price * 1,
        unit: prod2.unit
      })
      total += prod2.price
    }

    await db
      .update(schema.quotes)
      .set({ total: total, subtotal: total })
      .where(eq(schema.quotes.id, quote.id))
  }
  console.log('✅ Quotes created')

  // 8. Create Sales & Transactions
  // Create a completed sale
  const saleCustomer = customers[0]
  const saleProd = products[0] // Concreto
  const salePump = products[4] // Bomba
  const saleTotal = saleProd.price * 8 + salePump.price // 8m3 + Bomba

  const [sale] = await db
    .insert(schema.sales)
    .values({
      companyId: company.id,
      customerName: saleCustomer.name,
      customerDocument: saleCustomer.document,
      customerAddress: saleCustomer.address,
      customerPhone: saleCustomer.phone,
      sellerId: sellers[0].id,
      status: 'confirmed',
      date: new Date(),
      deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      subtotal: saleTotal,
      total: saleTotal,
      paymentMethodId: paymentMethods[0].id, // Pix
      paymentMethod: paymentMethods[0].name
    })
    .returning()

  await db.insert(schema.saleItems).values([
    {
      saleId: sale.id,
      productId: saleProd.id,
      productName: saleProd.name,
      quantity: 8,
      unitPrice: saleProd.price,
      totalPrice: saleProd.price * 8,
      unit: saleProd.unit
    },
    {
      saleId: sale.id,
      productId: salePump.id,
      productName: salePump.name,
      quantity: 1,
      unitPrice: salePump.price,
      totalPrice: salePump.price,
      unit: salePump.unit
    }
  ])

  // Create Transaction (Income)
  await db.insert(schema.transactions).values({
    companyId: company.id,
    saleId: sale.id,
    description: `Venda #${sale.id} - ${saleCustomer.name}`,
    amount: saleTotal,
    type: 'income',
    category: 'sales',
    status: 'paid',
    date: new Date(),
    paymentMethod: paymentMethods[0].name
  })

  // Create Expense Transactions
  await db.insert(schema.transactions).values([
    {
      companyId: company.id,
      description: 'Conta de Energia',
      amount: 45000, // R$ 450,00
      type: 'expense',
      category: 'utilities',
      status: 'pending',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
      date: new Date()
    },
    {
      companyId: company.id,
      description: 'Aluguel do Galpão',
      amount: 250000, // R$ 2.500,00
      type: 'expense',
      category: 'rent',
      status: 'paid',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // -10 days
    }
  ])
  console.log('✅ Sales & Transactions created')

  // 9. Schedules
  await db.insert(schema.schedules).values([
    {
      companyId: company.id,
      userId: usersData[0].role === 'admin' ? 1 : 1, // Placeholder
      title: 'Entrega Concreto - Obra A',
      customerName: customers[0].name,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      startTime: '08:00',
      endTime: '12:00',
      type: 'concrete_delivery',
      status: 'confirmed',
      location: customers[0].address
    },
    {
      companyId: company.id,
      userId: usersData[0].role === 'admin' ? 1 : 1,
      title: 'Visita Técnica - Obra B',
      customerName: customers[1].name,
      date: new Date(Date.now() + 48 * 60 * 60 * 1000), // After tomorrow
      startTime: '14:00',
      endTime: '15:00',
      type: 'site_visit',
      status: 'pending',
      location: customers[1].address
    }
  ])
  console.log('✅ Schedules created')

  // 10. WhatsApp Settings
  await db.insert(schema.whatsappSettings).values({
    companyId: company.id,
    apiUrl: 'http://localhost:3025',
    apiKey: 'demo123',
    phoneNumber: '5511999998888',
    isConnected: true,
    alertsEnabled: true,
    reportsEnabled: true,
    quotePdfToCustomer: true,
    quotePdfToSeller: true
  })
  console.log('✅ WhatsApp Settings created')

  console.log('✨ DEMO SEED COMPLETED SUCCESSFULLY!')
  process.exit(0)
}

seedDemo().catch((err) => {
  console.error('❌ Demo seed failed:', err)
  process.exit(1)
})
