<script setup lang="ts">
import type { Quote, QuoteStatus } from "~/types/sales";
import { formatCurrency, formatDate } from "~/utils/formatters";

defineProps<{
  paginatedQuotes: Quote[];
  loadingQuotes: boolean;
  filteredQuotes: Quote[];
  pageSize: number;
  totalPages: number;
  statusConfig: Record<
    QuoteStatus,
    { label: string; color: string; icon: string }
  >;
  isSendingPdf: number | null;
  isUpdatingStatus?: number | null;
}>();

const emit = defineEmits<{
  (e: "edit", q: Quote): void;
  (e: "delete", q: Quote): void;
  (e: "duplicate", q: Quote): void;
  (e: "sendPdf", q: Quote): void;
  (e: "updateStatus", q: Quote, status: QuoteStatus): void;
}>();

const search = defineModel<string>("search");
const statusFilter = defineModel<QuoteStatus | "all">("statusFilter");
const page = defineModel<number>("page", { default: 1 });

const STATUS_OPTS = [
  { label: "Todos", value: "all" },
  { label: "Rascunho", value: "draft" },
  { label: "Enviado", value: "sent" },
  { label: "Aprovado", value: "approved" },
  { label: "Rejeitado", value: "rejected" },
  { label: "Expirado", value: "expired" },
];

const STATUS_ACTIONS: Record<
  QuoteStatus,
  { next: QuoteStatus; label: string }[]
> = {
  draft: [{ next: "sent", label: "Marcar como Enviado" }],
  sent: [
    { next: "approved", label: "Aprovar" },
    { next: "rejected", label: "Rejeitar" },
  ],
  approved: [],
  rejected: [{ next: "draft", label: "Reabrir como Rascunho" }],
  expired: [{ next: "draft", label: "Reabrir como Rascunho" }],
};

const downloadPdf = (id: number) => {
  window.open(`/api/quotes/${id}/download`, "_blank");
};
</script>

<template>
  <UCard>
    <!-- Toolbar -->
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <h3
          class="text-sm font-black uppercase tracking-widest text-zinc-400 shrink-0"
        >
          Lista de Orçamentos
        </h3>
        <div class="flex items-center gap-2 flex-wrap justify-end">
          <!-- Search -->
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            placeholder="Buscar cliente, nº..."
            size="sm"
            class="w-44 lg:w-56"
          />
          <!-- Status filter -->
          <USelect
            v-model="statusFilter"
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
    <div v-if="loadingQuotes" class="space-y-3 py-2">
      <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredQuotes.length === 0"
      class="flex flex-col items-center justify-center py-16 text-zinc-400"
    >
      <UIcon name="i-heroicons-document-text" class="w-12 h-12 mb-3" />
      <p class="text-sm font-bold">Nenhum orçamento encontrado</p>
      <p class="text-xs mt-1">Ajuste a busca ou crie um novo orçamento</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto -mx-4 sm:mx-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-100 dark:border-zinc-800">
            <th
              class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap"
            >
              Nº
            </th>
            <th
              class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
            >
              Cliente
            </th>
            <th
              class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
            >
              Data
            </th>
            <th
              class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
            >
              Validade
            </th>
            <th
              class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
            >
              Status
            </th>
            <th
              class="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
            >
              Total
            </th>
            <th
              class="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
            >
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="q in paginatedQuotes"
            :key="q.id"
            class="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors group relative"
          >
            <!-- ID -->
            <td
              class="px-4 py-3.5 font-black text-zinc-400 text-xs whitespace-nowrap"
            >
              #{{ String(q.id).padStart(4, "0") }}
            </td>
            <!-- Customer -->
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
                >
                  <span
                    class="text-xs font-black text-primary-600 dark:text-primary-400"
                  >
                    {{ q.customerName.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0">
                  <p
                    class="font-bold text-zinc-900 dark:text-white truncate max-w-35 sm:max-w-50"
                  >
                    {{ q.customerName }}
                  </p>
                  <p
                    v-if="q.customerPhone"
                    class="text-xs text-zinc-400 truncate"
                  >
                    {{ q.customerPhone }}
                  </p>
                </div>
              </div>
            </td>
            <!-- Date -->
            <td
              class="px-4 py-3.5 text-zinc-500 text-xs whitespace-nowrap hidden md:table-cell"
            >
              {{ formatDate(q.createdAt) }}
            </td>
            <!-- Valid until -->
            <td class="px-4 py-3.5 hidden lg:table-cell">
              <span
                v-if="q.validUntil"
                class="text-xs text-zinc-500"
                :class="{
                  'text-red-500 font-bold':
                    new Date(q.validUntil as any) < new Date() &&
                    q.status !== 'approved',
                }"
              >
                {{ formatDate(q.validUntil) }}
              </span>
              <span v-else class="text-xs text-zinc-300">—</span>
            </td>
            <!-- Status -->
            <td class="px-4 py-3.5">
              <UDropdownMenu
                :items="
                  STATUS_ACTIONS[q.status].length
                    ? [
                        STATUS_ACTIONS[q.status].map((a) => ({
                          label: a.label,
                          onSelect: () => emit('updateStatus', q, a.next),
                        })),
                      ]
                    : undefined
                "
                :disabled="STATUS_ACTIONS[q.status].length === 0"
              >
                <UBadge
                  :color="statusConfig[q.status].color as any"
                  variant="soft"
                  size="sm"
                  :icon="statusConfig[q.status].icon"
                  :class="[
                    STATUS_ACTIONS[q.status].length &&
                    isUpdatingStatus !== q.id
                      ? 'cursor-pointer'
                      : 'cursor-default',
                    isUpdatingStatus === q.id && 'opacity-60',
                  ]"
                >
                  <UIcon
                    v-if="isUpdatingStatus === q.id"
                    name="i-heroicons-arrow-path"
                    class="w-3 h-3 animate-spin mr-1"
                  />
                  {{ statusConfig[q.status].label }}
                </UBadge>
              </UDropdownMenu>
            </td>
            <!-- Total -->
            <td
              class="px-4 py-3.5 text-right font-black text-zinc-900 dark:text-white whitespace-nowrap"
            >
              {{ formatCurrency(q.total) }}
            </td>
            <!-- Actions -->
            <td class="px-4 py-3.5 text-right">
              <div
                class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <UTooltip text="Enviar via WhatsApp">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-simple-icons-whatsapp"
                    size="xs"
                    :loading="isSendingPdf === q.id"
                    :disabled="isSendingPdf !== null"
                    @click="emit('sendPdf', q)"
                  />
                </UTooltip>
                <UTooltip text="Baixar PDF">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    size="xs"
                    @click="downloadPdf(q.id)"
                  />
                </UTooltip>
                <UTooltip text="Duplicar como Rascunho">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-document-duplicate"
                    size="xs"
                    @click="emit('duplicate', q)"
                  />
                </UTooltip>
                <UTooltip
                  v-if="q.status === 'approved'"
                  text="Converter em Venda"
                >
                  <UButton
                    color="primary"
                    variant="ghost"
                    icon="i-heroicons-shopping-cart"
                    size="xs"
                    @click="navigateTo(`/vendas?quoteId=${q.id}`)"
                  />
                </UTooltip>
                <UTooltip
                  :text="
                    q.status === 'approved'
                      ? 'Ver Orçamento'
                      : 'Editar Orçamento'
                  "
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="xs"
                    :disabled="q.status === 'approved'"
                    @click="q.status !== 'approved' && emit('edit', q)"
                  />
                </UTooltip>
                <UTooltip text="Excluir">
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    size="xs"
                    :disabled="q.status === 'approved'"
                    @click="q.status !== 'approved' && emit('delete', q)"
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
      <div
        v-if="filteredQuotes.length > pageSize"
        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1"
      >
        <p class="text-xs text-zinc-400">
          {{ filteredQuotes.length }} orçamentos · página {{ page }} de
          {{ totalPages }}
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-chevron-left"
            size="xs"
            :disabled="page === 1"
            @click="page--"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-chevron-right"
            size="xs"
            :disabled="page >= totalPages"
            @click="page++"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>
