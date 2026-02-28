<script setup lang="ts">
import type { Transaction, TransactionType, TransactionStatus } from "~/types/transactions";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Transações | Meu Concreto" });

const { user, companyId } = useAuth();
const toast = useToast();

interface Company {
  id: number;
  name: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: txData,
  refresh: refreshTransactions,
  pending: loadingTx
} = await useFetch('/api/transactions', {
  query: { companyId }
})

const { data: companyData } = await useFetch<{ company: Company }>(
  () => `/api/companies/${companyId.value}`
)
const company = computed(() => companyData.value?.company ?? null)

const transactions = computed<Transaction[]>(
  () =>
    (txData.value as { transactions: Transaction[] } | null)?.transactions
    ?? []
)

// Logic moved to useFormatters

// ─────────────────────────────────────────────
// Filters & Search
// ─────────────────────────────────────────────
const search = ref('')
const typeFilter = ref<TransactionType | 'all'>('all')
const statusFilter = ref<TransactionStatus | 'all'>('all')
const dateStart = ref('')
const dateEnd = ref('')

const TYPE_OPTS = [
  { label: 'Todos os tipos', value: 'all' },
  { label: 'Receita', value: 'income' },
  { label: 'Despesa', value: 'expense' }
]

const STATUS_OPTS = [
  { label: 'Todos os status', value: 'all' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Pago', value: 'paid' },
  { label: 'Cancelado', value: 'cancelled' }
]

const filteredTransactions = computed(() => {
  return transactions.value
    .filter((t) => {
      const matchType
        = typeFilter.value === 'all' || t.type === typeFilter.value
      const matchStatus
        = statusFilter.value === 'all' || t.status === statusFilter.value
      const q = search.value.toLowerCase()
      const matchSearch
        = !q
          || t.description.toLowerCase().includes(q)
          || (t.category ?? '').toLowerCase().includes(q)
          || (t.paymentMethod ?? '').toLowerCase().includes(q)
          || (t.sale?.customerName ?? '').toLowerCase().includes(q)
      const txDate = new Date(t.date as string | number)
      const matchStart = !dateStart.value || txDate >= new Date(dateStart.value)
      const matchEnd = !dateEnd.value || txDate <= new Date(dateEnd.value + 'T23:59:59')
      return matchType && matchStatus && matchSearch && matchStart && matchEnd
    })
    .sort(
      (a, b) =>
        new Date(b.date as string | number).getTime()
          - new Date(a.date as string | number).getTime()
    )
})

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1)
const pageSize = ref(12)

const paginatedTransactions = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredTransactions.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() =>
  Math.ceil(filteredTransactions.value.length / pageSize.value)
)

watch([search, typeFilter, statusFilter, dateStart, dateEnd], () => {
  page.value = 1
})

// ─────────────────────────────────────────────
// Status / Type config
// ─────────────────────────────────────────────
const statusConfig: Record<
  TransactionStatus,
  { label: string, color: string, icon: string }
> = {
  pending: {
    label: 'Pendente',
    color: 'warning',
    icon: 'i-heroicons-clock'
  },
  paid: {
    label: 'Pago',
    color: 'success',
    icon: 'i-heroicons-check-circle'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'error',
    icon: 'i-heroicons-x-circle'
  }
}

const typeConfig: Record<
  TransactionType,
  { label: string, color: string, icon: string, sign: string }
> = {
  income: {
    label: 'Receita',
    color: 'success',
    icon: 'i-heroicons-arrow-trending-up',
    sign: '+'
  },
  expense: {
    label: 'Despesa',
    color: 'error',
    icon: 'i-heroicons-arrow-trending-down',
    sign: '-'
  }
}

// ─────────────────────────────────────────────
// KPI Summaries
// ─────────────────────────────────────────────
const kpis = computed(() => {
  const all = transactions.value
  const paid = all.filter(t => t.status === 'paid')
  const income = paid
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const expense = paid
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const balance = income - expense
  const pending = all
    .filter(t => t.status === 'pending')
    .reduce((s, t) => s + t.amount, 0)
  const pendingCount = all.filter(t => t.status === 'pending').length
  const totalCount = all.length
  return { income, expense, balance, pending, pendingCount, totalCount }
})

// Drawer state
const isDrawerOpen = ref(false);
const editingTransaction = ref<Transaction | null>(null);

const openCreate = () => {
  editingTransaction.value = null;
  isDrawerOpen.value = true;
};

const openEdit = (t: Transaction) => {
  editingTransaction.value = t;
  isDrawerOpen.value = true;
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
const deleteTarget = ref<Transaction | null>(null)
const loadingDelete = ref(false)
const isDeleteModalOpen = ref(false)

const confirmDelete = (t: Transaction) => {
  deleteTarget.value = t
  isDeleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  loadingDelete.value = true
  const desc = deleteTarget.value.description
  try {
    await $fetch(`/api/transactions/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    isDeleteModalOpen.value = false
    toast.add({
      title: 'Transação excluída',
      description: `"${desc}" foi excluída.`,
      color: 'neutral',
      icon: 'i-heroicons-trash'
    })
    await refreshTransactions()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string, statusMessage?: string }, message?: string }
    toast.add({
      title: 'Erro ao excluir',
      description:
        err?.data?.message ?? err?.data?.statusMessage ?? err?.message ?? 'Tente novamente.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingDelete.value = false
    deleteTarget.value = null
  }
}

// ─────────────────────────────────────────────
// Quick status update
// ─────────────────────────────────────────────
const updateStatus = async (t: Transaction, status: TransactionStatus) => {
  try {
    await $fetch(`/api/transactions/${t.id}`, {
      method: 'PUT',
      body: { status }
    })
    toast.add({
      title: 'Status atualizado',
      description: `Transação agora está como "${statusConfig[status].label}".`,
      color: 'success',
      icon: statusConfig[status].icon
    })
    await refreshTransactions()
  } catch (e) {
    console.error(e)
  }
}

const STATUS_ACTIONS: Record<
  TransactionStatus,
  { next: TransactionStatus, label: string }[]
> = {
  pending: [
    { next: 'paid', label: 'Marcar como Pago' },
    { next: 'cancelled', label: 'Cancelar' }
  ],
  paid: [],
  cancelled: [{ next: 'pending', label: 'Reabrir como Pendente' }]
}

// ─────────────────────────────────────────────
// PDF Report Download
// ─────────────────────────────────────────────
const loadingPDF = ref(false)

const downloadReport = async () => {
  loadingPDF.value = true
  try {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF() as any
    const pw = doc.internal.pageSize.width
    const ph = doc.internal.pageSize.height
    const fmtCurrency = (cents: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
    const fmtDate = (v: string | number | null | undefined) =>
      v ? new Intl.DateTimeFormat('pt-BR').format(new Date(v as string | number)) : '—'

    const rows = filteredTransactions.value
    const periodLabel = (() => {
      if (dateStart.value && dateEnd.value)
        return `Período: ${fmtDate(dateStart.value)} — ${fmtDate(dateEnd.value)}`
      if (dateStart.value) return `A partir de: ${fmtDate(dateStart.value)}`
      if (dateEnd.value) return `Até: ${fmtDate(dateEnd.value)}`
      return 'Período: Todos'
    })()

    // ── Watermark
    doc.setTextColor(230, 230, 230)
    doc.setFontSize(60)
    doc.setFont('helvetica', 'bold')
    doc.saveGraphicsState()
    doc.setGState(new (doc as any).GState({ opacity: 0.08 }))
    doc.text('MEU CONCRETO', pw / 2, ph / 2, { align: 'center', angle: 45 })
    doc.restoreGraphicsState()

    // ── Header brand block
    doc.setFillColor(34, 197, 94)
    doc.roundedRect(15, 15, 10, 10, 2, 2, 'F')
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.8)
    doc.line(17.5, 20.5, 22.5, 20.5)
    doc.line(19.5, 18.5, 20.5, 18.5)
    doc.line(19, 18, 21, 18)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(24, 24, 27)
    doc.text('MEU', 28, 20.5)
    doc.setTextColor(34, 197, 94)
    doc.text('CONCRETO', 40.5, 20.5)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(161, 161, 170)
    doc.text('OPERATIONAL SYSTEM', 28, 24.5, { charSpace: 0.5 })

    // ── Report title (right side)
    doc.setTextColor(24, 24, 27)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('RELATÓRIO DE TRANSAÇÕES', pw - 15, 20.5, { align: 'right' })
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(113, 113, 122)
    doc.text(periodLabel, pw - 15, 25.5, { align: 'right' })
    const generatedAt = `Gerado em: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`
    doc.text(generatedAt, pw - 15, 30, { align: 'right' })

    // ── Divider
    doc.setDrawColor(228, 228, 231)
    doc.setLineWidth(0.1)
    doc.line(15, 38, pw - 15, 38)

    // ── Company info block
    const co = company.value
    if (co) {
      const colW = (pw - 30) / 2

      // Left: identity
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(113, 113, 122)
      doc.text('EMPRESA EMISSORA', 15, 44, { charSpace: 0.3 })
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(24, 24, 27)
      doc.text(co.name, 15, 50)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(113, 113, 122)
      let cy = 55
      if (co.document) {
        doc.text(`CNPJ: ${co.document}`, 15, cy)
        cy += 4.5
      }
      if (co.phone) {
        doc.text(`Tel: ${co.phone}`, 15, cy)
        cy += 4.5
      }
      if (co.email) {
        doc.text(`E-mail: ${co.email}`, 15, cy)
      }

      // Right: address
      const addrParts = [co.address, [co.city, co.state].filter(Boolean).join(' / '), co.zip ? `CEP: ${co.zip}` : ''].filter(Boolean)
      if (addrParts.length) {
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(113, 113, 122)
        doc.text('ENDEREÇO', 15 + colW, 44, { charSpace: 0.3 })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(113, 113, 122)
        let ay = 50
        addrParts.forEach((line) => {
          const split = doc.splitTextToSize(line, colW - 5)
          doc.text(split, 15 + colW, ay)
          ay += split.length * 4.5
        })
      }
    }

    // ── Divider (after company block)
    doc.setDrawColor(228, 228, 231)
    doc.setLineWidth(0.1)
    doc.line(15, 73, pw - 15, 73)

    // ── KPI summary boxes
    const paid = rows.filter(t => t.status === 'paid')
    const income = paid.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = paid.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const balance = income - expense
    const pending = rows.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)

    const kpiCols = [
      { label: 'RECEITAS (PAGAS)', value: fmtCurrency(income), color: [22, 163, 74] as [number, number, number] },
      { label: 'DESPESAS (PAGAS)', value: fmtCurrency(expense), color: [220, 38, 38] as [number, number, number] },
      { label: 'SALDO LÍQUIDO', value: fmtCurrency(Math.abs(balance)), color: balance >= 0 ? [34, 197, 94] as [number, number, number] : [220, 38, 38] as [number, number, number] },
      { label: 'A RECEBER/PAGAR', value: fmtCurrency(pending), color: [245, 158, 11] as [number, number, number] }
    ]
    const kpiW = (pw - 30) / 4
    kpiCols.forEach((k, i) => {
      const x = 15 + i * kpiW
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(113, 113, 122)
      doc.text(k.label, x + kpiW / 2, 80, { align: 'center', charSpace: 0.3 })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...k.color)
      doc.text(k.value, x + kpiW / 2, 87, { align: 'center' })
    })

    // ── Divider (after KPIs)
    doc.setDrawColor(228, 228, 231)
    doc.setLineWidth(0.1)
    doc.line(15, 93, pw - 15, 93)

    // ── Table
    const statusLabels: Record<string, string> = { pending: 'Pendente', paid: 'Pago', cancelled: 'Cancelado' }
    const typeLabels: Record<string, string> = { income: 'Receita', expense: 'Despesa' }

    autoTable(doc, {
      startY: 99,
      head: [['Descrição', 'Tipo', 'Categoria', 'Status', 'Data', 'Valor']],
      body: rows.map(t => [
        t.description + (t.sale ? `\nVenda: ${t.sale.customerName}` : ''),
        typeLabels[t.type] ?? t.type,
        t.category ?? '—',
        statusLabels[t.status] ?? t.status,
        fmtDate(t.date),
        (t.type === 'income' ? '+' : '-') + fmtCurrency(t.amount)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 3.5, font: 'helvetica' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 25 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = data.cell.raw as string
          data.cell.styles.textColor = val.startsWith('+')
            ? [22, 163, 74]
            : [220, 38, 38]
        }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    })

    // ── Footer
    const finalY = (doc as any).lastAutoTable.finalY
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(24, 24, 27)
    doc.text(`Total de registros: ${rows.length}`, 15, finalY + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(161, 161, 170)
    doc.text('Meu Concreto OS — Relatório gerado automaticamente.', pw / 2, ph - 12, { align: 'center' })

    const filename = `transacoes-${new Date().toLocaleDateString('sv')}.pdf`
    doc.save(filename)
    toast.add({
      title: 'PDF gerado',
      description: `"${filename}" baixado com sucesso.`,
      color: 'success',
      icon: 'i-heroicons-arrow-down-tray'
    })
  } catch (e) {
    console.error(e)
    toast.add({
      title: 'Erro ao gerar PDF',
      description: 'Não foi possível gerar o relatório.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingPDF.value = false
  }
}
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Transações
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Controle de receitas e despesas da empresa
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="openCreate"
      >
        Nova Transação
      </UButton>
    </div>

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <!-- Receitas Recebidas -->
      <div
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >Receitas</span>
          <div
            class="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-arrow-trending-up"
              class="w-5 h-5 text-green-500"
            />
          </div>
        </div>
        <p class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums">
          {{ formatCurrency(kpis.income) }}
        </p>
        <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-400 -mt-2">
          <UIcon
            name="i-heroicons-check-circle"
            class="w-4 h-4"
          />
          <span>Somente pagas</span>
        </div>
      </div>

      <!-- Despesas -->
      <div
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >Despesas</span>
          <div
            class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-arrow-trending-down"
              class="w-5 h-5 text-red-500"
            />
          </div>
        </div>
        <p class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums">
          {{ formatCurrency(kpis.expense) }}
        </p>
        <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-400 -mt-2">
          <UIcon
            name="i-heroicons-check-circle"
            class="w-4 h-4"
          />
          <span>Somente pagas</span>
        </div>
      </div>

      <!-- Saldo Líquido -->
      <div
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >Saldo Líquido</span>
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="
              kpis.balance >= 0
                ? 'bg-primary-50 dark:bg-primary-500/10'
                : 'bg-red-50 dark:bg-red-500/10'
            "
          >
            <UIcon
              name="i-heroicons-scale"
              class="w-5 h-5"
              :class="kpis.balance >= 0 ? 'text-primary-500' : 'text-red-500'"
            />
          </div>
        </div>
        <p
          class="text-3xl font-black tabular-nums"
          :class="kpis.balance >= 0 ? 'text-primary-500' : 'text-red-500'"
        >
          {{ kpis.balance >= 0 ? "" : "-"
          }}{{ formatCurrency(Math.abs(kpis.balance)) }}
        </p>
        <div
          class="flex items-center gap-1.5 text-xs font-medium -mt-2"
          :class="kpis.balance >= 0 ? 'text-green-500' : 'text-red-500'"
        >
          <UIcon
            :name="
              kpis.balance >= 0
                ? 'i-heroicons-arrow-trending-up'
                : 'i-heroicons-arrow-trending-down'
            "
            class="w-4 h-4"
          />
          <span>{{ kpis.balance >= 0 ? "Positivo" : "Negativo" }}</span>
        </div>
      </div>

      <!-- Pendente -->
      <div
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >A Receber/Pagar</span>
          <div
            class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-clock"
              class="w-5 h-5 text-amber-500"
            />
          </div>
        </div>
        <p class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums">
          {{ formatCurrency(kpis.pending) }}
        </p>
        <div class="flex items-center gap-1.5 text-xs font-medium text-amber-500 -mt-2">
          <UIcon
            name="i-heroicons-exclamation-circle"
            class="w-4 h-4"
          />
          <span>{{ kpis.pendingCount }}
            {{ kpis.pendingCount === 1 ? "pendência" : "pendências" }}</span>
        </div>
      </div>
    </div>

    <!-- ── Table Card ── -->
    <UCard>
      <!-- Toolbar -->
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h3
            class="text-sm font-black uppercase tracking-widest text-zinc-400 shrink-0"
          >
            Todas as Transações
          </h3>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <UInput
              v-model="search"
              size="sm"
              placeholder="Buscar..."
              icon="i-heroicons-magnifying-glass"
              class="w-44 lg:w-56"
            />
            <USelect
              v-model="typeFilter"
              :items="TYPE_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-36"
            />
            <USelect
              v-model="statusFilter"
              :items="STATUS_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-40"
            />
            <UInput
              v-model="dateStart"
              type="date"
              size="sm"
              class="w-36"
            />
            <UInput
              v-model="dateEnd"
              type="date"
              size="sm"
              class="w-36"
            />
            <UTooltip
              text="Limpar datas"
              :disabled="!dateStart && !dateEnd"
            >
              <UButton
                v-if="dateStart || dateEnd"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark"
                size="sm"
                @click="dateStart = ''; dateEnd = ''"
              />
            </UTooltip>
            <UDivider
              orientation="vertical"
              class="h-6"
            />
            <UTooltip text="Baixar relatório PDF">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-arrow-down-tray"
                size="sm"
                :loading="loadingPDF"
                :disabled="filteredTransactions.length === 0"
                @click="downloadReport"
              >
                PDF
              </UButton>
            </UTooltip>
          </div>
        </div>
      </template>

      <!-- Loading skeleton -->
      <div
        v-if="loadingTx"
        class="space-y-3 py-2"
      >
        <USkeleton
          v-for="i in 6"
          :key="i"
          class="h-14 rounded-xl"
        />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredTransactions.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon
          name="i-heroicons-arrows-right-left"
          class="w-12 h-12 mb-3"
        />
        <p class="text-sm font-bold">
          Nenhuma transação encontrada
        </p>
        <p class="text-xs mt-1">
          {{
            search || typeFilter !== "all" || statusFilter !== "all"
              ? "Tente ajustar os filtros"
              : "Crie sua primeira transação"
          }}
        </p>
      </div>

      <!-- Table -->
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800">
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Descrição
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Tipo
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
              >
                Categoria
              </th>
              <th
                class="text-right py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Valor
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Status
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Data
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell"
              >
                Vencimento
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell"
              >
                Pagamento
              </th>
              <th class="py-3 px-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-50 dark:divide-zinc-800/60">
            <tr
              v-for="t in paginatedTransactions"
              :key="t.id"
              class="group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <!-- Description -->
              <td class="py-3.5 px-4">
                <div class="flex flex-col gap-0.5">
                  <span class="font-bold text-zinc-900 dark:text-white">
                    {{ t.description }}
                  </span>
                  <span
                    v-if="t.sale"
                    class="text-xs text-zinc-400"
                  >
                    <UIcon
                      name="i-heroicons-shopping-cart"
                      class="w-3 h-3 inline mr-0.5"
                    />
                    Venda: {{ t.sale.customerName }}
                  </span>
                </div>
              </td>

              <!-- Type -->
              <td class="py-3.5 px-4">
                <UBadge
                  :color="typeConfig[t.type].color as any"
                  variant="soft"
                  size="sm"
                  :icon="typeConfig[t.type].icon"
                >
                  {{ typeConfig[t.type].label }}
                </UBadge>
              </td>

              <!-- Category -->
              <td class="py-3.5 px-4 hidden md:table-cell">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ t.category || "—" }}
                </span>
              </td>

              <!-- Amount -->
              <td class="py-3.5 px-4 text-right">
                <span
                  class="font-black tabular-nums"
                  :class="
                    t.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  "
                >
                  {{ typeConfig[t.type].sign }}{{ formatCurrency(t.amount) }}
                </span>
              </td>

              <!-- Status -->
              <td class="py-3.5 px-4">
                <UBadge
                  :color="statusConfig[t.status].color as any"
                  variant="soft"
                  size="sm"
                >
                  {{ statusConfig[t.status].label }}
                </UBadge>
              </td>

              <!-- Date -->
              <td class="py-3.5 px-4 hidden lg:table-cell">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ formatDate(t.date) }}
                </span>
              </td>

              <!-- Due Date -->
              <td class="py-3.5 px-4 hidden xl:table-cell">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ formatDate(t.dueDate) }}
                </span>
              </td>

              <!-- Payment Method -->
              <td class="py-3.5 px-4 hidden xl:table-cell">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ t.paymentMethod || "—" }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-right">
                <div
                  class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <UTooltip
                    v-for="a in STATUS_ACTIONS[t.status]"
                    :key="a.next"
                    :text="a.label"
                  >
                    <UButton
                      color="neutral"
                      variant="ghost"
                      :icon="statusConfig[a.next].icon"
                      size="xs"
                      @click="updateStatus(t, a.next)"
                    />
                  </UTooltip>
                  <UTooltip text="Editar">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="xs"
                      @click="openEdit(t)"
                    />
                  </UTooltip>
                  <UTooltip text="Excluir">
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="xs"
                      @click="confirmDelete(t)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <template
        v-if="totalPages > 1"
        #footer
      >
        <div class="flex items-center justify-between gap-4">
          <span class="text-xs text-zinc-400 font-bold">
            {{ filteredTransactions.length }} transação{{
              filteredTransactions.length !== 1 ? "ões" : ""
            }}
            encontrada{{ filteredTransactions.length !== 1 ? "s" : "" }}
          </span>
          <div class="flex items-center gap-1">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-chevron-left"
              size="sm"
              :disabled="page === 1"
              @click="page--"
            />
            <span class="text-xs font-bold text-zinc-500 px-2">
              {{ page }} / {{ totalPages }}
            </span>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-chevron-right"
              size="sm"
              :disabled="page === totalPages"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>

    <!-- Transaction Drawer -->
    <TransactionsTransactionDrawer
      v-model:open="isDrawerOpen"
      :transaction="editingTransaction"
      @saved="refreshTransactions"
    />

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Excluir Transação"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir a transação
            <span class="font-bold text-zinc-900 dark:text-white">
              "{{ deleteTarget?.description }}" </span>?
          </p>
          <div
            v-if="deleteTarget"
            class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center"
                :class="
                  deleteTarget.type === 'income'
                    ? 'bg-green-100 dark:bg-green-500/20'
                    : 'bg-red-100 dark:bg-red-500/20'
                "
              >
                <UIcon
                  :name="typeConfig[deleteTarget.type].icon"
                  class="w-4 h-4"
                  :class="
                    deleteTarget.type === 'income'
                      ? 'text-green-500'
                      : 'text-red-500'
                  "
                />
              </div>
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  {{ deleteTarget.description }}
                </p>
                <p class="text-xs text-zinc-400">
                  {{ formatDate(deleteTarget.date) }}
                </p>
              </div>
            </div>
            <span
              class="font-black text-sm"
              :class="
                deleteTarget.type === 'income'
                  ? 'text-green-600'
                  : 'text-red-600'
              "
            >
              {{ typeConfig[deleteTarget.type].sign
              }}{{ formatCurrency(deleteTarget.amount) }}
            </span>
          </div>
          <p class="text-xs text-zinc-400">
            Esta ação é irreversível.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="loadingDelete"
            @click="isDeleteModalOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            :loading="loadingDelete"
            @click="handleDelete"
          >
            Excluir
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

