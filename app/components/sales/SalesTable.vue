<script setup lang="ts">
import type { Sale, SaleStatus } from '../../types/sales'

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
  'bill': [sale: Sale]
  'sendPdf': [sale: Sale]
  'updateStatus': [sale: Sale, next: SaleStatus]
}>()

const localSearch = computed({
  get: () => props.search,
  set: (val) => emit('update:search', val)
})

const localStatusFilter = computed({
  get: () => props.statusFilter,
  set: (val) => emit('update:statusFilter', val)
})

const localPage = computed({
  get: () => props.page,
  set: (val) => emit('update:page', val)
})

const STATUS_OPTS = [
  { label: 'Todos Status', value: 'all' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Em Progresso', value: 'in_progress' },
  { label: 'Concluído', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' }
]

const statusConfig: Record<SaleStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pendente', color: 'neutral', icon: 'i-heroicons-clock' },
  confirmed: { label: 'Confirmado', color: 'info', icon: 'i-heroicons-check-circle' },
  in_progress: { label: 'Em Progresso', color: 'warning', icon: 'i-heroicons-truck' },
  completed: { label: 'Concluído', color: 'success', icon: 'i-heroicons-check-badge' },
  cancelled: { label: 'Cancelado', color: 'error', icon: 'i-heroicons-x-circle' }
}

const STATUS_ACTIONS: Record<SaleStatus, { label: string; next: SaleStatus }[]> = {
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
const isLocked = (s: Sale) => s.status === 'completed' || s.status === 'cancelled'

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val / 100)
}

const formatDate = (date?: string | number | Date | null) => {
  if (!date) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  } catch (e) {
    return ''
  }
}

const downloadPdf = (id: number) => {
  window.open(`/api/sales/${id}/download`, '_blank')
}
</script>

<template>

    <!-- ── Table Card ── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-sm font-black uppercase tracking-widest text-zinc-400 shrink-0">
            Vendas
          </h3>
          <div class="flex items-center gap-2 flex-wrap justify-end">
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
      <div v-if="loading" class="space-y-3 py-2">
        <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="sales.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon name="i-heroicons-shopping-cart" class="w-12 h-12 mb-3" />
        <p class="text-sm font-bold">Nenhuma venda encontrada</p>
        <p class="text-xs mt-1">Ajuste a busca ou registre uma nova venda</p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800">
              <th class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">Nº</th>
              <th class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400">Cliente</th>
              <th class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell">Data</th>
              <th class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell">Entrega</th>
              <th class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell">Pagamento</th>
              <th class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400">Status</th>
              <th class="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400">Total</th>
              <th class="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in sales"
              :key="s.id"
              class="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors group relative"
            >
              <td class="px-4 py-3.5 font-black text-zinc-400 text-xs whitespace-nowrap">
                #{{ String(s.id).padStart(4, "0") }}
                <span v-if="s.quoteId" class="block text-[10px] text-zinc-300 dark:text-zinc-600">
                  ORC #{{ String(s.quoteId).padStart(4, "0") }}
                </span>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                    <span class="text-xs font-black text-primary-600 dark:text-primary-400">
                      {{ s.customerName.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-zinc-900 dark:text-white truncate max-w-35 sm:max-w-50">
                      {{ s.customerName }}
                    </p>
                    <p v-if="s.customerPhone" class="text-xs text-zinc-400 truncate">
                      {{ s.customerPhone }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5 text-zinc-500 text-xs whitespace-nowrap hidden md:table-cell">
                {{ formatDate(s.date) }}
              </td>
              <td class="px-4 py-3.5 hidden lg:table-cell">
                <span v-if="s.deliveryDate" class="text-xs text-zinc-500">
                  {{ formatDate(s.deliveryDate) }}
                </span>
                <span v-else class="text-xs text-zinc-300">—</span>
              </td>
              <td class="px-4 py-3.5 hidden lg:table-cell">
                <span v-if="s.paymentMethod" class="text-xs text-zinc-500">
                  {{ s.paymentMethod }}
                </span>
                <span v-else class="text-xs text-zinc-300">—</span>
              </td>
              <td class="px-4 py-3.5">
                <UDropdownMenu
                  :items="
                    STATUS_ACTIONS[s.status].length
                      ? [
                          STATUS_ACTIONS[s.status].map((a) => ({
                            label: a.label,
                            onSelect: () => emit('updateStatus', s, a.next),
                          })),
                        ]
                      : undefined
                  "
                  :disabled="STATUS_ACTIONS[s.status].length === 0"
                >
                  <UBadge
                    :color="statusConfig[s.status].color as any"
                    variant="soft"
                    size="sm"
                    :icon="statusConfig[s.status].icon"
                    :class="STATUS_ACTIONS[s.status].length ? 'cursor-pointer' : 'cursor-default'"
                  >
                    {{ statusConfig[s.status].label }}
                  </UBadge>
                </UDropdownMenu>
              </td>
              <td class="px-4 py-3.5 text-right font-black text-zinc-900 dark:text-white whitespace-nowrap">
                {{ formatCurrency(s.total) }}
              </td>
              <td class="px-4 py-3.5 text-right">
                <div class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <UTooltip text="Enviar via WhatsApp">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-simple-icons-whatsapp"
                      size="xs"
                      :loading="isSendingPdf === s.id"
                      :disabled="isSendingPdf !== null"
                      @click="emit('sendPdf', s)"
                    />
                  </UTooltip>
                  <UTooltip text="Baixar PDF">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-arrow-down-tray"
                      size="xs"
                      @click="downloadPdf(s.id)"
                    />
                  </UTooltip>
                  <UTooltip :text="isBilled(s) ? 'Já Faturada' : 'Faturar'">
                    <UButton
                      :color="isBilled(s) ? 'neutral' : 'success'"
                      variant="ghost"
                      :icon="isBilled(s) ? 'i-heroicons-check-badge' : 'i-heroicons-banknotes'"
                      size="xs"
                      :disabled="isBilled(s) || s.status === 'cancelled'"
                      @click="!isBilled(s) && s.status !== 'cancelled' && emit('bill', s)"
                    />
                  </UTooltip>
                  <UTooltip :text="isLocked(s) ? 'Ver Venda' : 'Editar Venda'">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="xs"
                      :disabled="isLocked(s)"
                      @click="!isLocked(s) && emit('edit', s)"
                    />
                  </UTooltip>
                  <UTooltip text="Excluir">
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="xs"
                      :disabled="isLocked(s) || isBilled(s)"
                      @click="!isLocked(s) && !isBilled(s) && emit('delete', s)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <template #footer>
        <div v-if="totalPages > 1" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
          <p class="text-xs text-zinc-400">
            Página {{ page }} de {{ totalPages }}
          </p>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-chevron-left"
              size="xs"
              :disabled="page === 1"
              @click="localPage--"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-chevron-right"
              size="xs"
              :disabled="page >= totalPages"
              @click="localPage++"
            />
          </div>
        </div>
      </template>
    </UCard>
</template>
