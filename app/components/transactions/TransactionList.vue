<script setup lang="ts">
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "~/types/transactions";

const props = defineProps<{
  transactions: Transaction[];
  page: number;
  pageSize: number;
  statusConfig: Record<
    TransactionStatus,
    { label: string; color: string; icon: string }
  >;
  typeConfig: Record<
    TransactionType,
    { label: string; color: string; icon: string; sign: string }
  >;
  statusActions: Record<
    TransactionStatus,
    { next: TransactionStatus; label: string }[]
  >;
}>();

const emit = defineEmits([
  "edit",
  "updateStatus",
  "delete",
  "generateInstallments",
  "update:page",
]);

const currentPage = computed({
  get: () => props.page,
  set: (v) => emit("update:page", v),
});

const topLevelTransactions = computed(() =>
  props.transactions.filter((t) => !t.parentTransactionId),
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(topLevelTransactions.value.length / props.pageSize)),
);

const pagedTopLevelTransactions = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize;
  return topLevelTransactions.value.slice(start, start + props.pageSize);
});

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

const formatDate = (v: string | number | null | undefined) =>
  v
    ? new Intl.DateTimeFormat("pt-BR").format(new Date(v as string | number))
    : "—";

const getVolume = (sale: any) => {
  if (!sale || !sale.items) return 0;
  return sale.items
    .filter((i: any) => i.unit === "m3")
    .reduce((acc: number, i: any) => acc + (i.quantity || 0), 0);
};

const expandedParentIds = ref<number[]>([]);

const childrenByParent = computed(() => {
  const grouped = new Map<number, Transaction[]>();

  for (const t of props.transactions) {
    if (!t.parentTransactionId) continue;
    const list = grouped.get(t.parentTransactionId) ?? [];
    list.push(t);
    grouped.set(t.parentTransactionId, list);
  }

  for (const [, list] of grouped) {
    list.sort(
      (a, b) =>
        (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0) ||
        new Date(a.date as string | number).getTime() -
          new Date(b.date as string | number).getTime(),
    );
  }

  return grouped;
});

const visibleRows = computed(() => {
  const rows: Array<{
    tx: Transaction;
    isChild: boolean;
    isExpandable: boolean;
    childCount: number;
  }> = [];

  for (const tx of pagedTopLevelTransactions.value) {
    const children = childrenByParent.value.get(tx.id) ?? [];
    const isExpandable = tx.isInstallmentParent && children.length > 0;

    rows.push({
      tx,
      isChild: false,
      isExpandable,
      childCount: children.length,
    });

    if (isExpandable && expandedParentIds.value.includes(tx.id)) {
      for (const child of children) {
        rows.push({
          tx: child,
          isChild: true,
          isExpandable: false,
          childCount: 0,
        });
      }
    }
  }

  return rows;
});

const isExpanded = (id: number) => expandedParentIds.value.includes(id);

const toggleParent = (id: number) => {
  if (isExpanded(id)) {
    expandedParentIds.value = expandedParentIds.value.filter((v) => v !== id);
    return;
  }

  expandedParentIds.value = [...expandedParentIds.value, id];
};

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages;
  }
});
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
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-2 h-6 bg-primary-500 rounded-full" />
          <h3
            class="font-black text-zinc-900 dark:text-white uppercase tracking-tight"
          >
            Registros do Período
          </h3>
        </div>
        <p
          class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400"
        >
          {{ topLevelTransactions.length }} entradas
        </p>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
            <th
              class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              Lançamento
            </th>
            <th
              class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              Tipo
            </th>
            <th
              class="text-right px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              Valor
            </th>
            <th
              class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              Status
            </th>
            <th
              class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
            >
              Data
            </th>
            <th
              class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell"
            >
              Pagamento
            </th>
            <th class="px-6 py-4" />
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <tr
            v-for="row in visibleRows"
            :key="`${row.isChild ? 'child' : 'row'}-${row.tx.id}`"
            :class="[
              'group transition-all duration-200',
              row.isChild
                ? 'bg-zinc-50/70 dark:bg-zinc-800/30'
                : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40',
            ]"
          >
            <td class="px-6 py-4">
              <div
                class="flex flex-col gap-1"
                :class="row.isChild ? 'pl-8' : ''"
              >
                <span
                  class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors"
                  >{{ row.tx.description }}</span
                >
                <div class="flex items-center gap-2">
                  <UButton
                    v-if="row.isExpandable"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :icon="
                      isExpanded(row.tx.id)
                        ? 'i-heroicons-chevron-down'
                        : 'i-heroicons-chevron-right'
                    "
                    class="rounded-md w-6 h-6 p-0"
                    @click.stop="toggleParent(row.tx.id)"
                  />
                  <span
                    v-if="row.tx.category"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    >{{ row.tx.category }}</span
                  >
                  <span
                    v-if="row.tx.sale"
                    class="text-[11px] font-bold text-zinc-400"
                  >
                    <UIcon
                      name="i-heroicons-shopping-bag"
                      class="w-3.5 h-3.5 inline mr-1"
                    />
                    {{ row.tx.sale.customerName }}
                  </span>
                  <div
                    v-if="row.tx.sale && getVolume(row.tx.sale) > 0"
                    class="flex items-center gap-1.5"
                  >
                    <div
                      class="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"
                    />
                    <span
                      class="text-[10px] font-black uppercase tracking-wider text-primary-500"
                    >
                      {{ getVolume(row.tx.sale) }} m³
                    </span>
                  </div>
                  <span
                    v-if="
                      row.tx.parentTransactionId &&
                      row.tx.installmentNumber &&
                      row.tx.installmentTotal
                    "
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                  >
                    Parcela {{ row.tx.installmentNumber }}/{{
                      row.tx.installmentTotal
                    }}
                  </span>
                  <span
                    v-if="row.tx.isInstallmentParent"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                  >
                    {{ row.childCount }} parcelas
                  </span>
                </div>
              </div>
            </td>
            <td class="px-4 py-4">
              <div class="flex items-center gap-2">
                <div
                  :class="[
                    typeConfig[row.tx.type].color === 'success'
                      ? 'bg-green-500'
                      : 'bg-red-500',
                    'w-1.5 h-1.5 rounded-full',
                  ]"
                />
                <span
                  class="text-xs font-bold text-zinc-600 dark:text-zinc-400"
                  >{{ typeConfig[row.tx.type].label }}</span
                >
              </div>
            </td>
            <td class="px-4 py-4 text-right">
              <span
                class="font-black tabular-nums text-base tracking-tighter"
                :class="
                  row.tx.type === 'income'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                "
              >
                {{ typeConfig[row.tx.type].sign
                }}{{ formatCurrency(row.tx.amount) }}
              </span>
            </td>
            <td class="px-4 py-4">
              <UBadge
                :color="statusConfig[row.tx.status].color as any"
                variant="subtle"
                class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
              >
                {{ statusConfig[row.tx.status].label }}
              </UBadge>
            </td>
            <td class="px-4 py-4 hidden lg:table-cell">
              <div class="flex flex-col">
                <span
                  class="text-xs font-bold text-zinc-600 dark:text-zinc-300"
                  >{{ formatDate(row.tx.date) }}</span
                >
                <span
                  v-if="row.tx.dueDate"
                  class="text-[10px] text-zinc-400 font-medium"
                  >Ven: {{ formatDate(row.tx.dueDate) }}</span
                >
              </div>
            </td>
            <td class="px-4 py-4 hidden xl:table-cell">
              <div v-if="row.tx.paymentMethod" class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-credit-card"
                  class="w-3.5 h-3.5 text-zinc-400"
                />
                <span
                  class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight"
                  >{{ row.tx.paymentMethod }}</span
                >
              </div>
              <span v-else class="text-zinc-300 dark:text-zinc-700">—</span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2 transition-all">
                <UButton
                  v-if="
                    !row.tx.parentTransactionId && !row.tx.isInstallmentParent
                  "
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-receipt-percent"
                  size="md"
                  class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                  @click="emit('generateInstallments', row.tx)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-pencil-square"
                  size="md"
                  class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                  @click="emit('edit', row.tx)"
                />
                <UDropdownMenu
                  :items="[
                    statusActions[row.tx.status].map((a) => ({
                      label: a.label,
                      icon: statusConfig[a.next].icon,
                      onSelect: () => emit('updateStatus', row.tx, a.next),
                    })),
                    [
                      {
                        label: 'Excluir Lançamento',
                        icon: 'i-heroicons-trash',
                        color: 'error' as const,
                        onSelect: () => emit('delete', row.tx),
                      },
                    ],
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

    <template v-if="totalPages > 1" #footer>
      <div class="flex items-center justify-between">
        <p class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
          Página {{ currentPage }} de {{ totalPages }}
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-heroicons-chevron-left"
            size="sm"
            class="rounded-xl"
            :disabled="currentPage === 1"
            @click="currentPage--"
          />
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-heroicons-chevron-right"
            size="sm"
            class="rounded-xl"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>
