// /utils/formatters.ts
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatDate = (
  d: Date | string | number | null | undefined
): string => {
  if (!d) return '—'
  return format(new Date(d), 'dd MMM yyyy', { locale: ptBR })
}

export const formatRelative = (
  d: Date | string | number | null | undefined
): string => {
  if (!d) return '—'
  return formatDistanceToNow(new Date(d), { locale: ptBR, addSuffix: true })
}

export const formatCPF = (raw: string): string => {
  if (!raw) return ''
  const d = String(raw).replace(/\D/g, '')
  if (d.length === 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return raw
}

export const formatCNPJ = (raw: string): string => {
  if (!raw) return ''
  const d = String(raw).replace(/\D/g, '').slice(0, 14)
  if (d.length === 14) {
    return d
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }
  return raw
}

export const maskDocument = (v: string | null | undefined): string => {
  if (!v) return ''
  const d = String(v).replace(/\D/g, '').slice(0, 14)
  if (d.length > 11) {
    // CNPJ: 00.000.000/0000-00
    if (d.length > 12)
      return d.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,
        '$1.$2.$3/$4-$5'
      )
    if (d.length > 8)
      return d.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4')
    if (d.length > 5) return d.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3')
    if (d.length > 2) return d.replace(/(\d{2})(\d{0,3})/, '$1.$2')
    return d
  }
  // CPF: 000.000.000-00
  if (d.length > 9)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
  if (d.length > 6) return d.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
  if (d.length > 3) return d.replace(/(\d{3})(\d{0,3})/, '$1.$2')
  return d
}

export const formatPhone = (raw: string | null | undefined): string => {
  if (!raw) return ''
  let d = String(raw).replace(/\D/g, '')

  // Ignorar código do país (55) se vier incluído para números do Brasil (12 e 13 dígitos)
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    d = d.slice(2)
  }

  d = d.slice(0, 11)

  if (d.length === 11)
    return d.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2$3-$4')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return raw
}

export const maskPhone = (v: string | null | undefined): string => {
  if (!v) return ''
  let d = String(v).replace(/\D/g, '')

  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    d = d.slice(2)
  }

  d = d.slice(0, 11)
  if (d.length > 10)
    return d.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2$3-$4')
  if (d.length > 5) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  if (d.length > 2) return d.replace(/(\d{2})(\d{0,})/, '($1) $2')
  return d
}

export const maskCep = (v: string | null | undefined): string => {
  if (!v) return ''
  const str = String(v)
  const d = str.replace(/\D/g, '').slice(0, 8)
  if (d.length > 5) return d.replace(/(\d{5})(\d{0,3})/, '$1-$2')
  return d
}

// Otimização: Cache das instâncias de Intl.NumberFormat para ganho extremo de performance
// Criar o construtor uma única vez fora da função evita alocar memória a cada formatação
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})
const numberFormatter = new Intl.NumberFormat('pt-BR')

export const formatCurrency = (cents: number | null | undefined): string => {
  if (typeof cents !== 'number' || isNaN(cents))
    return currencyFormatter.format(0)
  return currencyFormatter.format(cents / 100)
}

export const formatNumber = (v: number | null | undefined): string => {
  if (typeof v !== 'number' || isNaN(v)) return '0'
  return numberFormatter.format(v)
}
