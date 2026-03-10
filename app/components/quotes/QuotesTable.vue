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
  (e: "cancel", q: Quote): void;
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

const getStatusActions = (status: QuoteStatus) =>
  isManagerOrAdmin.value ? STATUS_ACTIONS[status] : [];

const downloadPdf = (id: number) => {
  window.open(`/api/quotes/${id}/download`, "_blank");
};

const { user } = useAuth();
const isManagerOrAdmin = computed(
  () => user.value?.role === "admin" || user.value?.role === "manager",
);

const isExpired = (date: string | number | null | undefined): boolean => {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime()) && d < new Date();
};

const canEdit = (status: QuoteStatus): boolean => {
  return true;
};

const canDelete = (status: QuoteStatus): boolean => {
  return isManagerOrAdmin.value;
};

const canCancel = (status: QuoteStatus): boolean => {
  if (!isManagerOrAdmin.value) return false;
  return status !== "rejected";
};
</script>

<template>
  <UCard
    :ui="{
      body: 'p-0 sm:p-0',
      header: 'p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
      footer: 'p-4 border-t border-zinc-100 dark:border-zinc-800',
    }"
    class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden"
  >
    <!-- Toolbar -->
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-2 h-6 bg-primary-500 rounded-full" />
          <h3
            class="font-black text-zinc-900 dark:text-white uppercase tracking-tight"
          >
            Lista de Orçamentos
          </h3>
        </div>
        <div class="flex items-center gap-2">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            placeholder="Buscar cliente, nº..."
            size="sm"
            class="w-44 lg:w-56"
          />
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
    <div
      v-if="loadingQuotes"
      class="divide-y divide-zinc-100 dark:divide-zinc-800/50"
    >
      <div v-for="i in 6" :key="i" class="px-6 py-4">
        <USkeleton class="h-12 rounded-xl" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredQuotes.length === 0"
      class="flex flex-col items-center justify-center py-16 px-4"
    >
      <div
        class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4"
      >
        <UIcon
          name="i-heroicons-document-text"
          class="w-8 h-8 text-zinc-300 dark:text-zinc-600"
        />
      </div>
      <p class="text-sm font-bold text-zinc-900 dark:text-white">
        Nenhum orçamento encontrado
      </p>
      <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">
        Ajuste a busca ou crie um novo orçamento
      </p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
            <th
              class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap"
            >
              Nº
            </th>
            <th
              class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              Cliente
            </th>
            <th
              class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
            >
              Data
            </th>
            <th
              class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
            >
              Validade
            </th>
            <th
              class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              Status
            </th>
            <th
              class="text-right px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              Total
            </th>
            <th class="px-6 py-4" />
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <tr
            v-for="q in paginatedQuotes"
            :key="q.id"
            class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
          >
            <!-- ID -->
            <td
              class="px-6 py-4 font-black text-zinc-400 text-xs whitespace-nowrap"
            >
              #{{ String(q.id).padStart(4, "0") }}
            </td>
            <!-- Customer -->
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
                >
                  <span
                    class="text-sm font-black text-primary-600 dark:text-primary-400"
                  >
                    {{ q.customerName.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0">
                  <p
                    class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors"
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
              class="px-4 py-4 text-zinc-500 text-xs whitespace-nowrap hidden md:table-cell"
            >
              {{ formatDate(q.createdAt) }}
            </td>
            <!-- Valid until -->
            <td class="px-4 py-4 hidden lg:table-cell">
              <span
                v-if="q.validUntil"
                class="text-xs text-zinc-500"
                :class="{
                  'text-red-500 font-bold':
                    isExpired(q.validUntil) && q.status !== 'approved',
                }"
              >
                {{ formatDate(q.validUntil) }}
              </span>
              <span v-else class="text-xs text-zinc-300">—</span>
            </td>
            <!-- Status -->
            <td class="px-4 py-4">
              <UDropdownMenu
                :items="
                  getStatusActions(q.status).length
                    ? [
                        getStatusActions(q.status).map((a) => ({
                          label: a.label,
                          onSelect: () => emit('updateStatus', q, a.next),
                        })),
                      ]
                    : undefined
                "
                :disabled="getStatusActions(q.status).length === 0"
              >
                <UBadge
                  :color="statusConfig[q.status].color as any"
                  variant="subtle"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5 cursor-pointer"
                  :class="[
                    getStatusActions(q.status).length &&
                    isUpdatingStatus !== q.id
                      ? 'cursor-pointer hover:opacity-70'
                      : 'cursor-default',
                    isUpdatingStatus === q.id && 'opacity-60',
                  ]"
                >
                  <template #leading>
                    <UIcon
                      v-if="isUpdatingStatus === q.id"
                      name="i-heroicons-arrow-path"
                      class="w-3 h-3 animate-spin"
                    />
                    <UIcon
                      v-else
                      :name="statusConfig[q.status].icon"
                      class="w-3.5 h-3.5"
                    />
                  </template>
                  {{ statusConfig[q.status].label }}
                </UBadge>
              </UDropdownMenu>
              <UBadge
                v-if="isExpired(q.validUntil) && q.status === 'sent'"
                color="error"
                variant="subtle"
                size="xs"
                class="mt-1 block w-fit font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
              >
                Expirado
              </UBadge>
            </td>
            <!-- Total -->
            <td class="px-4 py-4 text-right">
              <span
                class="font-black tabular-nums text-base tracking-tighter text-zinc-900 dark:text-white"
              >
                {{ formatCurrency(q.total) }}
              </span>
            </td>
            <!-- Actions (Design System: Edit + Dropdown) -->
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-1 transition-all">
                <!-- Quick actions for approved quotes -->
                <template v-if="q.status === 'approved'">
                  <UTooltip text="Converter em Venda">
                    <UButton
                      color="primary"
                      variant="ghost"
                      icon="i-heroicons-shopping-cart"
                      size="md"
                      class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                      @click="navigateTo(`/vendas?quoteId=${q.id}`)"
                    />
                  </UTooltip>
                </template>
                <!-- Edit button -->
                <UTooltip
                  :text="
                    canEdit(q.status) ? 'Editar Orçamento' : 'Ver Orçamento'
                  "
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="md"
                    class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    :disabled="!canEdit(q.status)"
                    @click="canEdit(q.status) && emit('edit', q)"
                  />
                </UTooltip>
                <!-- More actions dropdown -->
                <UDropdownMenu
                  :items="[
                    [
                      {
                        label: 'Enviar via WhatsApp',
                        icon: 'i-simple-icons-whatsapp',
                        onSelect: () => emit('sendPdf', q),
                      },
                      {
                        label: 'Baixar PDF',
                        icon: 'i-heroicons-arrow-down-tray',
                        onSelect: () => downloadPdf(q.id),
                      },
                      {
                        label: 'Duplicar como Rascunho',
                        icon: 'i-heroicons-document-duplicate',
                        onSelect: () => emit('duplicate', q),
                      },
                    ],
                    // Status actions
                    ...(getStatusActions(q.status).length
                      ? [
                          getStatusActions(q.status).map((a) => ({
                            label: a.label,
                            icon:
                              a.next === 'approved'
                                ? 'i-heroicons-check'
                                : a.next === 'rejected'
                                  ? 'i-heroicons-x-mark'
                                  : 'i-heroicons-arrow-path',
                            color:
                              a.next === 'approved'
                                ? ('success' as const)
                                : a.next === 'rejected'
                                  ? ('error' as const)
                                  : undefined,
                            onSelect: () => emit('updateStatus', q, a.next),
                          })),
                        ]
                      : []),
                    // Cancel action
                    ...(canCancel(q.status)
                      ? [
                          [
                            {
                              label: 'Cancelar Orçamento',
                              icon: 'i-heroicons-no-symbol',
                              color: 'warning' as const,
                              onSelect: () => emit('cancel', q),
                            },
                          ],
                        ]
                      : []),
                    // Delete action
                    ...(canDelete(q.status)
                      ? [
                          [
                            {
                              label: 'Excluir Orçamento',
                              icon: 'i-heroicons-trash',
                              color: 'error' as const,
                              onSelect: () => emit('delete', q),
                            },
                          ],
                        ]
                      : []),
                  ]"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-ellipsis-vertical"
                    size="md"
                    class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    :loading="isSendingPdf === q.id"
                  />
                </UDropdownMenu>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <template v-if="filteredQuotes.length > pageSize" #footer>
      <div class="flex items-center justify-between">
        <p class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
          {{ filteredQuotes.length }} orçamentos · página {{ page }} de
          {{ totalPages }}
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
</template>
