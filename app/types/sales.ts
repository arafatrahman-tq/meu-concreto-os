import type { MixDesign } from './mix-designs'

export type SaleStatus
  = | 'pending'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'

export type QuoteStatus
  = | 'draft'
    | 'sent'
    | 'approved'
    | 'rejected'
    | 'expired'

export interface SaleItem {
  id?: number
  productId?: number | null
  productName: string
  description?: string
  unit?: string
  quantity: number
  unitPrice: number // cents
  totalPrice?: number
  fck?: number | null
  slump?: number | null
  stoneSize?: string | null
  mixDesignId?: number | null
}

export interface Sale {
  id: number
  customerName: string
  customerDocument?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  status: SaleStatus
  date: string | number | null
  deliveryDate?: string | number | null
  subtotal: number
  discount: number
  total: number
  paymentMethod?: string | null
  notes?: string | null
  companyId: number
  userId?: number | null
  quoteId?: number | null
  sellerId?: number | null
  driverIds?: number[]
  drivers?: { driverId: number }[]
  pumperId?: number | null
  items: SaleItem[]
  transactions?: any[]
  createdAt: string | number
}

export interface Product {
  id: number
  name: string
  unit: string
  price: number
  description?: string | null
  fck?: number | null
  slump?: number | null
  stoneSize?: string | null
  mixDesignId?: number | null
}

export interface PaymentMethod {
  id: number
  name: string
  type: string
  active: boolean
}

export interface Company {
  id: number
  name: string
  document: string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

export interface Seller {
  id: number
  name: string
  phone?: string | null
  active: boolean
}

export interface Driver {
  id: number
  name: string
  active: boolean
}

export interface Pumper {
  id: number
  name: string
  active: boolean
}

export interface KnownCustomer {
  id?: string
  label: string
  name: string
  document: string
  phone: string
  address: string
  suffix?: string
  source: 'company' | 'sale' | 'quote'
}

export interface QuoteItem {
  id?: number
  productId?: number | null
  productName: string
  description?: string
  unit?: string
  quantity: number
  unitPrice: number // cents
  totalPrice?: number
  fck?: number | null
  slump?: number | null
  stoneSize?: string | null
  mixDesignId?: number | null
}

export interface Quote {
  id: number
  customerName: string
  customerDocument?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  status: QuoteStatus
  date: string | number
  validUntil?: string | number | null
  subtotal: number
  discount: number
  total: number
  paymentMethod?: string | null
  notes?: string | null
  companyId: number
  userId?: number | null
  sellerId?: number | null
  driverIds?: number[]
  drivers?: { driverId: number }[]
  pumperId?: number | null
  items: QuoteItem[]
  createdAt: string | number
}

export interface FormItem {
  _key: number
  productId: number | null
  productName: string
  description: string
  unit: string
  quantity: number
  unitPrice: number // display value in BRL (float)
  fck: number | null
  slump: number | null
  stoneSize: string
  mixDesignId: number | null
}

export interface QuoteForm {
  id?: number
  customerName: string
  customerDocument: string | null
  customerPhone: string | null
  customerAddress: string | null
  sellerId: number | null
  status: QuoteStatus | string
  validUntil: string | null
  discount: number
  paymentMethod: string
  paymentMethod2: string
  notes: string | null
  items: FormItem[]
  driverIds?: number[]
  pumperId?: number | null
}

export interface SaleForm {
  id?: number
  customerName: string
  customerDocument: string | null
  customerPhone: string | null
  customerAddress: string | null
  sellerId: number | null
  driverIds: number[]
  pumperId: number | null
  status: SaleStatus
  date: string
  deliveryDate: string
  discount: number
  paymentMethod: string
  paymentMethod2: string
  notes: string
  items: FormItem[]
}

export interface SelectOption {
  label: string
  value: string | number | null
  [key: string]: any
}

export interface ConfirmDeleteData {
  id: number
  name: string
  type: 'driver' | 'pumper'
}

export interface ConfirmCreateData {
  name: string
  type: 'driver' | 'pumper'
}

export type { MixDesign }
