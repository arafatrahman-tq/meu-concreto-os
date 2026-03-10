import { and, eq } from 'drizzle-orm'
import { companies } from '../database/schema'
import { db } from '../utils/db'
import { requireCompanyAccess } from '../utils/session'
import { unscopeCustomerDocument } from '../utils/customer'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined

  if (!companyId) {
    throw createError({ statusCode: 400, message: 'companyId required' })
  }

  requireCompanyAccess(event, companyId)

  // Fetch quotes and sales scoped to the company — no global company listing
  // to avoid exposing data from unrelated tenants.
  const [allQuotes, allSales] = await Promise.all([
    db.query.quotes.findMany({
      where: (q, { eq }) => eq(q.companyId, companyId),
      orderBy: (q, { desc }) => [desc(q.createdAt)]
    }),
    db.query.sales.findMany({
      where: (s, { eq }) => eq(s.companyId, companyId),
      orderBy: (s, { desc }) => [desc(s.createdAt)]
    })
  ])

  // Aggregate unique customers derived from quotes and sales for this company.
  const customerMap = new Map<
    string,
    {
      id?: number
      key: string
      name: string
      document: string
      phone: string
      address: string
      quotesCount: number
      salesCount: number
      totalSpent: number // cents
      totalQuoted: number // cents
      lastActivityAt: number // unix ms
      createdAt: number // unix ms (first seen)
      pendingQuotes: number
      approvedQuotes: number
      completedSales: number
      cancelledSales: number
    }
  >()

  // Helper to generate a unique key for aggregation
  const getCustomerKey = (doc?: string | null, name?: string | null) => {
    // Unscope first so scoped docs ("12345678901@5") produce the same key
    // as their unscoped equivalents stored in quotes/sales.
    let d = unscopeCustomerDocument(doc?.trim())
    // Normalize document: remove non-alphanumeric characters if not a placeholder
    if (d && !d.startsWith('_cust_')) {
      d = d.replace(/[^a-zA-Z0-9]/g, '')
    }
    const n = name
      ?.trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    // Ignore internal placeholder documents when generating key
    if (d && !d.startsWith('_cust_')) return d
    return n || 'unknown'
  }

  // Track name -> document mapping to merge customers with same name but missing docs
  const nameToDocKey = new Map<string, string>()

  // Helper to merge source entry into target entry
  const mergeEntries = (targetKey: string, sourceKey: string) => {
    const target = customerMap.get(targetKey)
    const source = customerMap.get(sourceKey)
    if (!target || !source || targetKey === sourceKey) return

    // Merge stats
    target.quotesCount += source.quotesCount
    target.salesCount += source.salesCount
    target.totalSpent += source.totalSpent
    target.totalQuoted += source.totalQuoted
    target.pendingQuotes += source.pendingQuotes
    target.approvedQuotes += source.approvedQuotes
    target.completedSales += source.completedSales
    target.cancelledSales += source.cancelledSales

    // Merge timestamps
    target.lastActivityAt = Math.max(
      target.lastActivityAt,
      source.lastActivityAt
    )
    target.createdAt = Math.min(target.createdAt, source.createdAt)

    // Merge contact info if missing in target
    if (!target.phone && source.phone) target.phone = source.phone
    if (!target.address && source.address) target.address = source.address
    if (!target.id && source.id) target.id = source.id

    // Remove source
    customerMap.delete(sourceKey)
  }

  // Process a customer entry (from quote, sale, or standalone)
  const processEntry = (
    data: {
      name: string
      document?: string | null
      phone?: string | null
      address?: string | null
      createdAt: number
      id?: number
    },
    stats: {
      quotesCount?: number
      salesCount?: number
      totalSpent?: number
      totalQuoted?: number
      pendingQuotes?: number
      approvedQuotes?: number
      completedSales?: number
      cancelledSales?: number
    }
  ) => {
    const rawKey = getCustomerKey(data.document, data.name)
    const nameKey = data.name?.trim().toLowerCase() || 'unknown'
    let key = rawKey

    // Logic to merge name-based keys into document-based keys
    const isDocKey = data.document && !data.document.startsWith('_cust_')

    if (isDocKey) {
      // This entry has a real document.
      // 1. If we have a name-only entry for this name, merge it into this doc-key.
      if (customerMap.has(nameKey) && nameKey !== rawKey) {
        // Create doc-key entry if not exists, so we can merge into it
        if (!customerMap.has(rawKey)) {
          // Will be created below, but we need it now for merge
          // We can just set key = rawKey and let the upsert handle it,
          // BUT we must trigger the merge of the *existing* nameKey entry.
        }
        // We'll handle the merge after we ensure the target exists.
      }
      // 2. Register this name -> doc mapping
      nameToDocKey.set(nameKey, rawKey)
    } else {
      // This entry has NO real document (name-based key).
      // Check if we already know a doc-key for this name.
      if (nameToDocKey.has(nameKey)) {
        key = nameToDocKey.get(nameKey)!
      }
    }

    // Create entry if not exists
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: data.id,
        key,
        name: data.name,
        document: unscopeCustomerDocument(data.document) ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        quotesCount: 0,
        salesCount: 0,
        totalSpent: 0,
        totalQuoted: 0,
        lastActivityAt: data.createdAt,
        createdAt: data.createdAt,
        pendingQuotes: 0,
        approvedQuotes: 0,
        completedSales: 0,
        cancelledSales: 0
      })
    }

    // Perform merge if we just created/found a doc-key entry and a name-key entry exists
    if (isDocKey && customerMap.has(nameKey) && nameKey !== key) {
      mergeEntries(key, nameKey)
    }

    const c = customerMap.get(key)!

    // Update basic stats
    if (stats.quotesCount) c.quotesCount += stats.quotesCount
    if (stats.salesCount) c.salesCount += stats.salesCount
    if (stats.totalSpent) c.totalSpent += stats.totalSpent
    if (stats.totalQuoted) c.totalQuoted += stats.totalQuoted
    if (stats.pendingQuotes) c.pendingQuotes += stats.pendingQuotes
    if (stats.approvedQuotes) c.approvedQuotes += stats.approvedQuotes
    if (stats.completedSales) c.completedSales += stats.completedSales
    if (stats.cancelledSales) c.cancelledSales += stats.cancelledSales

    // Update timestamps and contact info
    c.lastActivityAt = Math.max(c.lastActivityAt, data.createdAt)
    c.createdAt = Math.min(c.createdAt, data.createdAt)
    if (data.phone && !c.phone) c.phone = data.phone
    if (data.address && !c.address) c.address = data.address

    // Ensure ID is preserved if available
    if (data.id && !c.id) c.id = data.id

    // Update document if we have a better one (e.g. valid doc vs placeholder).
    // Always unscope so the client receives the clean CPF/CNPJ.
    const unscopedDoc = unscopeCustomerDocument(data.document)
    if (
      unscopedDoc
      && !unscopedDoc.startsWith('_cust_')
      && (!c.document || c.document.startsWith('_cust_'))
    ) {
      c.document = unscopedDoc
    }
  }

  // ── Include pre-registered customers (companies with isCustomer=true) ─
  // Process these FIRST to establish the "source of truth" for name->doc mappings
  const standaloneCustomers = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.isCustomer, true),
        eq(companies.ownerCompanyId, companyId)
      )
    )
    .all()

  for (const sc of standaloneCustomers) {
    const ts
      = sc.createdAt instanceof Date
        ? sc.createdAt.getTime()
        : Number(sc.createdAt) * 1000

    processEntry(
      {
        name: sc.name,
        document: sc.document,
        phone: sc.phone,
        address: sc.address,
        createdAt: ts,
        id: sc.id
      },
      {}
    )
  }

  // ── Process quotes ────────────────────────────────────────────────
  for (const q of allQuotes) {
    const ts
      = q.createdAt instanceof Date
        ? q.createdAt.getTime()
        : Number(q.createdAt) * 1000

    processEntry(
      {
        name: q.customerName,
        document: q.customerDocument,
        phone: q.customerPhone,
        address: q.customerAddress,
        createdAt: ts
      },
      {
        quotesCount: 1,
        totalQuoted: q.total,
        pendingQuotes: q.status === 'sent' || q.status === 'draft' ? 1 : 0,
        approvedQuotes: q.status === 'approved' ? 1 : 0
      }
    )
  }

  // ── Process sales ─────────────────────────────────────────────────
  for (const s of allSales) {
    const ts
      = s.createdAt instanceof Date
        ? s.createdAt.getTime()
        : Number(s.createdAt) * 1000

    processEntry(
      {
        name: s.customerName,
        document: s.customerDocument,
        phone: s.customerPhone,
        address: s.customerAddress,
        createdAt: ts
      },
      {
        salesCount: 1,
        completedSales: s.status === 'completed' ? 1 : 0,
        cancelledSales: s.status === 'cancelled' ? 1 : 0,
        totalSpent: s.status === 'completed' ? s.total : 0
      }
    )
  }

  const customers = Array.from(customerMap.values()).sort(
    (a, b) => b.lastActivityAt - a.lastActivityAt
  )

  return { customers }
})
