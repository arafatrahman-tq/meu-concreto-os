<script setup lang="ts">
import type {
  Customer,
  CustomerQuote,
  CustomerSale,
  ActivityFilter
} from '~/types/customers'
import { CUSTOMER_ACTIVITY_OPTS } from '~/types/customers'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Clientes | Meu Concreto' })

const { companyId } = useAuth()

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: customersData,
  pending: loadingCustomers,
  refresh: refreshCustomers
} = await useFetch(() => `/api/customers?companyId=${companyId.value}`)

// Also fetch quotes and sales for detail drawer
const { data: quotesData } = await useFetch(
  () => `/api/quotes?companyId=${companyId.value}`,
  { default: () => ({ quotes: [] }) }
)
const { data: salesData } = await useFetch(
  () => `/api/sales?companyId=${companyId.value}`,
  { default: () => ({ sales: [] }) }
)

const customers = computed<Customer[]>(
  () => (customersData.value as { customers: Customer[] })?.customers ?? []
)
const allQuotes = computed<CustomerQuote[]>(
  () => (quotesData.value as { quotes: CustomerQuote[] })?.quotes ?? []
)
const allSales = computed<CustomerSale[]>(
  () => (salesData.value as { sales: CustomerSale[] })?.sales ?? []
)

// ─────────────────────────────────────────────
// Formatters & Utils
// ─────────────────────────────────────────────
const formatRelative = (ms: number) => {
  if (!ms) return '—'
  const diff = Date.now() - ms
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 30) return `${days}d atrás`
  if (days < 365) return `${Math.floor(days / 30)}m atrás`
  return `${Math.floor(days / 365)}a atrás`
}

const maskDocument = (doc: string) => {
  if (!doc) return '—'
  return doc.length === 11 ? formatCPF(doc) : formatCNPJ(doc)
}

// Initials avatar
const initials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2)
    return (
      (parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')
    ).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-orange-500'
]
const avatarColor = (name: string) => {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ─────────────────────────────────────────────
// KPI Stats
// ─────────────────────────────────────────────
const now = new Date()
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

const stats = computed(() => {
  const all = customers.value
  const newThisMonth = all.filter(
    c => (c.createdAt || c.lastActivityAt) >= startOfMonth
  ).length
  const buyers = all.filter(c => c.totalSpent > 0)
  const totalSpent = buyers.reduce((s, c) => s + c.totalSpent, 0)
  const avgTicket = buyers.length ? Math.round(totalSpent / buyers.length) : 0
  return {
    total: all.length,
    newThisMonth,
    totalSpent,
    avgTicket,
    buyers: buyers.length
  }
})

const kpiItems = computed(() => [
  {
    label: 'Total de Clientes',
    value: stats.value.total,
    suffix: `${stats.value.buyers} com compras realizadas`,
    icon: 'i-heroicons-user-group',
    color: 'text-primary-500',
    bg: 'bg-primary-50 dark:bg-primary-500/10'
  },
  {
    label: 'Ativos no Mês',
    value: stats.value.newThisMonth,
    suffix: 'com interação neste mês',
    icon: 'i-heroicons-arrow-trending-up',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10'
  },
  {
    label: 'Receita Total',
    value: formatCurrency(stats.value.totalSpent),
    suffix: 'em vendas concluídas',
    icon: 'i-heroicons-banknotes',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-500/10'
  },
  {
    label: 'Ticket Médio',
    value: formatCurrency(stats.value.avgTicket),
    suffix: 'por cliente comprador',
    icon: 'i-heroicons-receipt-percent',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10'
  }
])

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref('')
const activityFilter = ref<ActivityFilter>('all')
const page = ref(1)
const pageSize = 12

const filteredCustomers = computed(() => {
  const q = search.value.toLowerCase()
  return customers.value.filter((c) => {
    const matchSearch
      = !q
        || c.name.toLowerCase().includes(q)
        || c.document.includes(q)
        || c.phone.includes(q)

    const matchFilter
      = activityFilter.value === 'all'
        || (activityFilter.value === 'buyers' && c.totalSpent > 0)
        || (activityFilter.value === 'prospects'
          && c.totalSpent === 0
          && c.quotesCount > 0)
        || (activityFilter.value === 'inactive'
          && Date.now() - c.lastActivityAt > 90 * 86_400_000)

    return matchSearch && matchFilter
  })
})

const paginatedCustomers = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredCustomers.value.slice(start, start + pageSize)
})

const totalPages = computed(() =>
  Math.ceil(filteredCustomers.value.length / pageSize)
)

watch([search, activityFilter], () => {
  page.value = 1
})

// ─────────────────────────────────────────────
// Drawer — Customer detail
// ─────────────────────────────────────────────
const isDetailOpen = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const drawerTab = ref('quotes')

const DRAWER_TABS = [
  { label: 'Orçamentos', value: 'quotes', icon: 'i-heroicons-document-text' },
  { label: 'Vendas', value: 'sales', icon: 'i-heroicons-shopping-cart' }
]

const openDetail = (c: Customer) => {
  selectedCustomer.value = c
  drawerTab.value = 'quotes'
  isDetailOpen.value = true
}

const customerQuotes = computed(() => {
  if (!selectedCustomer.value) return []
  const { document, name } = selectedCustomer.value
  return allQuotes.value.filter(
    (q: CustomerQuote) =>
      (document && q.customerDocument === document) || q.customerName === name
  )
})

const customerSales = computed(() => {
  if (!selectedCustomer.value) return []
  const { document, name } = selectedCustomer.value
  return allSales.value.filter(
    (s: CustomerSale) =>
      (document && s.customerDocument === document) || s.customerName === name
  )
})

// ─────────────────────────────────────────────
// Status configs
// ─────────────────────────────────────────────
const quoteStatusConfig: Record<string, { label: string, color: string }> = {
  draft: { label: 'Rascunho', color: 'neutral' },
  sent: { label: 'Enviado', color: 'info' },
  approved: { label: 'Aprovado', color: 'success' },
  rejected: { label: 'Rejeitado', color: 'error' },
  expired: { label: 'Expirado', color: 'warning' }
}
const saleStatusConfig: Record<string, { label: string, color: string }> = {
  pending: { label: 'Pendente', color: 'warning' },
  confirmed: { label: 'Confirmado', color: 'info' },
  in_progress: { label: 'Em Andamento', color: 'info' },
  completed: { label: 'Concluído', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'error' }
}

const quoteStatus = (s: string) =>
  quoteStatusConfig[s] ?? quoteStatusConfig['draft']!
const saleStatus = (s: string) =>
  saleStatusConfig[s] ?? saleStatusConfig['pending']!

// ─────────────────────────────────────────────
// Drawer — Form
// ─────────────────────────────────────────────
const isDrawerOpen = ref(false)
const editingCustomer = ref<Customer | null>(null)

const openCreate = () => {
  editingCustomer.value = null
  isDrawerOpen.value = true
}

const openEdit = (c: Customer) => {
  editingCustomer.value = c
  isDrawerOpen.value = true
}
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Clientes
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Histórico consolidado de clientes a partir de orçamentos e vendas
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-user-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Novo Cliente
      </UButton>
    </div>

    <!-- ── KPI Strip (Design System compliant) ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <template v-if="loadingCustomers">
        <USkeleton
          v-for="i in 4"
          :key="i"
          class="h-28 rounded-3xl"
        />
      </template>
      <template v-else>
        <div
          v-for="(kpi, i) in kpiItems"
          :key="i"
          class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-tight">
              {{ kpi.label }}
            </span>
            <div :class="[kpi.bg, 'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0']">
              <UIcon
                :name="kpi.icon"
                :class="['w-6 h-6', kpi.color]"
              />
            </div>
          </div>
          <p class="text-3xl font-black tabular-nums tracking-tighter" :class="kpi.color">
            {{ kpi.value }}
          </p>
          <div class="flex items-center gap-1.5 -mt-2">
            <div :class="[kpi.color, 'w-1.5 h-1.5 rounded-full animate-pulse']" />
            <p class="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
              {{ kpi.suffix }}
            </p>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Table Card (Design System compliant) ── -->
    <UCard
      :ui="{
        body: 'p-0 sm:p-0',
        header: 'p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
        footer: 'p-4 border-t border-zinc-100 dark:border-zinc-800'
      }"
      class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-2 h-6 bg-primary-500 rounded-full" />
            <h3 class="font-black text-zinc-900 dark:text-white uppercase tracking-tight">
              Lista de Clientes
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar por nome, CNPJ ou telefone..."
              size="sm"
              class="w-44 lg:w-56"
            />
            <USelect
              v-model="activityFilter"
              :items="CUSTOMER_ACTIVITY_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-36"
            />
          </div>
        </div>
      </template>

      <!-- Loading -->
      <div
        v-if="loadingCustomers"
        class="divide-y divide-zinc-100 dark:divide-zinc-800/50"
      >
        <div
          v-for="i in 6"
          :key="i"
          class="px-6 py-4"
        >
          <USkeleton class="h-12 rounded-xl" />
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="filteredCustomers.length === 0"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <div class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
          <UIcon
            name="i-heroicons-user-group"
            class="w-8 h-8 text-zinc-300 dark:text-zinc-600"
          />
        </div>
        <p class="text-sm font-bold text-zinc-900 dark:text-white">
          {{ customers.length === 0 ? "Nenhum cliente encontrado" : "Nenhum cliente corresponde aos filtros" }}
        </p>
        <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">
          {{ customers.length === 0 ? "Crie um orçamento ou venda para começar" : "Tente outros termos de busca" }}
        </p>
      </div>

      <!-- Table -->
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
              <th class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                Cliente
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell">
                Contato
              </th>
              <th class="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell">
                Orçamentos
              </th>
              <th class="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell">
                Vendas
              </th>
              <th class="text-right px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Total Gasto
              </th>
              <th class="text-right px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell">
                Última Atividade
              </th>
              <th class="px-6 py-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            <tr
              v-for="c in paginatedCustomers"
              :key="c.key"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200 cursor-pointer"
              @click="openDetail(c)"
            >
              <!-- Cliente -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-black"
                    :class="avatarColor(c.name)"
                  >
                    {{ initials(c.name) }}
                  </div>
                  <div>
                    <p class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors">
                      {{ c.name }}
                    </p>
                    <p
                      v-if="c.document"
                      class="text-xs text-zinc-400 font-mono"
                    >
                      {{ maskDocument(c.document) }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Contato -->
              <td class="px-4 py-4 hidden md:table-cell">
                <div class="text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5">
                  <p
                    v-if="c.phone"
                    class="flex items-center gap-1"
                  >
                    <UIcon name="i-heroicons-phone" class="w-3 h-3" />
                    {{ maskPhone(c.phone) }}
                  </p>
                  <p
                    v-if="c.address"
                    class="flex items-center gap-1 max-w-45 truncate"
                  >
                    <UIcon name="i-heroicons-map-pin" class="w-3 h-3 shrink-0" />
                    {{ c.address }}
                  </p>
                </div>
              </td>

              <!-- Orçamentos -->
              <td class="px-4 py-4 text-center hidden lg:table-cell">
                <div class="flex flex-col items-center gap-1">
                  <span class="font-bold text-zinc-900 dark:text-white">{{ c.quotesCount }}</span>
                  <div class="flex items-center gap-1">
                    <UBadge
                      v-if="c.pendingQuotes"
                      color="warning"
                      variant="subtle"
                      size="xs"
                      class="font-black uppercase tracking-widest text-[9px] rounded-full px-2 py-0.5"
                    >
                      {{ c.pendingQuotes }} pend.
                    </UBadge>
                    <UBadge
                      v-if="c.approvedQuotes"
                      color="success"
                      variant="subtle"
                      size="xs"
                      class="font-black uppercase tracking-widest text-[9px] rounded-full px-2 py-0.5"
                    >
                      {{ c.approvedQuotes }} aprov.
                    </UBadge>
                  </div>
                </div>
              </td>

              <!-- Vendas -->
              <td class="px-4 py-4 text-center hidden lg:table-cell">
                <div class="flex flex-col items-center gap-1">
                  <span class="font-bold text-zinc-900 dark:text-white">{{ c.salesCount }}</span>
                  <UBadge
                    v-if="c.completedSales > 0"
                    color="success"
                    variant="subtle"
                    size="xs"
                    class="font-black uppercase tracking-widest text-[9px] rounded-full px-2 py-0.5"
                  >
                    {{ c.completedSales }} concl.
                  </UBadge>
                </div>
              </td>

              <!-- Total Gasto -->
              <td class="px-4 py-4 text-right whitespace-nowrap">
                <span
                  class="font-black tabular-nums text-base tracking-tighter"
                  :class="c.totalSpent > 0 ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'"
                >
                  {{ c.totalSpent > 0 ? formatCurrency(c.totalSpent) : "—" }}
                </span>
              </td>

              <!-- Última atividade -->
              <td class="px-4 py-4 text-right hidden xl:table-cell">
                <span class="text-xs text-zinc-400">{{ formatRelative(c.lastActivityAt) }}</span>
              </td>

              <!-- Actions (Design System: Edit + Dropdown) -->
              <td
                class="px-6 py-4 text-right"
                @click.stop
              >
                <div class="flex items-center justify-end gap-1 transition-all">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="md"
                    class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    @click="openEdit(c)"
                  />
                  <UDropdownMenu
                    :items="[
                      [
                        {
                          label: 'Ver histórico',
                          icon: 'i-heroicons-clock',
                          onSelect: () => openDetail(c)
                        },
                        {
                          label: 'Novo Orçamento',
                          icon: 'i-heroicons-document-plus',
                          onSelect: () => navigateTo({
                            path: '/orcamentos',
                            query: {
                              customerName: c.name,
                              customerDocument: c.document || undefined,
                              customerPhone: c.phone || undefined,
                              customerAddress: c.address || undefined
                            }
                          })
                        },
                        {
                          label: 'Nova Venda',
                          icon: 'i-heroicons-shopping-cart',
                          onSelect: () => navigateTo({
                            path: '/vendas',
                            query: {
                              customerName: c.name,
                              customerDocument: c.document || undefined,
                              customerPhone: c.phone || undefined,
                              customerAddress: c.address || undefined
                            }
                          })
                        }
                      ]
                    ]"
                  >
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-ellipsis-vertical"
                      size="md"
                      class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    />
                  </UDropdownMenu>
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
        <div class="flex items-center justify-between">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            {{ filteredCustomers.length }} clientes · página {{ page }} de {{ totalPages }}
          </p>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-heroicons-chevron-left"
              size="sm"
              class="rounded-xl"
              :disabled="page === 1"
              @click="page--"
            />
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-heroicons-chevron-right"
              size="sm"
              class="rounded-xl"
              :disabled="page >= totalPages"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>

    <!-- Customer Detail Drawer -->
    <USlideover
      v-model:open="isDetailOpen"
      side="right"
      :ui="{ footer: 'p-0 block' }"
    >
      <template #header>
        <div class="flex items-center gap-4 min-w-0">
          <div
            v-if="selectedCustomer"
            class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-black"
            :class="avatarColor(selectedCustomer.name)"
          >
            {{ initials(selectedCustomer.name) }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-black text-zinc-900 dark:text-white truncate">
              {{ selectedCustomer?.name }}
            </p>
            <p
              v-if="selectedCustomer?.document"
              class="text-xs text-zinc-400 font-mono"
            >
              {{ maskDocument(selectedCustomer.document) }}
            </p>
          </div>
        </div>
      </template>

      <template #body>
        <div
          v-if="selectedCustomer"
          class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24"
        >
          <!-- Quick actions -->
          <div class="flex gap-3">
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-document-plus"
              size="md"
              class="flex-1 font-bold h-12 rounded-2xl"
              @click="navigateTo({
                path: '/orcamentos',
                query: {
                  customerName: selectedCustomer.name,
                  customerDocument: selectedCustomer.document || undefined,
                  customerPhone: selectedCustomer.phone || undefined,
                  customerAddress: selectedCustomer.address || undefined
                }
              })"
            >
              Orçamento
            </UButton>
            <UButton
              color="success"
              variant="soft"
              icon="i-heroicons-shopping-cart"
              size="md"
              class="flex-1 font-bold h-12 rounded-2xl"
              @click="navigateTo({
                path: '/vendas',
                query: {
                  customerName: selectedCustomer.name,
                  customerDocument: selectedCustomer.document || undefined,
                  customerPhone: selectedCustomer.phone || undefined,
                  customerAddress: selectedCustomer.address || undefined
                }
              })"
            >
              Venda
            </UButton>
          </div>

          <!-- Contact info -->
          <div class="rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 p-6 border border-zinc-200/50 dark:border-zinc-700/30 space-y-3">
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Informações de Contato
            </h4>
            <div
              v-if="selectedCustomer.phone"
              class="flex items-center gap-2 text-sm"
            >
              <UIcon name="i-heroicons-phone" class="w-4 h-4 text-zinc-400 shrink-0" />
              <span class="text-zinc-700 dark:text-zinc-300 font-medium">{{ formatPhone(selectedCustomer.phone) }}</span>
            </div>
            <div
              v-if="selectedCustomer.address"
              class="flex items-start gap-2 text-sm"
            >
              <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <span class="text-zinc-700 dark:text-zinc-300 font-medium">{{ selectedCustomer.address }}</span>
            </div>
          </div>

          <!-- Summary strip -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4 text-center">
              <p class="text-2xl font-black text-zinc-900 dark:text-white">{{ selectedCustomer.quotesCount }}</p>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">Orçamentos</p>
            </div>
            <div class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4 text-center">
              <p class="text-2xl font-black text-zinc-900 dark:text-white">{{ selectedCustomer.salesCount }}</p>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">Vendas</p>
            </div>
            <div class="rounded-2xl bg-green-50 dark:bg-green-500/10 ring-1 ring-green-100 dark:ring-green-500/20 p-4 text-center">
              <p class="text-base font-black text-green-600 dark:text-green-400 leading-tight">{{ formatCurrency(selectedCustomer.totalSpent) }}</p>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/70 mt-1">Total Gasto</p>
            </div>
          </div>

          <!-- Tabs -->
          <div class="space-y-4">
            <div class="flex items-center gap-1 border-b border-zinc-100 dark:border-zinc-800">
              <button
                v-for="tab in DRAWER_TABS"
                :key="tab.value"
                class="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 -mb-px"
                :class="drawerTab === tab.value ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'"
                @click="drawerTab = tab.value"
              >
                <UIcon :name="tab.icon" class="w-3.5 h-3.5" />
                {{ tab.label }}
              </button>
            </div>

            <!-- Quotes list -->
            <div
              v-if="drawerTab === 'quotes'"
              class="space-y-3"
            >
              <div
                v-if="customerQuotes.length === 0"
                class="flex flex-col items-center py-12 text-zinc-400"
              >
                <p class="text-sm font-bold">Nenhum orçamento</p>
              </div>
              <div
                v-for="q in customerQuotes"
                :key="q.id"
                class="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 px-4 py-3 hover:ring-primary-500/50 transition-all cursor-pointer group"
                @click="navigateTo(`/orcamentos?id=${q.id}`)"
              >
                <div class="min-w-0">
                  <p class="text-xs font-black text-zinc-900 dark:text-white group-hover:text-primary-500 transition-colors">
                    #{{ String(q.id).padStart(4, "0") }}
                  </p>
                  <p class="text-[10px] text-zinc-400 font-medium">{{ formatDate(q.date) }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :color="quoteStatus(q.status).color as any"
                    variant="subtle"
                    size="sm"
                    class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
                  >
                    {{ quoteStatus(q.status).label }}
                  </UBadge>
                  <span class="text-sm font-black text-zinc-900 dark:text-white shrink-0 tabular-nums">{{ formatCurrency(q.total) }}</span>
                </div>
              </div>
            </div>

            <!-- Sales list -->
            <div
              v-if="drawerTab === 'sales'"
              class="space-y-3"
            >
              <div
                v-if="customerSales.length === 0"
                class="flex flex-col items-center py-12 text-zinc-400"
              >
                <p class="text-sm font-bold">Nenhuma venda</p>
              </div>
              <div
                v-for="s in customerSales"
                :key="s.id"
                class="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 px-4 py-3 hover:ring-primary-500/50 transition-all cursor-pointer group"
                @click="navigateTo(`/vendas?id=${s.id}`)"
              >
                <div class="min-w-0">
                  <p class="text-xs font-black text-zinc-900 dark:text-white group-hover:text-primary-500 transition-colors">
                    #{{ String(s.id).padStart(4, "0") }}
                  </p>
                  <p class="text-[10px] text-zinc-400 font-medium">{{ formatDate(s.date) }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :color="saleStatus(s.status).color as any"
                    variant="subtle"
                    size="sm"
                    class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
                  >
                    {{ saleStatus(s.status).label }}
                  </UBadge>
                  <span class="text-sm font-black text-zinc-900 dark:text-white shrink-0 tabular-nums">{{ formatCurrency(s.total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Create/Edit Drawer -->
    <CustomersCustomerDrawer
      v-model:open="isDrawerOpen"
      :customer="editingCustomer"
      @saved="refreshCustomers"
    />
  </div>
</template>
