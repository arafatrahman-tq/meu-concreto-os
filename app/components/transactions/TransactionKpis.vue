<script setup lang="ts">
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "~/types/transactions";

const props = defineProps<{
  kpis: {
    income: number;
    expense: number;
    balance: number;
    pending: number;
    pendingCount: number;
    totalCount: number;
  };
}>();

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

const kpiItems = computed(() => [
  {
    label: "Receitas (Pagas)",
    value: formatCurrency(props.kpis.income),
    suffix: "entradas confirmadas",
    icon: "i-heroicons-arrow-trending-up",
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-500/10",
  },
  {
    label: "Despesas (Pagas)",
    value: formatCurrency(props.kpis.expense),
    suffix: "saídas do caixa",
    icon: "i-heroicons-arrow-trending-down",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-500/10",
  },
  {
    label: "Saldo Líquido",
    value: formatCurrency(props.kpis.balance),
    suffix:
      props.kpis.balance >= 0 ? "em conta (positivo)" : "em conta (negativo)",
    icon: "i-heroicons-banknotes",
    color: props.kpis.balance >= 0 ? "text-primary-500" : "text-red-500",
    bg:
      props.kpis.balance >= 0
        ? "bg-primary-50 dark:bg-primary-500/10"
        : "bg-red-50 dark:bg-red-500/10",
  },
  {
    label: "A Receber/Pagar",
    value: formatCurrency(props.kpis.pending),
    suffix: `${props.kpis.pendingCount} pendências`,
    icon: "i-heroicons-clock",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
]);
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
    <div
      v-for="(kpi, i) in kpiItems"
      :key="i"
      class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div class="flex items-center justify-between gap-2">
        <span
          class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-tight"
        >
          {{ kpi.label }}
        </span>
        <div
          :class="[
            kpi.bg,
            'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs',
          ]"
        >
          <UIcon :name="kpi.icon" :class="['w-6 h-6', kpi.color]" />
        </div>
      </div>
      <p
        class="text-3xl font-black tabular-nums tracking-tighter"
        :class="kpi.color.includes('primary') ? 'text-primary-500' : kpi.color"
      >
        {{ kpi.value }}
      </p>
      <div class="flex items-center gap-1.5 -mt-2">
        <div :class="[kpi.color, 'w-1.5 h-1.5 rounded-full animate-pulse']" />
        <p class="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
          {{ kpi.suffix }}
        </p>
      </div>
    </div>
  </div>
</template>
