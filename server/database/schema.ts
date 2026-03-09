import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  unique,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  document: text("document").notNull().unique(), // CNPJ
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  logo: text("logo"), // Base64 encoded image
  active: integer("active", { mode: "boolean" }).default(true).notNull(),

  // Fast Mobile Access
  quickAccessEnabled: integer("quick_access_enabled", { mode: "boolean" })
    .default(false)
    .notNull(),
  quickAccessPin: text("quick_access_pin"), // 4-6 digits hashed? or just plain for fast setup (usually plain if restricted usage)
  quickAccessCode: text("quick_access_code").unique(),

  // Distinguishes external customers registered from clientes.vue from real tenant companies.
  // Records with isCustomer=true are excluded from the Empresas admin view.
  isCustomer: integer("is_customer", { mode: "boolean" })
    .default(false)
    .notNull(),
  // The tenant company that owns this customer record (only set when isCustomer=true).
  ownerCompanyId: integer("owner_company_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  userCompanies: many(userCompanies),
  products: many(products),
  quotes: many(quotes),
  sales: many(sales),
  sellers: many(sellers),
  drivers: many(drivers),
  pumpers: many(pumpers),
  paymentMethods: many(paymentMethods),
  transactions: many(transactions),
  schedules: many(schedules),
  materials: many(materials),
  mixDesigns: many(mixDesigns),
}));

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id").references(() => companies.id), // Nullable for system admins or until assigned
    defaultCompanyId: integer("default_company_id").references(
      () => companies.id,
    ), // Preferred company for login
    name: text("name").notNull(),
    email: text("email").notNull(),
    document: text("document").notNull(), // CPF or CNPJ
    phone: text("phone"),
    role: text("role", { enum: ["admin", "user", "manager"] })
      .default("user")
      .notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique_idx").on(table.email),
    documentUnique: uniqueIndex("users_document_unique_idx").on(table.document),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  userCompanies: many(userCompanies),
  quotes: many(quotes),
  sales: many(sales),
  transactions: many(transactions),
  schedules: many(schedules),
}));

// ─── User ↔ Company junction (multi-tenant) ───────────────────────────────────
export const userCompanies = sqliteTable(
  "user_companies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "user", "manager"] })
      .notNull()
      .default("user"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique().on(table.userId, table.companyId)],
);

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(users, { fields: [userCompanies.userId], references: [users.id] }),
  company: one(companies, {
    fields: [userCompanies.companyId],
    references: [companies.id],
  }),
}));

export const userAuth = sqliteTable("user_auth", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(), // 1:1 for simplicity now
  passwordHash: text("password_hash").notNull(),
  hwid: text("hwid"), // Hardware ID for binding/tracking
  lastLogin: integer("last_login", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["concrete", "pump", "additive", "rental", "other"],
  })
    .notNull()
    .default("other"),
  unit: text("unit", { enum: ["m3", "un", "hr", "kg", "ton"] })
    .notNull()
    .default("un"),
  price: integer("price").notNull().default(0), // Price in cents
  sku: text("sku"),
  // Specific fields for concrete (JSON or separate columns - separate is cleaner for SQL querying)
  fck: integer("fck"), // MPa
  slump: integer("slump"), // cm
  stoneSize: text("stone_size"), // e.g., "brita 0", "brita 1"
  mixDesignId: integer("mix_design_id").references(() => mixDesigns.id), // Link to production recipe

  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  mixDesign: one(mixDesigns, {
    fields: [products.mixDesignId],
    references: [mixDesigns.id],
  }),
}));

export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id), // Creator

  // Customer Info (Embedded for now)
  customerName: text("customer_name").notNull(),
  customerDocument: text("customer_document"), // CPF/CNPJ
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"), // Delivery Address

  status: text("status", {
    enum: ["draft", "sent", "approved", "rejected", "expired"],
  })
    .default("draft")
    .notNull(),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  validUntil: integer("valid_until", { mode: "timestamp" }),
  paymentMethod: text("payment_method"),
  paymentMethod2: text("payment_method_2"),
  sellerId: integer("seller_id").references(() => sellers.id, {
    onDelete: "set null",
  }),
  // driverId removed in favor of junction table
  pumperId: integer("pumper_id").references(() => pumpers.id, {
    onDelete: "set null",
  }),

  subtotal: integer("subtotal").notNull().default(0), // Cents
  discount: integer("discount").notNull().default(0), // Cents
  total: integer("total").notNull().default(0), // Cents

  notes: text("notes"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  company: one(companies, {
    fields: [quotes.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [quotes.userId],
    references: [users.id],
  }),
  seller: one(sellers, {
    fields: [quotes.sellerId],
    references: [sellers.id],
  }),
  drivers: many(quotesDrivers),
  pumper: one(pumpers, {
    fields: [quotes.pumperId],
    references: [pumpers.id],
  }),
  items: many(quoteItems),
  sales: many(sales),
}));

export const quotesDrivers = sqliteTable(
  "quotes_drivers",
  {
    quoteId: integer("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    driverId: integer("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.quoteId, t.driverId] }),
  }),
);

export const quotesDriversRelations = relations(quotesDrivers, ({ one }) => ({
  quote: one(quotes, {
    fields: [quotesDrivers.quoteId],
    references: [quotes.id],
  }),
  driver: one(drivers, {
    fields: [quotesDrivers.driverId],
    references: [drivers.id],
  }),
}));

export const salesDrivers = sqliteTable(
  "sales_drivers",
  {
    saleId: integer("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    driverId: integer("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.saleId, t.driverId] }),
  }),
);

export const salesDriversRelations = relations(salesDrivers, ({ one }) => ({
  sale: one(sales, {
    fields: [salesDrivers.saleId],
    references: [sales.id],
  }),
  driver: one(drivers, {
    fields: [salesDrivers.driverId],
    references: [drivers.id],
  }),
}));

// ─── Drivers ─────────────────────────────────────────────────────────────────
export const drivers = sqliteTable("drivers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  document: text("document"), // CNH/CPF
  phone: text("phone"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const driversRelations = relations(drivers, ({ one, many }) => ({
  company: one(companies, {
    fields: [drivers.companyId],
    references: [companies.id],
  }),
  quotes: many(quotesDrivers),
  sales: many(salesDrivers),
}));

// ─── Pumpers (Bombeadores) ──────────────────────────────────────────────────
export const pumpers = sqliteTable("pumpers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  document: text("document"),
  phone: text("phone"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const pumpersRelations = relations(pumpers, ({ one, many }) => ({
  company: one(companies, {
    fields: [pumpers.companyId],
    references: [companies.id],
  }),
  quotes: many(quotes),
  sales: many(sales),
}));

export const quoteItems = sqliteTable("quote_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id), // Nullable if product deleted, but data remains

  // Snapshot of product details
  productName: text("product_name").notNull(),
  description: text("description"),
  unit: text("unit"),

  quantity: real("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0), // Cents
  totalPrice: integer("total_price").notNull().default(0), // Cents

  // Specific fields snapshot
  fck: integer("fck"),
  slump: integer("slump"),
  stoneSize: text("stone_size"),
  mixDesignId: integer("mix_design_id"),
});

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  product: one(products, {
    fields: [quoteItems.productId],
    references: [products.id],
  }),
}));

export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  quoteId: integer("quote_id").references(() => quotes.id), // Optional link to origin quote

  customerName: text("customer_name").notNull(),
  customerDocument: text("customer_document"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),

  status: text("status", {
    enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
  })
    .default("pending")
    .notNull(),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  deliveryDate: integer("delivery_date", { mode: "timestamp" }),

  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),

  paymentMethod: text("payment_method"), // Snapshot/Legacy name
  paymentMethod2: text("payment_method_2"),
  paymentMethodId: integer("payment_method_id").references(
    () => paymentMethods.id,
  ),
  sellerId: integer("seller_id").references(() => sellers.id, {
    onDelete: "set null",
  }),
  // driverId removed in favor of junction table
  pumperId: integer("pumper_id").references(() => pumpers.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const salesRelations = relations(sales, ({ one, many }) => ({
  company: one(companies, {
    fields: [sales.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
  quote: one(quotes, {
    fields: [sales.quoteId],
    references: [quotes.id],
  }),
  seller: one(sellers, {
    fields: [sales.sellerId],
    references: [sellers.id],
  }),
  drivers: many(salesDrivers),
  pumper: one(pumpers, {
    fields: [sales.pumperId],
    references: [pumpers.id],
  }),
  paymentMethodReference: one(paymentMethods, {
    fields: [sales.paymentMethodId],
    references: [paymentMethods.id],
  }),
  items: many(saleItems),
  transactions: many(transactions),
}));

export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),

  productName: text("product_name").notNull(),
  description: text("description"),
  unit: text("unit"),

  quantity: real("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0),
  totalPrice: integer("total_price").notNull().default(0),

  fck: integer("fck"),
  slump: integer("slump"),
  stoneSize: text("stone_size"),
  mixDesignId: integer("mix_design_id"),
});

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

// ─── Sellers ─────────────────────────────────────────────────────────────────
export const sellers = sqliteTable(
  "sellers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    document: text("document"), // CPF — stored without mask
    email: text("email"),
    phone: text("phone"),
    commissionRate: real("commission_rate").notNull().default(0), // % e.g. 3.5
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.companyId, table.document)],
);

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  company: one(companies, {
    fields: [sellers.companyId],
    references: [companies.id],
  }),
  quotes: many(quotes),
  sales: many(sales),
}));

export const paymentMethods = sqliteTable("payment_methods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Pix", "Credit Card Visa"
  type: text("type", {
    enum: [
      "cash",
      "credit_card",
      "debit_card",
      "pix",
      "boleto",
      "transfer",
      "check",
      "other",
    ],
  })
    .notNull()
    .default("other"),

  // JSON details for flexible config (e.g. max installments, interest rate, bank info)
  details: text("details", { mode: "json" }),

  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  isDefault2: integer("is_default_2", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  company: one(companies, {
    fields: [paymentMethods.companyId],
    references: [companies.id],
  }),
}));

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  saleId: integer("sale_id").references(() => sales.id), // Optional link to sale (auto-generated income)

  description: text("description").notNull(),
  amount: integer("amount").notNull().default(0), // Cents (positive for income, negative for expense? Or use type?) -> Let's use type and always positive amount for display, but logic can handle signs.
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  category: text("category"), // e.g. "sales", "rent", "salary"

  status: text("status", { enum: ["pending", "paid", "cancelled"] })
    .default("pending")
    .notNull(),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  dueDate: integer("due_date", { mode: "timestamp" }),

  paymentMethod: text("payment_method"), // e.g. "Pix", "Cash"

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  company: one(companies, {
    fields: [transactions.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  sale: one(sales, {
    fields: [transactions.saleId],
    references: [sales.id],
  }),
}));

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "sale",
      "quote",
      "quote_updated",
      "transaction",
      "user",
      "product",
      "schedule",
      "customer",
      "system",
    ],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  icon: text("icon"),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  company: one(companies, {
    fields: [notifications.companyId],
    references: [companies.id],
  }),
}));

// ─── WhatsApp Settings ────────────────────────────────────────────────────────
export const whatsappSettings = sqliteTable("whatsapp_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" })
    .unique(),
  apiUrl: text("api_url").notNull().default("http://localhost:3025"),
  apiKey: text("api_key"),
  phoneNumber: text("phone_number"), // "+5511999999999" — sender number
  isConnected: integer("is_connected", { mode: "boolean" })
    .default(false)
    .notNull(),
  alertsEnabled: integer("alerts_enabled", { mode: "boolean" })
    .default(false)
    .notNull(),
  reportsEnabled: integer("reports_enabled", { mode: "boolean" })
    .default(false)
    .notNull(),
  alertRecipients: text("alert_recipients", { mode: "json" })
    .$type<string[]>()
    .$default(() => []),
  reportRecipients: text("report_recipients", { mode: "json" })
    .$type<string[]>()
    .$default(() => []),
  reportSchedule: text("report_schedule", {
    enum: ["daily", "weekly", "monthly"],
  })
    .notNull()
    .default("daily"),

  // Quote PDF automation
  quotePdfToSeller: integer("quote_pdf_to_seller", { mode: "boolean" })
    .default(false)
    .notNull(),
  quotePdfToCustomer: integer("quote_pdf_to_customer", { mode: "boolean" })
    .default(false)
    .notNull(),
  schedulesReminderEnabled: integer("schedules_reminder_enabled", {
    mode: "boolean",
  })
    .default(false)
    .notNull(),
  schedulesReminderLeadTimeHours: integer("schedules_reminder_lead_time_hours")
    .default(24)
    .notNull(),
  schedulesReminderRecipients: text("schedules_reminder_recipients", {
    mode: "json",
  })
    .$type<string[]>()
    .$default(() => []),
  isGlobal: integer("is_global", { mode: "boolean" }).default(false).notNull(),
  useGlobal: integer("use_global", { mode: "boolean" })
    .default(false)
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const whatsappSettingsRelations = relations(
  whatsappSettings,
  ({ one }) => ({
    company: one(companies, {
      fields: [whatsappSettings.companyId],
      references: [companies.id],
    }),
  }),
);

// ─── Schedules ────────────────────────────────────────────────────────────────
export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  saleId: integer("sale_id").references(() => sales.id, {
    onDelete: "set null",
  }),

  title: text("title").notNull(),
  description: text("description"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  location: text("location"),

  status: text("status", {
    enum: ["pending", "confirmed", "completed", "cancelled"],
  })
    .default("pending")
    .notNull(),
  type: text("type", {
    enum: ["concrete_delivery", "pump_service", "site_visit", "other"],
  })
    .default("other")
    .notNull(),

  date: integer("date", { mode: "timestamp" }).notNull(),
  startTime: text("start_time"), // "HH:mm"
  endTime: text("end_time"), // "HH:mm"

  whatsappSent: integer("whatsapp_sent", { mode: "boolean" })
    .default(false)
    .notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const schedulesRelations = relations(schedules, ({ one }) => ({
  company: one(companies, {
    fields: [schedules.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
  sale: one(sales, {
    fields: [schedules.saleId],
    references: [sales.id],
  }),
}));

// ─── Materials (Insumos) ──────────────────────────────────────────────────────
export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["cement", "sand", "stone", "additive", "water", "other"],
  })
    .notNull()
    .default("other"),
  unit: text("unit", { enum: ["kg", "ton", "l", "m3"] })
    .notNull()
    .default("kg"),

  cost: integer("cost").notNull().default(0), // Custo por unidade em centavos
  stock: real("stock").notNull().default(0), // Quantidade atual em estoque

  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const materialsRelations = relations(materials, ({ one }) => ({
  company: one(companies, {
    fields: [materials.companyId],
    references: [companies.id],
  }),
}));

// ─── Mix Designs (Traços/Receitas) ────────────────────────────────────────────
export const mixDesigns = sqliteTable("mix_designs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Traço 25MPa - Brita 1"
  description: text("description"),

  fck: integer("fck"), // MPa alvo
  slump: integer("slump"), // cm alvo
  stoneSize: text("stone_size"), // Brita alvo
  active: integer("active", { mode: "boolean" }).default(true).notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const mixDesignsRelations = relations(mixDesigns, ({ one, many }) => ({
  company: one(companies, {
    fields: [mixDesigns.companyId],
    references: [companies.id],
  }),
  items: many(mixDesignItems),
  products: many(products),
}));

export const mixDesignItems = sqliteTable("mix_design_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mixDesignId: integer("mix_design_id")
    .notNull()
    .references(() => mixDesigns.id, { onDelete: "cascade" }),
  materialId: integer("material_id")
    .notNull()
    .references(() => materials.id), // Insumo

  quantity: real("quantity").notNull().default(0), // Quantidade por m³
});

export const mixDesignItemsRelations = relations(mixDesignItems, ({ one }) => ({
  mixDesign: one(mixDesigns, {
    fields: [mixDesignItems.mixDesignId],
    references: [mixDesigns.id],
  }),
  material: one(materials, {
    fields: [mixDesignItems.materialId],
    references: [materials.id],
  }),
}));
