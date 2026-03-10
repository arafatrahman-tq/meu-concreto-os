<script setup lang="ts">
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Sale {
  id: number;
  customerName: string;
  total: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  date: string | number | Date;
  paymentMethod?: string | null;
}

defineProps<{ sales: Sale[] }>();

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

// Drizzle serialises timestamp columns as unix-seconds integers in JSON.
// Detect and convert to ms before constructing a Date.
const toDateSafe = (d: string | number | Date) => {
  if (typeof d === "number") return new Date(d < 1e10 ? d * 1000 : d);
  return new Date(d as string | number);
};

const formatDate = (d: string | number | Date) =>
  format(toDateSafe(d), "dd MMM", { locale: ptBR });

const statusMap: Record<
  string,
  { color: "success" | "error" | "info" | "warning" | "neutral"; label: string }
> = {
  completed: { color: "success", label: "Concluída" },
  confirmed: { color: "info", label: "Confirmada" },
  in_progress: { color: "info", label: "Em Entrega" },
  pending: { color: "warning", label: "Pendente" },
  cancelled: { color: "error", label: "Cancelada" },
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const avatarColor = (name: string) => {
  const colors = [
    "bg-green-100 text-green-700",
    "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx] ?? colors[0];
};
</script>

<template>
  <UCard
    class="flex flex-col h-full rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
    :ui="{
      header: 'px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
    }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-2 h-6 bg-primary-500 rounded-full" />
          <h3
            class="font-black text-zinc-900 dark:text-white uppercase tracking-tight"
          >
            Vendas Recentes
          </h3>
        </div>
        <UButton
          to="/vendas"
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
      v-if="sales.length === 0"
      class="flex flex-col items-center justify-center py-10 text-zinc-400 flex-1"
    >
      <UIcon
        name="i-heroicons-shopping-cart"
        class="w-10 h-10 mb-2 opacity-40"
      />
      <p class="text-sm font-bold">Nenhuma venda encontrada</p>
    </div>

    <div
      v-else
      class="divide-y divide-zinc-100 dark:divide-zinc-800 -mx-4 -my-3 px-1 flex-1"
    >
      <div
        v-for="sale in sales"
        :key="sale.id"
        class="flex items-center gap-4 py-3.5 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <!-- Avatar inicial -->
        <div
          class="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-black"
          :class="avatarColor(sale.customerName)"
        >
          {{ initials(sale.customerName) }}
        </div>

        <!-- Cliente -->
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate"
          >
            {{ sale.customerName }}
          </p>
          <p class="text-xs text-zinc-400 mt-0.5">
            {{ formatDate(sale.date) }}
            <span v-if="sale.paymentMethod"> · {{ sale.paymentMethod }}</span>
          </p>
        </div>

        <!-- Total + Status -->
        <div class="flex flex-col items-end gap-1 shrink-0">
          <span class="text-sm font-black text-zinc-900 dark:text-white">
            {{ formatCurrency(sale.total) }}
          </span>
          <UBadge
            :color="statusMap[sale.status]?.color ?? 'neutral'"
            variant="soft"
            size="xs"
            class="text-[10px] font-black uppercase tracking-wide"
          >
            {{ statusMap[sale.status]?.label ?? sale.status }}
          </UBadge>
        </div>
      </div>
    </div>
  </UCard>
</template>
