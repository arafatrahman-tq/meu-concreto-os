<script setup lang="ts">
import type {
  Product,
  ProductType,
  ProductUnit,
  MixDesign,
} from "~/types/products";
import { typeConfig, UNIT_LABELS } from "~/types/products";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Produtos | Meu Concreto" });

const { companyId } = useAuth();
const toast = useToast();

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

const {
  data: productsData,
  refresh: refreshProducts,
  pending: loadingProducts,
} = await useFetch<{ products: Product[] }>("/api/products", {
  query: { companyId },
});

const products = computed<Product[]>(() => productsData.value?.products ?? []);

const { data: mixDesignsData } = await useFetch<{ mixDesigns: MixDesign[] }>(
  "/api/mix-designs",
  {
    query: { companyId },
  }
);
const mixDesigns = computed(() => mixDesignsData.value?.mixDesigns ?? []);
const mixDesignOptions = computed(() =>
  mixDesigns.value.map((m) => ({ label: m.name, value: m.id }))
);

const materialOptions = computed(() =>
  mixDesigns.value.map((m) => ({ label: m.name, value: m.id }))
);

const PREVIEW_TYPE_OPTS = [
  { label: "Todos os Tipos", value: "all" },
  { label: "Concreto", value: "concrete" },
  { label: "Bombeamento", value: "pump" },
  { label: "Aditivo", value: "additive" },
  { label: "Locação", value: "rental" },
  { label: "Outro", value: "other" },
];

// ─────────────────────────────────────────────
// Summary stats
// ─────────────────────────────────────────────
const stats = computed(() => {
  const all = products.value;
  const active = all.filter((p) => p.active);
  const concrete = all.filter((p) => p.type === "concrete");
  const avgPrice =
    active.length > 0
      ? active.reduce((s, p) => s + p.price, 0) / active.length
      : 0;
  return {
    total: all.length,
    active: active.length,
    concrete: concrete.length,
    avgPrice,
  };
});

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref("");
const typeFilter = ref<ProductType | "all">("all");
const activeFilter = ref<"all" | "active" | "inactive">("all");

const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchType = typeFilter.value === "all" || p.type === typeFilter.value;
    const matchActive =
      activeFilter.value === "all" ||
      (activeFilter.value === "active" && p.active) ||
      (activeFilter.value === "inactive" && !p.active);
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q);
    return matchType && matchActive && matchSearch;
  });
});

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1);
const pageSize = ref(12);

const paginatedProducts = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredProducts.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredProducts.value.length / pageSize.value)
);

watch([search, typeFilter, activeFilter], () => {
  page.value = 1;
});

// Drawer state
const isDrawerOpen = ref(false);
const editingProduct = ref<Product | null>(null);

const openCreate = () => {
  editingProduct.value = null;
  isDrawerOpen.value = true;
};

const openEdit = (p: Product) => {
  editingProduct.value = p;
  isDrawerOpen.value = true;
};

// Save logic now in ProductDrawer components

// ─────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────
const toggleActive = async (p: Product) => {
  try {
    await $fetch(`/api/products/${p.id}`, {
      method: "PUT",
      body: { active: !p.active },
    });
    toast.add({
      title: p.active ? "Produto desativado" : "Produto ativado",
      description: `"${p.name}" foi ${p.active ? "desativado" : "ativado"}.`,
      color: p.active ? "neutral" : "success",
      icon: p.active ? "i-heroicons-eye-slash" : "i-heroicons-check-circle",
    });
    await refreshProducts();
  } catch (e: any) {
    toast.add({
      title: "Erro",
      description:
        e?.data?.message ??
        e?.data?.message ??
        e?.data?.statusMessage ??
        "Tente novamente.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  }
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
const deleteTarget = ref<Product | null>(null);
const loadingDelete = ref(false);
const isDeleteModalOpen = ref(false);

const confirmDelete = (p: Product) => {
  deleteTarget.value = p;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  loadingDelete.value = true;
  const name = deleteTarget.value.name;
  try {
    await $fetch(`/api/products/${deleteTarget.value.id}`, {
      method: "DELETE",
    });
    isDeleteModalOpen.value = false;
    toast.add({
      title: "Produto excluído",
      description: `"${name}" foi removido do catálogo.`,
      color: "neutral",
      icon: "i-heroicons-trash",
    });
    await refreshProducts();
  } catch (e: any) {
    toast.add({
      title: "Erro ao excluir",
      description:
        e?.data?.message ??
        e?.data?.message ??
        e?.data?.statusMessage ??
        e?.message ??
        "Tente novamente.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingDelete.value = false;
    deleteTarget.value = null;
  }
};

// ─────────────────────────────────────────────
// Row actions
// ─────────────────────────────────────────────
const _rowActions = (p: Product) => [
  [
    {
      label: "Editar Produto",
      icon: "i-heroicons-pencil-square",
      onSelect: () => openEdit(p),
    },
    {
      label: p.active ? "Desativar" : "Ativar",
      icon: p.active ? "i-heroicons-eye-slash" : "i-heroicons-eye",
      onSelect: () => toggleActive(p),
    },
  ],
  [
    {
      label: "Excluir",
      icon: "i-heroicons-trash",
      color: "error" as const,
      onSelect: () => confirmDelete(p),
    },
  ],
];

// Active filter options
const ACTIVE_OPTS = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" },
];

// Unit options for select
const UNIT_OPTS = [
  { label: "m³ — metros cúbicos", value: "m3" },
  { label: "un — unidade", value: "un" },
  { label: "hr — hora", value: "hr" },
  { label: "kg — quilograma", value: "kg" },
  { label: "ton — tonelada", value: "ton" },
];

// Type options for form
const TYPE_FORM_OPTS = [
  { label: "Concreto", value: "concrete" },
  { label: "Bombeamento", value: "pump" },
  { label: "Aditivo", value: "additive" },
  { label: "Locação", value: "rental" },
  { label: "Outro", value: "other" },
];
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Produtos
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie o catálogo de produtos e serviços da empresa
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Novo Produto
      </UButton>
    </div>

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        v-for="(kpi, i) in [
          {
            label: 'Total de Produtos',
            value: stats.total,
            suffix: 'cadastrados',
            icon: 'i-heroicons-archive-box',
            color: 'text-primary-500',
            bg: 'bg-primary-50 dark:bg-primary-500/10',
          },
          {
            label: 'Produtos Ativos',
            value: stats.active,
            suffix: 'disponíveis',
            icon: 'i-heroicons-check-circle',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
          {
            label: 'Concretos',
            value: stats.concrete,
            suffix: 'traços cadastrados',
            icon: 'i-heroicons-cube',
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
          },
          {
            label: 'Preço Médio',
            value: formatCurrency(stats.avgPrice),
            suffix: 'por produto ativo',
            icon: 'i-heroicons-currency-dollar',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
          },
        ]"
        :key="i"
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight"
          >
            {{ kpi.label }}
          </span>
          <div
            :class="[
              kpi.bg,
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            ]"
          >
            <UIcon :name="kpi.icon" :class="['w-5 h-5', kpi.color]" />
          </div>
        </div>
        <p
          class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums"
        >
          {{ kpi.value }}
        </p>
        <p v-if="kpi.suffix" class="text-xs text-zinc-400 font-medium -mt-2">
          {{ kpi.suffix }}
        </p>
      </div>
    </div>

    <!-- ── Table Card ── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
            >
              <UIcon
                name="i-heroicons-archive-box"
                class="h-5 w-5 text-primary-500"
              />
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-widest text-zinc-400"
              >
                Catálogo de Produtos
              </h3>
              <p class="mt-0.5 text-xs text-zinc-400">Gerencie seu catálogo</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar nome, SKU..."
              size="sm"
              class="w-44 lg:w-56"
            />
            <USelect
              v-model="typeFilter"
              :items="PREVIEW_TYPE_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-40"
            />
            <USelect
              v-model="activeFilter"
              :items="ACTIVE_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-28"
            />
          </div>
        </div>
      </template>

      <!-- Loading skeleton -->
      <div v-if="loadingProducts" class="space-y-3 py-2">
        <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredProducts.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon name="i-heroicons-archive-box" class="w-12 h-12 mb-3" />
        <p class="text-sm font-bold">Nenhum produto encontrado</p>
        <p class="text-xs mt-1">
          Ajuste os filtros ou cadastre um novo produto
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
                Produto
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell"
              >
                Tipo
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Especificações
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
              >
                SKU
              </th>
              <th
                class="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Preço
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Status
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
              v-for="p in paginatedProducts"
              :key="p.id"
              class="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors group relative"
              :class="{ 'opacity-50': !p.active }"
            >
              <!-- Product name + description -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      typeConfig[p.type].color === 'success'
                        ? 'bg-green-50 dark:bg-green-500/10'
                        : typeConfig[p.type].color === 'info'
                        ? 'bg-blue-50 dark:bg-blue-500/10'
                        : typeConfig[p.type].color === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-500/10'
                        : 'bg-zinc-100 dark:bg-zinc-800',
                    ]"
                  >
                    <UIcon
                      :name="typeConfig[p.type].icon"
                      :class="[
                        'w-4 h-4',
                        typeConfig[p.type].color === 'success'
                          ? 'text-green-600'
                          : typeConfig[p.type].color === 'info'
                          ? 'text-blue-600'
                          : typeConfig[p.type].color === 'warning'
                          ? 'text-amber-600'
                          : 'text-zinc-500',
                      ]"
                    />
                  </div>
                  <div class="min-w-0">
                    <p
                      class="font-bold text-zinc-900 dark:text-white truncate max-w-40 sm:max-w-56"
                    >
                      {{ p.name }}
                    </p>
                    <div class="flex items-center gap-2">
                      <p
                        v-if="p.description"
                        class="text-xs text-zinc-400 truncate max-w-40 sm:max-w-56"
                      >
                        {{ p.description }}
                      </p>
                      <UTooltip
                        v-if="p.mixDesignId"
                        text="Possui traço vinculado"
                      >
                        <UIcon
                          name="i-heroicons-beaker"
                          class="w-3 h-3 text-primary-500"
                        />
                      </UTooltip>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Type badge -->
              <td class="px-4 py-3.5 hidden sm:table-cell">
                <UBadge
                  :color="typeConfig[p.type].color as any"
                  variant="soft"
                  size="sm"
                  :icon="typeConfig[p.type].icon"
                >
                  {{ typeConfig[p.type].label }}
                </UBadge>
              </td>

              <!-- Concrete specs -->
              <td class="px-4 py-3.5 hidden lg:table-cell">
                <div
                  v-if="
                    p.type === 'concrete' && (p.fck || p.slump || p.stoneSize)
                  "
                  class="flex items-center gap-2 flex-wrap"
                >
                  <span
                    v-if="p.fck"
                    class="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 whitespace-nowrap"
                  >
                    FCK {{ p.fck }} MPa
                  </span>
                  <span
                    v-if="p.slump"
                    class="text-xs font-bold px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 whitespace-nowrap"
                  >
                    Slump {{ p.slump }} cm
                  </span>
                  <span
                    v-if="p.stoneSize"
                    class="text-xs font-bold px-2 py-0.5 rounded-lg bg-stone-50 dark:bg-stone-500/10 text-stone-600 dark:text-stone-400 whitespace-nowrap"
                  >
                    {{ p.stoneSize }}
                  </span>
                </div>
                <span v-else class="text-xs text-zinc-300 dark:text-zinc-700"
                  >—</span
                >
              </td>

              <!-- SKU -->
              <td
                class="px-4 py-3.5 text-xs text-zinc-400 font-mono hidden md:table-cell"
              >
                {{ p.sku || "—" }}
              </td>

              <!-- Price -->
              <td
                class="px-4 py-3.5 text-right font-black text-zinc-900 dark:text-white whitespace-nowrap"
              >
                <div>
                  {{ formatCurrency(p.price) }}
                  <span class="text-xs text-zinc-400 font-normal ml-1">
                    / {{ UNIT_LABELS[p.unit] }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3.5">
                <button
                  class="group/toggle"
                  title="Clique para alternar"
                  @click="toggleActive(p)"
                >
                  <UBadge
                    :color="p.active ? 'success' : 'neutral'"
                    variant="soft"
                    size="sm"
                    :icon="
                      p.active
                        ? 'i-heroicons-check-circle'
                        : 'i-heroicons-eye-slash'
                    "
                    class="cursor-pointer transition-opacity group-hover/toggle:opacity-70"
                  >
                    {{ p.active ? "Ativo" : "Inativo" }}
                  </UBadge>
                </button>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5 text-right">
                <div
                  class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <UTooltip :text="p.active ? 'Desativar' : 'Ativar'">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      :icon="
                        p.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                      "
                      size="xs"
                      @click="toggleActive(p)"
                    />
                  </UTooltip>
                  <UTooltip text="Editar Produto">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="xs"
                      @click="openEdit(p)"
                    />
                  </UTooltip>
                  <UTooltip text="Excluir">
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="xs"
                      @click="confirmDelete(p)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <template v-if="filteredProducts.length > pageSize" #footer>
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1"
        >
          <p class="text-xs text-zinc-400">
            {{ filteredProducts.length }} produtos · página {{ page }} de
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

    <!-- ══════════════════════════════════════════
         DRAWER — Create / Edit
    ══════════════════════════════════════════ -->
    <!-- Product Slider (Drawer) -->
    <ProductsProductDrawer
      v-model:open="isDrawerOpen"
      :product="editingProduct"
      :mix-designs="mixDesigns"
      @saved="refreshProducts"
    />

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm
    ══════════════════════════════════════════ -->
    <UModal v-model:open="isDeleteModalOpen" title="Excluir Produto">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar exclusão
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja excluir
                <strong class="text-zinc-700 dark:text-zinc-300">
                  "{{ deleteTarget?.name }}"
                </strong>
                do catálogo? Esta ação não pode ser desfeita.
              </p>
              <UAlert
                class="mt-3"
                color="warning"
                variant="soft"
                icon="i-heroicons-exclamation-triangle"
                description="Orçamentos e vendas que já usam este produto não serão afetados."
              />
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isDeleteModalOpen = false"
            >
              Cancelar
            </UButton>
            <UButton
              color="error"
              :loading="loadingDelete"
              icon="i-heroicons-trash"
              @click="handleDelete"
            >
              Excluir
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
