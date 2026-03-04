<script setup lang="ts">
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Transaction {
  id: number
  description: string
  amount: number
  type: 'income' | 'expense'
  status: 'pending' | 'paid' | 'cancelled'
  date: string | number | Date
  paymentMethod?: string | null
}

defineProps<{ transactions: Transaction[] }>()

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100
  )

// Drizzle serialises timestamp columns as unix-seconds integers in JSON.
// Detect and convert to ms before constructing a Date.
const toDateSafe = (d: string | number | Date) => {
  if (typeof d === 'number') return new Date(d < 1e10 ? d * 1000 : d)
  return new Date(d as string | number)
}

const formatDate = (d: string | number | Date) =>
  format(toDateSafe(d), 'dd MMM', { locale: ptBR })

const statusMap: Record<
  string,
  { color: 'success' | 'warning' | 'error', label: string }
> = {
  paid: { color: 'success', label: 'Pago' },
  pending: { color: 'warning', label: 'Pendente' },
  cancelled: { color: 'error', label: 'Cancelado' }
}
</script>

<template>
  <UCard class="flex flex-col h-full">
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-heroicons-banknotes"
              class="w-5 h-5 text-primary-500"
            />
          </div>
          <div>
            <h3
              class="text-sm font-black uppercase tracking-widest text-zinc-400"
            >
              Transações Recentes
            </h3>
            <p class="text-xs text-zinc-400 mt-0.5">
              Movimentações financeiras
            </p>
          </div>
        </div>
        <UButton
          to="/transacoes"
          color="neutral"
          variant="ghost"
          size="xs"
          trailing-icon="i-heroicons-arrow-right"
        >
          Ver todas
        </UButton>
      </div>
    </template>

    <div
      v-if="transactions.length === 0"
      class="flex flex-col items-center justify-center py-10 text-zinc-400 flex-1"
    >
      <UIcon
        name="i-heroicons-arrows-right-left"
        class="w-10 h-10 mb-2 opacity-40"
      />
      <p class="text-sm font-bold">
        Nenhuma transação encontrada
      </p>
    </div>

    <div
      v-else
      class="divide-y divide-zinc-100 dark:divide-zinc-800 -mx-4 -my-3 px-1 flex-1"
    >
      <div
        v-for="tx in transactions"
        :key="tx.id"
        class="flex items-center gap-4 py-3.5 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
      >
        <!-- Ícone tipo -->
        <div
          class="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
          :class="
            tx.type === 'income'
              ? 'bg-green-50 dark:bg-green-500/10 text-green-500'
              : 'bg-red-50 dark:bg-red-500/10 text-red-500'
          "
        >
          <UIcon
            :name="
              tx.type === 'income'
                ? 'i-heroicons-arrow-down-left'
                : 'i-heroicons-arrow-up-right'
            "
            class="w-4 h-4"
          />
        </div>

        <!-- Descrição -->
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate"
          >
            {{ tx.description }}
          </p>
          <p class="text-xs text-zinc-400 mt-0.5">
            {{ formatDate(tx.date) }}
            <span v-if="tx.paymentMethod"> · {{ tx.paymentMethod }}</span>
          </p>
        </div>

        <!-- Valor + Status -->
        <div class="flex flex-col items-end gap-1 shrink-0">
          <span
            class="text-sm font-black"
            :class="
              tx.type === 'income'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            "
          >
            {{ tx.type === "income" ? "+" : "-"
            }}{{ formatCurrency(tx.amount) }}
          </span>
          <UBadge
            :color="statusMap[tx.status]?.color ?? 'neutral'"
            variant="soft"
            size="xs"
            class="text-[10px] font-black uppercase tracking-wide"
          >
            {{ statusMap[tx.status]?.label ?? tx.status }}
          </UBadge>
        </div>
      </div>
    </div>
  </UCard>
</template>

