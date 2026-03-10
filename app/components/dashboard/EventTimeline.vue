<script setup lang="ts">
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardEvent {
  id: string;
  dateMs: number;
  title: string;
  description: string;
  amount: number;
  amountTone: "positive" | "negative" | "neutral";
  tag: string;
}

const props = defineProps<{
  events: DashboardEvent[];
}>();

const page = ref(1);
const pageSize = 4;

const totalPages = computed(() =>
  Math.max(1, Math.ceil((props.events?.length ?? 0) / pageSize)),
);

const paginatedEvents = computed(() => {
  const start = (page.value - 1) * pageSize;
  return props.events.slice(start, start + pageSize);
});

watch(
  () => props.events.length,
  () => {
    if (page.value > totalPages.value) {
      page.value = totalPages.value;
    }
  },
);

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

const formatDateTime = (dateMs: number) =>
  format(new Date(dateMs), "dd/MM HH:mm", { locale: ptBR });
</script>

<template>
  <UCard
    class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
    :ui="{
      header: 'px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
      body: 'p-4 sm:p-6',
    }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-2 h-6 bg-zinc-700 dark:bg-zinc-300 rounded-full" />
        <h3
          class="font-black text-zinc-900 dark:text-white uppercase tracking-tight"
        >
          Linha do Tempo Operacional
        </h3>
      </div>
    </template>

    <div v-if="events.length" class="space-y-3">
      <div
        v-for="event in paginatedEvents"
        :key="event.id"
        class="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-3 sm:p-4 bg-white dark:bg-zinc-900"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p
              class="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate"
            >
              {{ event.title }}
            </p>
            <p class="text-xs text-zinc-500 mt-0.5">
              {{ event.description }} · {{ formatDateTime(event.dateMs) }}
            </p>
          </div>
          <div class="text-right shrink-0">
            <p
              class="text-sm font-black"
              :class="
                event.amountTone === 'positive'
                  ? 'text-green-600 dark:text-green-400'
                  : event.amountTone === 'negative'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-zinc-600 dark:text-zinc-300'
              "
            >
              {{
                event.amountTone === "negative"
                  ? "-"
                  : event.amountTone === "positive"
                    ? "+"
                    : ""
              }}{{ formatCurrency(event.amount) }}
            </p>
            <p
              class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5"
            >
              {{ event.tag }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-between pt-2">
        <p class="text-xs text-zinc-500 font-bold">
          Página {{ page }} de {{ totalPages }}
        </p>

        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="soft"
            size="xs"
            icon="i-heroicons-chevron-left"
            :disabled="page <= 1"
            @click="page = Math.max(1, page - 1)"
          >
            Anterior
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            size="xs"
            trailing-icon="i-heroicons-chevron-right"
            :disabled="page >= totalPages"
            @click="page = Math.min(totalPages, page + 1)"
          >
            Próxima
          </UButton>
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center"
    >
      <p class="text-sm font-bold text-zinc-500">
        Sem eventos relevantes no período.
      </p>
    </div>
  </UCard>
</template>
