export type QuoteStatusCanonical
  = | 'draft'
    | 'negotiation'
    | 'approved'
    | 'closed'
export type QuoteStatusAny
  = | QuoteStatusCanonical
    | 'sent'
    | 'rejected'
    | 'expired'

export type SaleStatusCanonical
  = | 'open'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
export type SaleStatusAny = SaleStatusCanonical | 'pending' | 'confirmed'

export const normalizeQuoteStatus = (
  status: string | null | undefined
): QuoteStatusCanonical => {
  switch (status) {
    case 'approved':
      return 'approved'
    case 'closed':
    case 'rejected':
    case 'expired':
      return 'closed'
    case 'negotiation':
    case 'sent':
      return 'negotiation'
    case 'draft':
    default:
      return 'draft'
  }
}

export const normalizeSaleStatus = (
  status: string | null | undefined
): SaleStatusCanonical => {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'cancelled':
      return 'cancelled'
    case 'in_progress':
    case 'confirmed':
      return 'in_progress'
    case 'open':
    case 'pending':
    default:
      return 'open'
  }
}
