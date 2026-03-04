<script setup lang="ts">
import type {
  Customer,
  CustomerQuote,
  CustomerSale,
  ActivityFilter,
} from "~/types/customers";
import { CUSTOMER_ACTIVITY_OPTS } from "~/types/customers";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Clientes | Meu Concreto" });

const { companyId } = useAuth();

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: customersData,
  pending: loadingCustomers,
  refresh: refreshCustomers,
} = await useFetch(() => `/api/customers?companyId=${companyId.value}`);

// Also fetch quotes and sales for detail drawer
const { data: quotesData } = await useFetch(
  () => `/api/quotes?companyId=${companyId.value}`,
  { default: () => ({ quotes: [] }) },
);
const { data: salesData } = await useFetch(
  () => `/api/sales?companyId=${companyId.value}`,
  { default: () => ({ sales: [] }) },
);

const customers = computed<Customer[]>(
  () => (customersData.value as { customers: Customer[] })?.customers ?? [],
);
const allQuotes = computed<CustomerQuote[]>(
  () => (quotesData.value as { quotes: CustomerQuote[] })?.quotes ?? [],
);
const allSales = computed<CustomerSale[]>(
  () => (salesData.value as { sales: CustomerSale[] })?.sales ?? [],
);

// ─────────────────────────────────────────────
// Formatters & Utils
// ─────────────────────────────────────────────
const formatRelative = (ms: number) => {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days}d atrás`;
  if (days < 365) return `${Math.floor(days / 30)}m atrás`;
  return `${Math.floor(days / 365)}a atrás`;
};

const maskDocument = (doc: string) => {
  if (!doc) return "—";
  return doc.length === 11 ? formatCPF(doc) : formatCNPJ(doc);
};

// Initials avatar
const initials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (
      (parts[0]?.charAt(0) ?? "") + (parts[parts.length - 1]?.charAt(0) ?? "")
    ).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  "bg-green-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
];
const avatarColor = (name: string) => {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// ─────────────────────────────────────────────
// KPI Stats
// ─────────────────────────────────────────────
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

const stats = computed(() => {
  const all = customers.value;
  const newThisMonth = all.filter(
    (c) => (c.createdAt || c.lastActivityAt) >= startOfMonth,
  ).length;
  const buyers = all.filter((c) => c.totalSpent > 0);
  const totalSpent = buyers.reduce((s, c) => s + c.totalSpent, 0);
  const avgTicket = buyers.length ? Math.round(totalSpent / buyers.length) : 0;
  return {
    total: all.length,
    newThisMonth,
    totalSpent,
    avgTicket,
    buyers: buyers.length,
  };
});

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref("");
const activityFilter = ref<ActivityFilter>("all");
const page = ref(1);
const pageSize = 12;

const filteredCustomers = computed(() => {
  const q = search.value.toLowerCase();
  return customers.value.filter((c) => {
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.document.includes(q) ||
      c.phone.includes(q);

    const matchFilter =
      activityFilter.value === "all" ||
      (activityFilter.value === "buyers" && c.totalSpent > 0) ||
      (activityFilter.value === "prospects" &&
        c.totalSpent === 0 &&
        c.quotesCount > 0) ||
      (activityFilter.value === "inactive" &&
        Date.now() - c.lastActivityAt > 90 * 86_400_000);

    return matchSearch && matchFilter;
  });
});

const paginatedCustomers = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredCustomers.value.slice(start, start + pageSize);
});

const totalPages = computed(() =>
  Math.ceil(filteredCustomers.value.length / pageSize),
);

watch([search, activityFilter], () => {
  page.value = 1;
});

// ─────────────────────────────────────────────
// Drawer — Customer detail
// ─────────────────────────────────────────────
const isDetailOpen = ref(false);
const selectedCustomer = ref<Customer | null>(null);
const drawerTab = ref("quotes");

const DRAWER_TABS = [
  { label: "Orçamentos", value: "quotes", icon: "i-heroicons-document-text" },
  { label: "Vendas", value: "sales", icon: "i-heroicons-shopping-cart" },
];

const openDetail = (c: Customer) => {
  selectedCustomer.value = c;
  drawerTab.value = "quotes";
  isDetailOpen.value = true;
};

const customerQuotes = computed(() => {
  if (!selectedCustomer.value) return [];
  const { document, name } = selectedCustomer.value;
  return allQuotes.value.filter(
    (q: CustomerQuote) =>
      (document && q.customerDocument === document) || q.customerName === name,
  );
});

const customerSales = computed(() => {
  if (!selectedCustomer.value) return [];
  const { document, name } = selectedCustomer.value;
  return allSales.value.filter(
    (s: CustomerSale) =>
      (document && s.customerDocument === document) || s.customerName === name,
  );
});

// ─────────────────────────────────────────────
// Status configs
// ─────────────────────────────────────────────
const quoteStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "neutral" },
  sent: { label: "Enviado", color: "info" },
  approved: { label: "Aprovado", color: "success" },
  rejected: { label: "Rejeitado", color: "error" },
  expired: { label: "Expirado", color: "warning" },
};
const saleStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "warning" },
  confirmed: { label: "Confirmado", color: "info" },
  in_progress: { label: "Em Andamento", color: "info" },
  completed: { label: "Concluído", color: "success" },
  cancelled: { label: "Cancelado", color: "error" },
};

const quoteStatus = (s: string) =>
  quoteStatusConfig[s] ?? quoteStatusConfig["draft"]!;
const saleStatus = (s: string) =>
  saleStatusConfig[s] ?? saleStatusConfig["pending"]!;

// ─────────────────────────────────────────────
// Drawer — Form
// ─────────────────────────────────────────────
const isDrawerOpen = ref(false);
const editingCustomer = ref<Customer | null>(null);

const openCreate = () => {
  editingCustomer.value = null;
  isDrawerOpen.value = true;
};

const openEdit = (c: Customer) => {
  editingCustomer.value = c;
  isDrawerOpen.value = true;
};
// Row action menu
const _rowActions = (c: Customer) => [
  [
    {
      label: "Ver histórico",
      icon: "i-heroicons-clock",
      onSelect: () => openDetail(c),
    },
    {
      label: "Novo Orçamento",
      icon: "i-heroicons-document-plus",
      onSelect: () =>
        navigateTo({
          path: "/orcamentos",
          query: {
            customerName: c.name,
            customerDocument: c.document || undefined,
            customerPhone: c.phone || undefined,
            customerAddress: c.address || undefined,
          },
        }),
    },
    {
      label: "Nova Venda",
      icon: "i-heroicons-shopping-cart",
      onSelect: () =>
        navigateTo({
          path: "/vendas",
          query: {
            customerName: c.name,
            customerDocument: c.document || undefined,
            customerPhone: c.phone || undefined,
            customerAddress: c.address || undefined,
          },
        }),
    },
  ],
];
</script>

<template>
  <div class="p-6 lg:p-8 space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Clientes
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Histórico consolidado de clientes a partir de orçamentos e vendas
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-user-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Novo Cliente
      </UButton>
    </div>

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <template v-if="loadingCustomers">
        <USkeleton v-for="i in 4" :key="i" class="h-28 rounded-2xl" />
      </template>
      <template v-else>
        <!-- Total Clientes -->
        <div
          class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight"
              >Total de Clientes</span
            >
            <div
              class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-user-group"
                class="w-5 h-5 text-primary-500"
              />
            </div>
          </div>
          <p
            class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums"
          >
            {{ stats.total }}
          </p>
          <p class="text-xs text-zinc-400 font-medium -mt-2">
            <span class="font-bold text-green-500">{{ stats.buyers }}</span> com
            compras realizadas
          </p>
        </div>

        <!-- Novos este mês -->
        <div
          class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight"
              >Ativos no Mês</span
            >
            <div
              class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-arrow-trending-up"
                class="w-5 h-5 text-blue-500"
              />
            </div>
          </div>
          <p
            class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums"
          >
            {{ stats.newThisMonth }}
          </p>
          <p class="text-xs text-zinc-400 font-medium -mt-2">
            com interação neste mês
          </p>
        </div>

        <!-- Receita Total -->
        <div
          class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight"
              >Receita Total</span
            >
            <div
              class="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-banknotes"
                class="w-5 h-5 text-green-500"
              />
            </div>
          </div>
          <p
            class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums"
          >
            {{ formatCurrency(stats.totalSpent) }}
          </p>
          <p class="text-xs text-zinc-400 font-medium -mt-2">
            em vendas concluídas
          </p>
        </div>

        <!-- Ticket Médio -->
        <div
          class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight"
              >Ticket Médio</span
            >
            <div
              class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-receipt-percent"
                class="w-5 h-5 text-amber-500"
              />
            </div>
          </div>
          <p
            class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums"
          >
            {{ formatCurrency(stats.avgTicket) }}
          </p>
          <p class="text-xs text-zinc-400 font-medium -mt-2">
            por cliente comprador
          </p>
        </div>
      </template>
    </div>

    <!-- ── Table Card ── -->
    <UCard>
      <template #header>
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-user-group"
                class="w-5 h-5 text-primary-500"
              />
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-widest text-zinc-400"
              >
                Clientes
              </h3>
              <p class="text-xs text-zinc-400 mt-0.5">
                Gerencie sua base de clientes
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <UInput
              v-model="search"
              size="sm"
              placeholder="Buscar por nome, CNPJ ou telefone..."
              icon="i-heroicons-magnifying-glass"
              class="w-full sm:w-56 lg:w-72"
            />
            <USelect
              v-model="activityFilter"
              :items="CUSTOMER_ACTIVITY_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-full sm:w-44"
            />
          </div>
        </div>
      </template>

      <!-- Loading -->
      <div v-if="loadingCustomers" class="space-y-3 py-2">
        <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="filteredCustomers.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon name="i-heroicons-user-group" class="w-12 h-12 mb-3" />
        <p class="text-sm font-bold">
          {{
            customers.length === 0
              ? "Nenhum cliente encontrado"
              : "Nenhum cliente corresponde aos filtros"
          }}
        </p>
        <p class="text-xs mt-1">
          {{
            customers.length === 0
              ? "Crie um orçamento ou venda para começar"
              : "Tente outros termos de busca"
          }}
        </p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800">
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap"
              >
                Cliente
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
              >
                Contato
              </th>
              <th
                class="text-center px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Orçamentos
              </th>
              <th
                class="text-center px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Vendas
              </th>
              <th
                class="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Total Gasto
              </th>
              <th
                class="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell"
              >
                Última Atividade
              </th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in paginatedCustomers"
              :key="c.key"
              class="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors group relative cursor-pointer"
              @click="openDetail(c)"
            >
              <!-- Cliente -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-black"
                    :class="avatarColor(c.name)"
                  >
                    {{ initials(c.name) }}
                  </div>
                  <div>
                    <p
                      class="font-bold text-zinc-900 dark:text-white leading-tight"
                    >
                      {{ c.name }}
                    </p>
                    <p
                      v-if="c.document"
                      class="text-xs text-zinc-400 font-mono"
                    >
                      {{ maskDocument(c.document) }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Contato -->
              <td class="px-4 py-3.5 hidden md:table-cell">
                <div
                  class="text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5"
                >
                  <p v-if="c.phone" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-phone" class="w-3 h-3" />
                    {{ maskPhone(c.phone) }}
                  </p>
                  <p
                    v-if="c.address"
                    class="flex items-center gap-1 max-w-45 truncate"
                  >
                    <UIcon
                      name="i-heroicons-map-pin"
                      class="w-3 h-3 shrink-0"
                    />
                    {{ c.address }}
                  </p>
                </div>
              </td>

              <!-- Orçamentos -->
              <td class="px-4 py-3.5 text-center hidden lg:table-cell">
                <div class="flex flex-col items-center gap-1">
                  <span class="font-bold text-zinc-900 dark:text-white">{{
                    c.quotesCount
                  }}</span>
                  <div class="flex items-center gap-1">
                    <UBadge
                      v-if="c.pendingQuotes"
                      color="warning"
                      variant="soft"
                      size="sm"
                    >
                      {{ c.pendingQuotes }} pend.
                    </UBadge>
                    <UBadge
                      v-if="c.approvedQuotes"
                      color="success"
                      variant="soft"
                      size="sm"
                    >
                      {{ c.approvedQuotes }} aprov.
                    </UBadge>
                  </div>
                </div>
              </td>

              <!-- Vendas -->
              <td class="px-4 py-3.5 text-center hidden lg:table-cell">
                <div class="flex flex-col items-center gap-1">
                  <span class="font-bold text-zinc-900 dark:text-white">{{
                    c.salesCount
                  }}</span>
                  <UBadge
                    v-if="c.completedSales > 0"
                    color="success"
                    variant="soft"
                    size="sm"
                  >
                    {{ c.completedSales }} concl.
                  </UBadge>
                </div>
              </td>

              <!-- Total Gasto -->
              <td class="px-4 py-3.5 text-right whitespace-nowrap">
                <span
                  class="font-black text-zinc-900 dark:text-white"
                  :class="
                    c.totalSpent > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-400'
                  "
                >
                  {{ c.totalSpent > 0 ? formatCurrency(c.totalSpent) : "—" }}
                </span>
              </td>

              <!-- Última atividade -->
              <td class="px-4 py-3.5 text-right hidden xl:table-cell">
                <span class="text-xs text-zinc-400">{{
                  formatRelative(c.lastActivityAt)
                }}</span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5 text-right" @click.stop>
                <div
                  class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <UTooltip text="Ver Histórico">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-clock"
                      size="xs"
                      @click="openDetail(c)"
                    />
                  </UTooltip>
                  <UTooltip text="Novo Orçamento">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-document-plus"
                      size="xs"
                      @click="
                        navigateTo({
                          path: '/orcamentos',
                          query: {
                            customerName: c.name,
                            customerDocument: c.document || undefined,
                            customerPhone: c.phone || undefined,
                            customerAddress: c.address || undefined,
                          },
                        })
                      "
                    />
                  </UTooltip>
                  <UTooltip text="Nova Venda">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-shopping-cart"
                      size="xs"
                      @click="
                        navigateTo({
                          path: '/vendas',
                          query: {
                            customerName: c.name,
                            customerDocument: c.document || undefined,
                            customerPhone: c.phone || undefined,
                            customerAddress: c.address || undefined,
                          },
                        })
                      "
                    />
                  </UTooltip>
                  <UTooltip text="Editar Cliente">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="xs"
                      @click="openEdit(c)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Pagination -->
    <UCard v-if="totalPages > 1" class="mt-6">
      <div class="flex justify-center py-2">
        <UPagination
          v-model="page"
          :total="filteredCustomers.length"
          :page-count="pageSize"
        />
      </div>
    </UCard>

    <!-- Customer Detail Drawer -->
    <USlideover
      v-model:open="isDetailOpen"
      side="right"
      :ui="{ footer: 'p-0 block' }"
    >
      <template #header>
        <div class="flex items-center gap-4 min-w-0">
          <div
            v-if="selectedCustomer"
            class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-black"
            :class="avatarColor(selectedCustomer.name)"
          >
            {{ initials(selectedCustomer.name) }}
          </div>
          <div class="min-w-0">
            <p
              class="text-sm font-black text-zinc-900 dark:text-white truncate"
            >
              {{ selectedCustomer?.name }}
            </p>
            <p
              v-if="selectedCustomer?.document"
              class="text-xs text-zinc-400 font-mono"
            >
              {{ maskDocument(selectedCustomer.document) }}
            </p>
          </div>
        </div>
      </template>

      <template #body>
        <div
          v-if="selectedCustomer"
          class="flex flex-col gap-6 p-6 overflow-y-auto"
        >
          <!-- Quick actions -->
          <div class="flex gap-2">
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-document-plus"
              size="md"
              class="flex-1 font-bold"
              @click="
                navigateTo({
                  path: '/orcamentos',
                  query: {
                    customerName: selectedCustomer.name,
                    customerDocument: selectedCustomer.document || undefined,
                    customerPhone: selectedCustomer.phone || undefined,
                    customerAddress: selectedCustomer.address || undefined,
                  },
                })
              "
            >
              Orçamento
            </UButton>
            <UButton
              color="success"
              variant="soft"
              icon="i-heroicons-shopping-cart"
              size="md"
              class="flex-1 font-bold"
              @click="
                navigateTo({
                  path: '/vendas',
                  query: {
                    customerName: selectedCustomer.name,
                    customerDocument: selectedCustomer.document || undefined,
                    customerPhone: selectedCustomer.phone || undefined,
                    customerAddress: selectedCustomer.address || undefined,
                  },
                })
              "
            >
              Venda
            </UButton>
          </div>

          <!-- Contact info -->
          <div
            class="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700 p-4 space-y-2"
          >
            <h4
              class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-user" class="w-4 h-4" />
              Informações de Contato
            </h4>
            <div
              v-if="selectedCustomer.phone"
              class="flex items-center gap-2 text-sm"
            >
              <UIcon
                name="i-heroicons-phone"
                class="w-4 h-4 text-zinc-400 shrink-0"
              />
              <span class="text-zinc-700 dark:text-zinc-300 font-medium">{{
                formatPhone(selectedCustomer.phone)
              }}</span>
            </div>
            <div
              v-if="selectedCustomer.address"
              class="flex items-start gap-2 text-sm"
            >
              <UIcon
                name="i-heroicons-map-pin"
                class="w-4 h-4 text-zinc-400 shrink-0 mt-0.5"
              />
              <span class="text-zinc-700 dark:text-zinc-300 font-medium">{{
                selectedCustomer.address
              }}</span>
            </div>
          </div>

          <!-- Summary strip -->
          <div class="grid grid-cols-3 gap-3">
            <div
              class="rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-3 text-center"
            >
              <p class="text-xl font-black text-zinc-900 dark:text-white">
                {{ selectedCustomer.quotesCount }}
              </p>
              <p
                class="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1"
              >
                Orçamentos
              </p>
            </div>
            <div
              class="rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-3 text-center"
            >
              <p class="text-xl font-black text-zinc-900 dark:text-white">
                {{ selectedCustomer.salesCount }}
              </p>
              <p
                class="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1"
              >
                Vendas
              </p>
            </div>
            <div
              class="rounded-xl bg-green-50 dark:bg-green-500/10 ring-1 ring-green-100 dark:ring-green-500/20 p-3 text-center"
            >
              <p
                class="text-base font-black text-green-600 dark:text-green-400 leading-tight"
              >
                {{ formatCurrency(selectedCustomer.totalSpent) }}
              </p>
              <p
                class="text-[10px] font-black uppercase tracking-widest text-green-500/70 mt-1"
              >
                Total Gasto
              </p>
            </div>
          </div>

          <!-- Tabs -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-1 border-b border-zinc-100 dark:border-zinc-800"
            >
              <button
                v-for="tab in DRAWER_TABS"
                :key="tab.value"
                class="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 -mb-px"
                :class="
                  drawerTab === tab.value
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                "
                @click="drawerTab = tab.value"
              >
                <UIcon :name="tab.icon" class="w-3.5 h-3.5" />
                {{ tab.label }}
              </button>
            </div>

            <!-- Quotes list -->
            <div v-if="drawerTab === 'quotes'" class="space-y-3">
              <div
                v-if="customerQuotes.length === 0"
                class="flex flex-col items-center py-12 text-zinc-400"
              >
                <p class="text-sm font-bold">Nenhum orçamento</p>
              </div>
              <div
                v-for="q in customerQuotes"
                :key="q.id"
                class="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 px-4 py-3 hover:ring-primary-500/50 transition-all cursor-pointer group"
                @click="navigateTo(`/orcamentos?id=${q.id}`)"
              >
                <div class="min-w-0">
                  <p
                    class="text-xs font-black text-zinc-900 dark:text-white group-hover:text-primary-500 transition-colors"
                  >
                    #{{ String(q.id).padStart(4, "0") }}
                  </p>
                  <p class="text-[10px] text-zinc-400 font-medium">
                    {{ formatDate(q.date) }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :color="quoteStatus(q.status).color as any"
                    variant="soft"
                    size="sm"
                  >
                    {{ quoteStatus(q.status).label }}
                  </UBadge>
                  <span
                    class="text-sm font-black text-zinc-900 dark:text-white shrink-0 tabular-nums"
                  >
                    {{ formatCurrency(q.total) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Sales list -->
            <div v-if="drawerTab === 'sales'" class="space-y-3">
              <div
                v-if="customerSales.length === 0"
                class="flex flex-col items-center py-12 text-zinc-400"
              >
                <p class="text-sm font-bold">Nenhuma venda</p>
              </div>
              <div
                v-for="s in customerSales"
                :key="s.id"
                class="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 px-4 py-3 hover:ring-primary-500/50 transition-all cursor-pointer group"
                @click="navigateTo(`/vendas?id=${s.id}`)"
              >
                <div class="min-w-0">
                  <p
                    class="text-xs font-black text-zinc-900 dark:text-white group-hover:text-primary-500 transition-colors"
                  >
                    #{{ String(s.id).padStart(4, "0") }}
                  </p>
                  <p class="text-[10px] text-zinc-400 font-medium">
                    {{ formatDate(s.date) }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :color="saleStatus(s.status).color as any"
                    variant="soft"
                    size="sm"
                  >
                    {{ saleStatus(s.status).label }}
                  </UBadge>
                  <span
                    class="text-sm font-black text-zinc-900 dark:text-white shrink-0 tabular-nums"
                  >
                    {{ formatCurrency(s.total) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div
          class="border-t border-zinc-200 dark:border-zinc-800 p-6 flex gap-3"
        >
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1"
            @click="isDetailOpen = false"
          >
            Fechar
          </UButton>
          <UButton
            v-if="selectedCustomer"
            color="primary"
            variant="soft"
            icon="i-heroicons-pencil-square"
            class="flex-1"
            @click="
              () => {
                isDetailOpen = false;
                openEdit(selectedCustomer!);
              }
            "
          >
            Editar dados
          </UButton>
        </div>
      </template>
    </USlideover>

    <!-- New/Edit Customer Drawer -->
    <CustomersCustomerDrawer
      v-model:open="isDrawerOpen"
      :customer="editingCustomer"
      @saved="refreshCustomers"
    />
  </div>
</template>
