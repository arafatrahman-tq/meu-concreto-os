<script setup lang="ts">
import {
  typeConfig,
  type Material,
  type MaterialType,
  type MaterialUnit,
} from "~/types/inventory";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Insumos | Meu Concreto" });

const { companyId } = useAuth();
const toast = useToast();

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: materialsData,
  refresh: refreshMaterials,
  pending: loadingMaterials,
} = await useFetch<{ materials: Material[] }>("/api/materials", {
  query: { companyId },
});

const materials = computed<Material[]>(
  () => materialsData.value?.materials ?? [],
);

const PREVIEW_TYPE_OPTS = [
  { label: "Todos", value: "all" },
  { label: "Cimento", value: "cement" },
  { label: "Areia", value: "sand" },
  { label: "Brita", value: "stone" },
  { label: "Aditivo", value: "additive" },
  { label: "Água", value: "water" },
  { label: "Outro", value: "other" },
];

// ─────────────────────────────────────────────
// Summary stats
// ─────────────────────────────────────────────
const stats = computed(() => {
  const all = materials.value;
  const active = all.filter((m) => m.active);
  const lowStock = all.filter((m) => m.stock < 100); // Example threshold
  const totalValue = all.reduce((acc, m) => acc + m.stock * m.cost, 0);

  return {
    total: all.length,
    active: active.length,
    lowStock: lowStock.length,
    totalValue,
  };
});

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref("");
const typeFilter = ref<MaterialType | "all">("all");
const activeFilter = ref<"all" | "active" | "inactive">("all");

const filteredMaterials = computed(() => {
  return materials.value.filter((m) => {
    const matchType = typeFilter.value === "all" || m.type === typeFilter.value;
    const matchActive =
      activeFilter.value === "all" ||
      (activeFilter.value === "active" && m.active) ||
      (activeFilter.value === "inactive" && !m.active);
    const q = search.value.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q);

    return matchType && matchActive && matchSearch;
  });
});

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1);
const pageSize = ref(12);

const paginatedMaterials = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredMaterials.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredMaterials.value.length / pageSize.value),
);

watch([search, typeFilter, activeFilter], () => {
  page.value = 1;
});

// No local formatters needed

// Drawer state
const isDrawerOpen = ref(false);
const editingMaterial = ref<Material | null>(null);

const openCreate = () => {
  editingMaterial.value = null;
  isDrawerOpen.value = true;
};

const openEdit = (m: Material) => {
  editingMaterial.value = m;
  isDrawerOpen.value = true;
};

// Save logic now in MaterialDrawer

const deleteMaterial = async (id: number) => {
  if (!confirm("Tem certeza que deseja excluir este insumo?")) return;

  try {
    await $fetch(`/api/materials/${id}`, { method: "DELETE" });
    toast.add({ title: "Insumo excluído", color: "success" });
    refreshMaterials();
  } catch (error: any) {
    toast.add({
      title: "Erro ao excluir",
      description: error.data?.message || "Verifique se o insumo está em uso.",
      color: "error",
    });
  }
};
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- Header Page -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Insumos
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie materiais para produção de concreto.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-path"
          label="Atualizar"
          size="md"
          :loading="loadingMaterials"
          @click="() => refreshMaterials()"
        />
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          size="md"
          @click="openCreate"
        >
          Novo Insumo
        </UButton>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <!-- Total -->
      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
            >Total de Insumos</span
          >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
          >
            <UIcon name="i-heroicons-cube" class="h-5 w-5 text-primary-500" />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.total }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">itens cadastrados</p>
      </div>

      <!-- Ativos -->
      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
            >Ativos</span
          >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10"
          >
            <UIcon
              name="i-heroicons-check-circle"
              class="h-5 w-5 text-green-500"
            />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.active }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          em uso na produção
        </p>
      </div>

      <!-- Estoque Baixo -->
      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
            >Estoque Baixo</span
          >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="h-5 w-5 text-amber-500"
            />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.lowStock }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          precisam de reposição
        </p>
      </div>

      <!-- Valor em Estoque -->
      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
            >Valor em Estoque</span
          >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10"
          >
            <UIcon
              name="i-heroicons-currency-dollar"
              class="h-5 w-5 text-blue-500"
            />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ formatCurrency(stats.totalValue) }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          custo total armazenado
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <UCard
      :ui="{
        body: 'p-0 sm:p-0',
        header:
          'p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
        footer: 'p-4 border-t border-zinc-100 dark:border-zinc-800',
      }"
      class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden"
    >
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-2 h-6 bg-primary-500 rounded-full" />
            <h3
              class="font-black text-zinc-900 dark:text-white uppercase tracking-tight"
            >
              Registros de Insumos
            </h3>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar insumo..."
              size="sm"
              class="w-full sm:w-64"
            />
            <USelect
              v-model="typeFilter"
              :items="PREVIEW_TYPE_OPTS"
              label-key="label"
              value-key="value"
              size="sm"
              class="w-full sm:w-40"
            />
          </div>
        </div>
      </template>

      <!-- Loading State -->
      <div v-if="loadingMaterials" class="space-y-4 py-4">
        <USkeleton v-for="i in 5" :key="i" class="h-12 w-full rounded-xl" />
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredMaterials.length === 0"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <div
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          <UIcon
            name="i-heroicons-archive-box-x-mark"
            class="h-8 w-8 text-zinc-400"
          />
        </div>
        <h3 class="text-lg font-bold text-zinc-900 dark:text-white">
          Nenhum insumo encontrado
        </h3>
        <p class="text-sm text-zinc-500">
          Tente ajustar seus filtros ou crie um novo insumo.
        </p>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          class="mt-4 h-11 px-4"
          @click="openCreate"
        >
          Criar novo insumo
        </UButton>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
              <th
                class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Insumo
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Tipo
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Custo
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Estoque
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Status
              </th>
              <th class="px-6 py-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            <tr
              v-for="m in paginatedMaterials"
              :key="m.id"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700"
                  >
                    <UIcon
                      :name="typeConfig[m.type].icon"
                      class="h-5 w-5 text-zinc-500"
                    />
                  </div>
                  <div>
                    <div class="font-bold text-zinc-900 dark:text-white">
                      {{ m.name }}
                    </div>
                    <div
                      class="text-[10px] text-zinc-400 uppercase font-black tracking-tight"
                    >
                      ID: #{{ m.id }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4">
                <UBadge :color="typeConfig[m.type].color" variant="subtle">
                  {{ typeConfig[m.type].label }}
                </UBadge>
              </td>
              <td class="px-4 py-4">
                <div class="font-bold text-zinc-900 dark:text-white">
                  {{ formatCurrency(m.cost) }}
                </div>
                <div class="text-[10px] text-zinc-400 uppercase font-black">
                  por {{ m.unit }}
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <div
                    class="h-1.5 w-1.5 rounded-full ring-2 ring-white dark:ring-zinc-900"
                    :class="
                      m.stock < 100
                        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                    "
                  />
                  <span
                    class="font-bold text-zinc-900 dark:text-white tabular-nums"
                  >
                    {{ formatNumber(m.stock) }} {{ m.unit }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-4">
                <UBadge
                  :color="m.active ? 'success' : 'neutral'"
                  variant="subtle"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
                >
                  {{ m.active ? "Ativo" : "Inativo" }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1 transition-all">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="md"
                    class="rounded-xl w-11 h-11 flex items-center justify-center p-0"
                    @click="openEdit(m)"
                  />
                  <UDropdownMenu
                    :items="[
                      [
                        {
                          label: 'Excluir',
                          icon: 'i-heroicons-trash',
                          color: 'error',
                          onSelect: () => deleteMaterial(m.id),
                        },
                      ],
                    ]"
                  >
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-ellipsis-vertical"
                      size="md"
                      class="rounded-xl w-11 h-11 flex items-center justify-center p-0"
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
          <p
            class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400"
          >
            Página {{ page }} de {{ totalPages }}
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
              :disabled="page === totalPages"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>

    <!-- Material Drawer -->
    <InventoryMaterialDrawer
      v-model:open="isDrawerOpen"
      :material="editingMaterial"
      @saved="refreshMaterials"
    />
  </div>
</template>
