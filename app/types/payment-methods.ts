export type MethodType
  = | 'cash'
    | 'credit_card'
    | 'debit_card'
    | 'pix'
    | 'boleto'
    | 'transfer'
    | 'check'
    | 'other'

export interface PaymentMethodDetails {
  maxInstallments?: number
  interestRate?: number
  pixKey?: string
  pixKeyType?: string
  bankName?: string
  accountInfo?: string
  instructions?: string
}

export interface PaymentMethod {
  id: number
  companyId: number
  name: string
  type: MethodType
  details?: PaymentMethodDetails | null
  active: boolean
  isDefault: boolean
  isDefault2: boolean
  createdAt?: string | number
  updatedAt?: string | number
}

export interface PaymentMethodForm {
  name: string
  type: MethodType
  active: boolean
  isDefault: boolean
  maxInstallments: number | null
  interestRate: number | null
  pixKey: string
  pixKeyType: string
  bankName: string
  accountInfo: string
  instructions: string
}

export const TYPE_CONFIG: Record<
  MethodType,
  { label: string, icon: string, color: string, bg: string }
> = {
  cash: {
    label: 'Dinheiro',
    icon: 'i-heroicons-banknotes',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-500/10'
  },
  credit_card: {
    label: 'Cartão de Crédito',
    icon: 'i-heroicons-credit-card',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10'
  },
  debit_card: {
    label: 'Cartão de Débito',
    icon: 'i-heroicons-credit-card',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10'
  },
  pix: {
    label: 'Pix',
    icon: 'i-simple-icons-pix',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10'
  },
  boleto: {
    label: 'Boleto',
    icon: 'i-heroicons-document-text',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10'
  },
  transfer: {
    label: 'Transferência',
    icon: 'i-heroicons-arrows-right-left',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10'
  },
  check: {
    label: 'Cheque',
    icon: 'i-heroicons-document-check',
    color: 'text-zinc-600 dark:text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-800'
  },
  other: {
    label: 'Outro',
    icon: 'i-heroicons-ellipsis-horizontal-circle',
    color: 'text-zinc-500 dark:text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-800'
  }
}

export const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'random', label: 'Chave Aleatória' }
]
