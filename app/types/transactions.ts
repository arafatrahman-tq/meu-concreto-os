export type TransactionType = 'income' | 'expense'
export type TransactionStatus = 'pending' | 'paid' | 'cancelled'

export interface Transaction {
    id: number
    companyId: number
    userId?: number | null
    saleId?: number | null
    description: string
    amount: number // cents
    type: TransactionType
    category?: string | null
    status: TransactionStatus
    date: string | number
    dueDate?: string | number | null
    paymentMethod?: string | null
    createdAt: string | number
    updatedAt: string | number
    sale?: { id: number, customerName: string } | null
    user?: { id: number, name: string } | null
}

export const CATEGORY_SUGGESTIONS = [
    'Vendas',
    'Serviços',
    'Aluguel',
    'Salário',
    'Impostos',
    'Combustível',
    'Manutenção',
    'Equipamentos',
    'Fornecedores',
    'Marketing',
    'Administrativo',
    'Outros'
]
