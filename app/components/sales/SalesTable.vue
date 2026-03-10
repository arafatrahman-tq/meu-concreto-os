<script setup lang="ts">
import type { Sale, SaleStatus } from '~/types/sales'
import { formatCurrency, formatDate } from '~/utils/formatters'

const props = defineProps<{
  sales: Sale[]
  loading: boolean
  search: string
  statusFilter: SaleStatus | 'all'
  page: number
  pageSize: number
  totalPages: number
  stats: {
    total: number
    inProgress: number
    completed: number
    totalValue: number
  }
  isSendingPdf: number | null
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:statusFilter': [value: SaleStatus | 'all']
  'update:page': [value: number]
  'edit': [sale: Sale]
  'delete': [sale: Sale]
  'cancel': [sale: Sale]
  'bill': [sale: Sale]
  'sendPdf': [sale: Sale]
  'updateStatus': [sale: Sale, next: SaleStatus]
}>()

const localSearch = computed({
  get: () => props.search,
  set: val => emit('update:search', val)
})

const localStatusFilter = computed({
  get: () => props.statusFilter,
  set: val => emit('update:statusFilter', val)
})

const localPage = computed({
  get: () => props.page,
  set: val => emit('update:page', val)
})

const STATUS_OPTS = [
  { label: 'Todos Status', value: 'all' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Em Progresso', value: 'in_progress' },
  { label: 'Concluído', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' }
]

const statusConfig: Record<
  SaleStatus,
  { label: string, color: string, icon: string }
> = {
  pending: { label: 'Pendente', color: 'neutral', icon: 'i-heroicons-clock' },
  confirmed: {
    label: 'Confirmado',
    color: 'info',
    icon: 'i-heroicons-check-circle'
  },
  in_progress: {
    label: 'Em Progresso',
    color: 'warning',
    icon: 'i-heroicons-truck'
  },
  completed: {
    label: 'Concluído',
    color: 'success',
    icon: 'i-heroicons-check-badge'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'error',
    icon: 'i-heroicons-x-circle'
  }
}

const STATUS_ACTIONS: Record<
  SaleStatus,
  { label: string, next: SaleStatus }[]
> = {
  pending: [
    { label: 'Confirmar Pedido', next: 'confirmed' },
    { label: 'Cancelar', next: 'cancelled' }
  ],
  confirmed: [
    { label: 'Iniciar Entrega', next: 'in_progress' },
    { label: 'Cancelar', next: 'cancelled' }
  ],
  in_progress: [
    { label: 'Finalizar Entrega', next: 'completed' },
    { label: 'Voltar para Confirmado', next: 'confirmed' }
  ],
  completed: [],
  cancelled: [{ label: 'Reabrir como Pendente', next: 'pending' }]
}

const isBilled = (s: Sale) => s.status === 'completed'
const isLocked = (s: Sale) => {
  if (s.status === 'cancelled') return true
  if (s.status === 'completed') return !isAdmin.value
  return false
}

const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')

const canDelete = (s: Sale) => {
  if (s.status === 'cancelled') return false
  if (s.status === 'completed') return isAdmin.value
  return true
}

const canCancel = (s: Sale) => s.status !== 'cancelled'

const deleteTooltip = (s: Sale) => {
  if (s.status === 'cancelled')
    return 'Não é possível excluir vendas canceladas'
  if (s.status === 'completed' && !isAdmin.value)
    return 'Apenas administradores podem excluir vendas concluídas'
  return 'Excluir'
}

const downloadPdf = (id: number) => {
  window.open(`/api/sales/${id}/download`, '_blank')
}
</script>

<template>
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
            Lista de Vendas
          </h3>
        </div>
        <div class="flex items-center gap-2">
          <UInput
            v-model="localSearch"
            icon="i-heroicons-magnifying-glass"
            placeholder="Buscar cliente, nº..."
            size="sm"
            class="w-44 lg:w-56"
          />
          <USelect
            v-model="localStatusFilter"
            :items="STATUS_OPTS"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-36"
          />
        </div>
      </div>
    </template>

    <!-- Loading skeleton -->
    <div
      v-if="loading"
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

    <!-- Empty state -->
    <div
      v-else-if="sales.length === 0"
      class="flex flex-col items-center justify-center py-16 px-4"
    >
      <div class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
        <UIcon
          name="i-heroicons-shopping-cart"
          class="w-8 h-8 text-zinc-300 dark:text-zinc-600"
        />
      </div>
      <p class="text-sm font-bold text-zinc-900 dark:text-white">
        Nenhuma venda encontrada
      </p>
      <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">
        Ajuste a busca ou registre uma nova venda
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
              Nº
            </th>
            <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Cliente
            </th>
            <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell">
              Data
            </th>
            <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell">
              Entrega
            </th>
            <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell">
              Pagamento
            </th>
            <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Status
            </th>
            <th class="text-right px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Total
            </th>
            <th class="px-6 py-4" />
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <tr
            v-for="s in sales"
            :key="s.id"
            class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
          >
            <td class="px-6 py-4 font-black text-zinc-400 text-xs whitespace-nowrap">
              #{{ String(s.id).padStart(4, "0") }}
              <span
                v-if="s.quoteId"
                class="block text-[10px] text-zinc-300 dark:text-zinc-600"
              >
                ORC #{{ String(s.quoteId).padStart(4, "0") }}
              </span>
            </td>
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                  <span class="text-sm font-black text-primary-600 dark:text-primary-400">
                    {{ s.customerName.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors">
                    {{ s.customerName }}
                  </p>
                  <p
                    v-if="s.customerPhone"
                    class="text-xs text-zinc-400 truncate"
                  >
                    {{ s.customerPhone }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 text-zinc-500 text-xs whitespace-nowrap hidden md:table-cell">
              {{ formatDate(s.date) }}
            </td>
            <td class="px-4 py-4 hidden lg:table-cell">
              <span
                v-if="s.deliveryDate"
                class="text-xs text-zinc-500"
              >
                {{ formatDate(s.deliveryDate) }}
              </span>
              <span
                v-else
                class="text-xs text-zinc-300"
              >—</span>
            </td>
            <td class="px-4 py-4 hidden lg:table-cell">
              <span
                v-if="s.paymentMethod"
                class="text-xs text-zinc-500"
              >
                {{ s.paymentMethod }}
              </span>
              <span
                v-else
                class="text-xs text-zinc-300"
              >—</span>
            </td>
            <td class="px-4 py-4">
              <UDropdownMenu
                :items="
                  STATUS_ACTIONS[s.status].length
                    ? [
                      STATUS_ACTIONS[s.status].map((a) => ({
                        label: a.label,
                        onSelect: () => emit('updateStatus', s, a.next)
                      }))
                    ]
                    : undefined
                "
                :disabled="STATUS_ACTIONS[s.status].length === 0"
              >
                <UBadge
                  :color="statusConfig[s.status].color as any"
                  variant="subtle"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5 cursor-pointer"
                  :class="STATUS_ACTIONS[s.status].length ? 'hover:opacity-70' : 'cursor-default'"
                >
                  <template #leading>
                    <UIcon
                      :name="statusConfig[s.status].icon"
                      class="w-3.5 h-3.5"
                    />
                  </template>
                  {{ statusConfig[s.status].label }}
                </UBadge>
              </UDropdownMenu>
            </td>
            <td class="px-4 py-4 text-right">
              <span class="font-black tabular-nums text-base tracking-tighter text-zinc-900 dark:text-white">
                {{ formatCurrency(s.total) }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-1 transition-all">
                <!-- Edit button (primary action) -->
                <UTooltip :text="s.status === 'cancelled' ? 'Venda Cancelada' : isLocked(s) ? 'Ver Venda' : 'Editar Venda'">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="md"
                    class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    :disabled="s.status === 'cancelled'"
                    @click="emit('edit', s)"
                  />
                </UTooltip>
                <!-- More actions dropdown -->
                <UDropdownMenu
                  :items="[
                    [
                      {
                        label: 'Enviar via WhatsApp',
                        icon: 'i-simple-icons-whatsapp',
                        onSelect: () => emit('sendPdf', s)
                      },
                      {
                        label: 'Baixar PDF',
                        icon: 'i-heroicons-arrow-down-tray',
                        onSelect: () => downloadPdf(s.id)
                      }
                    ],
                    // Status actions
                    ...(STATUS_ACTIONS[s.status].length
                      ? [
                        STATUS_ACTIONS[s.status].map((a) => ({
                          label: a.label,
                          icon: a.next === 'completed' ? 'i-heroicons-check-badge' : a.next === 'cancelled' ? 'i-heroicons-x-circle' : 'i-heroicons-arrow-path',
                          color: a.next === 'completed' ? 'success' as const : a.next === 'cancelled' ? 'error' as const : undefined,
                          onSelect: () => emit('updateStatus', s, a.next)
                        }))
                      ]
                      : []),
                    // Bill action
                    ...(s.status !== 'cancelled' && !isBilled(s)
                      ? [
                        [
                          {
                            label: 'Faturar Venda',
                            icon: 'i-heroicons-banknotes',
                            color: 'success' as const,
                            onSelect: () => emit('bill', s)
                          }
                        ]
                      ]
                      : []),
                    // Cancel action
                    ...(canCancel(s)
                      ? [
                        [
                          {
                            label: 'Cancelar Venda',
                            icon: 'i-heroicons-no-symbol',
                            color: 'warning' as const,
                            onSelect: () => emit('cancel', s)
                          }
                        ]
                      ]
                      : []),
                    // Delete action
                    ...(canDelete(s)
                      ? [
                        [
                          {
                            label: 'Excluir Venda',
                            icon: 'i-heroicons-trash',
                            color: 'error' as const,
                            onSelect: () => emit('delete', s)
                          }
                        ]
                      ]
                      : [])
                  ]"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-ellipsis-vertical"
                    size="md"
                    class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    :loading="isSendingPdf === s.id"
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
          {{ stats.total }} vendas · página {{ page }} de {{ totalPages }}
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-heroicons-chevron-left"
            size="sm"
            class="rounded-xl"
            :disabled="page === 1"
            @click="localPage--"
          />
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-heroicons-chevron-right"
            size="sm"
            class="rounded-xl"
            :disabled="page >= totalPages"
            @click="localPage++"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>
