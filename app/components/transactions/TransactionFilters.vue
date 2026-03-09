<script setup lang="ts">
import type { Transaction, TransactionType, TransactionStatus } from "~/types/transactions";

const search = defineModel<string>('search');
const typeFilter = defineModel<TransactionType | "all">('typeFilter');
const statusFilter = defineModel<TransactionStatus | "all">('statusFilter');
const dateStart = defineModel<string>('dateStart');
const dateEnd = defineModel<string>('dateEnd');

defineProps<{
  loadingPDF: boolean;
  hasTransactions: boolean;
}>();

const emit = defineEmits(['download', 'clear']);

const TYPE_OPTS = [
  { label: "Todos os tipos", value: "all" },
  { label: "Receita", value: "income" },
  { label: "Despesa", value: "expense" },
];

const STATUS_OPTS = [
  { label: "Todos os status", value: "all" },
  { label: "Pendente", value: "pending" },
  { label: "Pago", value: "paid" },
  { label: "Cancelado", value: "cancelled" },
];

const isFiltered = computed(() => {
  return search.value || typeFilter.value !== 'all' || statusFilter.value !== 'all' || dateStart.value || dateEnd.value;
});
</script>

<template>
  <UCard
    :ui="{ body: 'p-4 sm:p-6', header: 'hidden', footer: 'hidden' }"
    class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
  >
    <div class="flex flex-col gap-6">
      <div class="flex flex-col lg:flex-row gap-4 items-end">
        <div class="flex-1 w-full">
          <UFormField label="Pesquisar">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Descrição, categoria, forma de pagamento..."
              class="w-full"
              size="lg"
            />
          </UFormField>
        </div>

        <div class="w-full lg:w-48">
          <UFormField label="Tipo">
            <USelect
              v-model="typeFilter"
              :items="TYPE_OPTS"
              value-attribute="value"
              class="w-full"
              size="lg"
            />
          </UFormField>
        </div>

        <div class="w-full lg:w-48">
          <UFormField label="Status">
            <USelect
              v-model="statusFilter"
              :items="STATUS_OPTS"
              value-attribute="value"
              class="w-full"
              size="lg"
            />
          </UFormField>
        </div>

        <div class="flex gap-2 w-full lg:w-auto">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-heroicons-funnel"
            size="lg"
            class="flex-1 lg:flex-none justify-center"
            :active="!!dateStart || !!dateEnd"
          >
            Filtros
          </UButton>
          <UButton
            v-if="isFiltered"
            color="error"
            variant="ghost"
            icon="i-heroicons-x-mark"
            size="lg"
            @click="emit('clear')"
          >
            Limpar
          </UButton>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-6 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
        <div class="flex flex-col sm:flex-row items-end gap-4 w-full sm:w-auto">
          <div class="w-full sm:w-40">
            <UFormField label="De:">
              <UInput v-model="dateStart" type="date" size="lg" class="w-full" />
            </UFormField>
          </div>
          <div class="w-full sm:w-40">
            <UFormField label="Até:">
              <UInput v-model="dateEnd" type="date" size="lg" class="w-full" />
            </UFormField>
          </div>
        </div>

        <div class="flex items-center gap-4 ml-auto pt-4 sm:pt-0">
          <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400">Exportar</p>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-arrow-down-tray"
            size="sm"
            :loading="loadingPDF"
            :disabled="!hasTransactions"
            @click="emit('download')"
          >
            PDF
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
