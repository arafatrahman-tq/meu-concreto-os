import { z } from "zod";

const dateSchema = z
  .union([
    z.string().date(), // Accepts "YYYY-MM-DD"
    z.string().datetime(), // Accepts ISO datetime
    z.date(), // Accepts Date objects
    z.literal(""), // Accepts empty string
    z.null(), // Accepts null
  ])
  .transform((val) => (val === "" || val === null ? undefined : val));

// --- Company Schemas ---
export const companySchema = z.object({
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  document: z
    .string()
    .min(11, { message: "O documento deve ser válido (CPF/CNPJ)" })
    .transform((val) => val.replace(/\D/g, "")), // Remove masks
  email: z
    .string()
    .email("E-mail inválido")
    .nullable()
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? val.replace(/\D/g, "") : val)),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z
    .string()
    .length(2, { message: "O estado deve ter 2 caracteres" })
    .nullable()
    .optional(),
  zip: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? val.replace(/\D/g, "") : val)),
  logo: z.string().nullable().optional(),
  active: z.boolean().default(true),
  quickAccessEnabled: z.boolean().default(false),
  quickAccessPin: z.string().nullable().optional().or(z.literal("")),
  quickAccessCode: z.string().nullable().optional().or(z.literal("")),
});

export const companyUpdateSchema = companySchema
  .partial()
  .omit({ document: true }); // Document is usually immutable

// --- User Schemas ---
export const userSchema = z.object({
  companyId: z.number().nullable().optional(), // Nullable/Optional
  defaultCompanyId: z.number().optional().nullable(), // Preferred company for login
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email("Endereço de e-mail inválido"),
  document: z
    .string()
    .min(11, { message: "O documento deve ser válido (CPF/CNPJ)" })
    .transform((val) => val.replace(/\D/g, "")), // Remove masks
  phone: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? val.replace(/\D/g, "") : val)), // Remove masks
  role: z.enum(["admin", "user", "manager"]).default("user"),
  active: z.boolean().default(true),
  password: z
    .string()
    .min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
  hwid: z.string().nullable().optional(),
});

export const userUpdateSchema = userSchema
  .partial()
  .omit({ email: true, document: true, password: true, hwid: true });

export const userCompanySchema = z.object({
  userId: z.number({ required_error: "userId is required" }),
  companyId: z.number({ required_error: "companyId is required" }),
  role: z.enum(["admin", "user", "manager"]).default("user"),
});

export type UserCompanyInput = z.infer<typeof userCompanySchema>;

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, { message: "A senha é obrigatória" }),
  hwid: z.string().optional(),
});

// --- Product Schemas ---
export const productSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  description: z.string().optional(),
  type: z
    .enum(["concrete", "pump", "additive", "rental", "other"])
    .default("other"),
  unit: z.enum(["m3", "un", "hr", "kg", "ton"]).default("un"),
  price: z
    .number()
    .min(0, { message: "O preço deve ser não-negativo" })
    .default(0), // Cents
  sku: z.string().optional(),
  fck: z.number().int().optional(), // MPa
  slump: z.number().int().optional(), // cm
  stoneSize: z.string().optional(), // e.g., "brita 0"
  mixDesignId: z.number().int().optional().nullable(), // Link to production recipe
  active: z.boolean().default(true),
});

export const productUpdateSchema = productSchema
  .partial()
  .omit({ companyId: true }); // Company usually doesn't change

// --- Quote Schemas ---
export const quoteItemSchema = z.object({
  productId: z.number().optional().nullable(), // Can be null if custom item
  productName: z
    .string()
    .min(1, { message: "O nome do produto é obrigatório" }),
  description: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  quantity: z.number().min(0.1, { message: "A quantidade deve ser positiva" }),
  unitPrice: z.number().min(0, { message: "O preço deve ser não-negativo" }), // Cents
  // Specifics
  fck: z.number().optional().nullable(),
  slump: z.number().optional().nullable(),
  stoneSize: z.string().optional().nullable(),
  mixDesignId: z.number().optional().nullable(),
});

export const quoteSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  userId: z.number().optional().nullable(),
  sellerId: z.number().optional().nullable(),
  driverIds: z.array(z.number()).optional(),
  pumperId: z.number().optional().nullable(),

  customerName: z
    .string()
    .min(3, { message: "O nome do cliente é obrigatório" }),
  customerDocument: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val?.replace(/\D/g, "")),
  customerPhone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val?.replace(/\D/g, "")),
  customerAddress: z.string().optional().nullable(),

  status: z
    .enum(["draft", "sent", "approved", "rejected", "expired"])
    .default("draft"),
  validUntil: dateSchema.optional().nullable(),
  paymentMethod: z.string().optional().nullable(),

  discount: z.number().min(0).default(0), // Cents
  notes: z.string().optional().nullable(),

  items: z
    .array(quoteItemSchema)
    .min(1, { message: "O orçamento deve ter pelo menos um item" }),
});

export const quoteUpdateSchema = quoteSchema
  .partial()
  .omit({ companyId: true });

export type CompanyInput = z.infer<typeof companySchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;

// --- Sale Schemas ---
export const saleItemSchema = z.object({
  productId: z.number().optional().nullable(), // Can be null if custom item
  productName: z
    .string()
    .min(1, { message: "O nome do produto é obrigatório" }),
  description: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  quantity: z.number().min(0.1, { message: "A quantidade deve ser positiva" }),
  unitPrice: z.number().min(0, { message: "O preço deve ser não-negativo" }), // Cents
  // Specifics
  fck: z.number().optional().nullable(),
  slump: z.number().optional().nullable(),
  stoneSize: z.string().optional().nullable(),
  mixDesignId: z.number().optional().nullable(),
});

export const saleSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  userId: z.number().optional().nullable(),
  quoteId: z.number().optional().nullable(),
  sellerId: z.number().optional().nullable(),
  driverIds: z.array(z.number()).optional(),
  pumperId: z.number().optional().nullable(),

  customerName: z
    .string()
    .min(3, { message: "O nome do cliente é obrigatório" }),
  customerDocument: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val?.replace(/\D/g, "")),
  customerPhone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val?.replace(/\D/g, "")),
  customerAddress: z.string().optional().nullable(),

  date: dateSchema.optional().nullable(),
  deliveryDate: dateSchema.optional().nullable(),
  status: z
    .enum(["pending", "confirmed", "in_progress", "completed", "cancelled"])
    .optional(),

  discount: z.number().min(0).default(0), // Cents
  paymentMethod: z.string().optional().nullable(),
  paymentMethodId: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),

  items: z
    .array(saleItemSchema)
    .min(1, { message: "A venda deve ter pelo menos um item" }),
});

export const saleUpdateSchema = saleSchema.partial().omit({ companyId: true });

export type SaleInput = z.infer<typeof saleSchema>;
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;

// --- Payment Method Schemas ---
export const paymentMethodSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  type: z
    .enum([
      "cash",
      "credit_card",
      "debit_card",
      "pix",
      "boleto",
      "transfer",
      "check",
      "other",
    ])
    .default("other"),

  details: z.record(z.string(), z.any()).optional(), // Flexible JSON object

  active: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const paymentMethodUpdateSchema = paymentMethodSchema
  .partial()
  .omit({ companyId: true });

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
export type PaymentMethodUpdateInput = z.infer<
  typeof paymentMethodUpdateSchema
>;

// --- Seller Schemas ---
export const sellerSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  document: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")), // Strip CPF mask
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")), // Strip phone mask
  commissionRate: z.number().min(0).max(100).default(0),
  active: z.boolean().default(true),
});

export const sellerUpdateSchema = sellerSchema
  .partial()
  .omit({ companyId: true });

export type SellerInput = z.infer<typeof sellerSchema>;
export type SellerUpdateInput = z.infer<typeof sellerUpdateSchema>;

// --- Driver Schemas ---
export const driverSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  document: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")),
  phone: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")),
  active: z.boolean().default(true),
});

export const driverUpdateSchema = driverSchema
  .partial()
  .omit({ companyId: true });

export type DriverInput = z.infer<typeof driverSchema>;
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;

// --- Pumper Schemas ---
export const pumperSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  document: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")),
  phone: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")),
  active: z.boolean().default(true),
});

export const pumperUpdateSchema = pumperSchema
  .partial()
  .omit({ companyId: true });

export type PumperInput = z.infer<typeof pumperSchema>;
export type PumperUpdateInput = z.infer<typeof pumperUpdateSchema>;

// --- Transaction Schemas ---
export const transactionSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  userId: z.number().optional(),
  saleId: z.number().optional(),

  description: z
    .string()
    .min(3, { message: "A descrição deve ter pelo menos 3 caracteres" }),
  amount: z
    .number()
    .min(0, { message: "O valor deve ser um número positivo (centavos)" }),
  type: z.enum(["income", "expense"]),
  category: z.string().optional(),

  status: z.enum(["pending", "paid", "cancelled"]).default("pending"),
  date: dateSchema.optional(),
  dueDate: dateSchema.optional(),

  paymentMethod: z.string().optional(),
});

export const transactionUpdateSchema = transactionSchema
  .partial()
  .omit({ companyId: true });

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;

// --- WhatsApp Settings Schemas ---
export const whatsappSettingsSchema = z.object({
  companyId: z.number({ required_error: "O ID da empresa é obrigatório" }),
  apiUrl: z
    .string()
    .min(5, { message: "A URL da API é muito curta" })
    .default("http://localhost:3025"),
  apiKey: z.string().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  alertsEnabled: z.boolean().default(false),
  reportsEnabled: z.boolean().default(false),
  alertRecipients: z.array(z.string()).default([]),
  reportRecipients: z.array(z.string()).default([]),
  reportSchedule: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  quotePdfToSeller: z.boolean().default(false),
  quotePdfToCustomer: z.boolean().default(false),
  schedulesReminderEnabled: z.boolean().default(false),
  schedulesReminderLeadTimeHours: z.number().int().min(1).default(24),
  schedulesReminderRecipients: z.array(z.string()).default([]),
  isGlobal: z.boolean().default(false),
  useGlobal: z.boolean().default(false),
});

export const whatsappSettingsUpdateSchema = whatsappSettingsSchema
  .partial()
  .omit({ companyId: true });

export type WhatsappSettingsInput = z.infer<typeof whatsappSettingsSchema>;
export type WhatsappSettingsUpdateInput = z.infer<
  typeof whatsappSettingsUpdateSchema
>;

// --- Schedule Schemas ---
export const scheduleSchema = z.object({
  companyId: z.number({ required_error: "O ID da empresa é obrigatório" }),
  userId: z.number({ required_error: "O ID do usuário é obrigatório" }),
  saleId: z.number().optional().nullable(),
  title: z
    .string()
    .min(3, { message: "O título deve ter pelo menos 3 caracteres" }),
  description: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val?.replace(/\D/g, "")),
  location: z.string().optional().nullable(),
  status: z
    .enum(["pending", "confirmed", "completed", "cancelled"])
    .default("pending"),
  type: z
    .enum(["concrete_delivery", "pump_service", "site_visit", "other"])
    .default("other"),
  date: dateSchema,
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:mm)")
    .optional()
    .nullable(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:mm)")
    .optional()
    .nullable(),
});

export const scheduleUpdateSchema = scheduleSchema
  .partial()
  .omit({ companyId: true, userId: true });

export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;

// --- Material Schemas (Insumos) ---
export const materialSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  type: z
    .enum(["cement", "sand", "stone", "additive", "water", "other"])
    .default("other"),
  unit: z.enum(["kg", "ton", "l", "m3"]).default("kg"),
  cost: z.number().min(0).default(0), // Cents
  stock: z.number().min(0).default(0),
  active: z.boolean().default(true),
});

export const materialUpdateSchema = materialSchema
  .partial()
  .omit({ companyId: true });

export type MaterialInput = z.infer<typeof materialSchema>;
export type MaterialUpdateInput = z.infer<typeof materialUpdateSchema>;

// --- Mix Design Schemas (Traços) ---
export const mixDesignItemSchema = z.object({
  materialId: z.number({ required_error: "O ID do material é obrigatório" }),
  quantity: z.number().min(0, { message: "A quantidade deve ser positiva" }),
});

export const mixDesignSchema = z.object({
  companyId: z.number({
    required_error: "O ID da empresa é obrigatório e deve ser um número",
  }),
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  description: z.string().optional(),
  fck: z.number().int().optional(), // MPa
  slump: z.number().int().optional(), // cm
  stoneSize: z.string().optional(), // e.g. "Brita 1"
  active: z.boolean().default(true),
  items: z.array(mixDesignItemSchema).optional(),
});

export const mixDesignUpdateSchema = mixDesignSchema
  .partial()
  .omit({ companyId: true });

export type MixDesignInput = z.infer<typeof mixDesignSchema>;
export type MixDesignUpdateInput = z.infer<typeof mixDesignUpdateSchema>;
