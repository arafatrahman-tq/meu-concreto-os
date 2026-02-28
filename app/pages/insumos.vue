<script setup lang="ts">
import { typeConfig, type Material, type MaterialType, type MaterialUnit } from "~/types/inventory";

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
  () => materialsData.value?.materials ?? []
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
  Math.ceil(filteredMaterials.value.length / pageSize.value)
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
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Insumos
        </h1>
        <p class="text-sm text-zinc-500 mt-1">
          Gerencie materiais para produção de concreto.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :loading="loadingMaterials"
          @click="() => refreshMaterials()"
        />
        <UButton color="primary" icon="i-heroicons-plus" @click="openCreate">
          Novo Insumo
        </UButton>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <!-- Total -->
      <div
        class="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
            >Total de Insumos</span
          >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
          >
            <UIcon name="i-lucide-package" class="h-5 w-5 text-primary-500" />
          </div>
        </div>
        <span class="text-3xl font-black text-zinc-900 dark:text-white">{{
          stats.total
        }}</span>
      </div>

      <!-- Ativos -->
      <div
        class="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
            >Ativos</span
          >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10"
          >
            <UIcon
              name="i-heroicons-check-circle"
              class="h-5 w-5 text-green-500"
            />
          </div>
        </div>
        <span class="text-3xl font-black text-zinc-900 dark:text-white">{{
          stats.active
        }}</span>
      </div>

      <!-- Estoque Baixo -->
      <div
        class="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
            >Estoque Baixo</span
          >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="h-5 w-5 text-amber-500"
            />
          </div>
        </div>
        <span class="text-3xl font-black text-zinc-900 dark:text-white">{{
          stats.lowStock
        }}</span>
      </div>

      <!-- Valor em Estoque -->
      <div
        class="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
            >Valor em Estoque</span
          >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10"
          >
            <UIcon
              name="i-heroicons-currency-dollar"
              class="h-5 w-5 text-blue-500"
            />
          </div>
        </div>
        <span class="text-3xl font-black text-zinc-900 dark:text-white">{{
          formatCurrency(stats.totalValue)
        }}</span>
      </div>
    </div>

    <!-- Main Content -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h3
            class="shrink-0 text-sm font-black uppercase tracking-widest text-zinc-400"
          >
            Lista de Insumos
          </h3>
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
          <UIcon name="i-lucide-package-x" class="h-8 w-8 text-zinc-400" />
        </div>
        <h3 class="text-lg font-bold text-zinc-900 dark:text-white">
          Nenhum insumo encontrado
        </h3>
        <p class="text-sm text-zinc-500">
          Tente ajustar seus filtros ou crie um novo insumo.
        </p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800">
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Insumo
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Tipo
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Custo
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Estoque
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Status
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in paginatedMaterials"
              :key="m.id"
              class="group border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50"
            >
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800"
                  >
                    <UIcon :name="typeConfig[m.type].icon" class="h-5 w-5" />
                  </div>
                  <div>
                    <div class="font-bold text-zinc-900 dark:text-white">
                      {{ m.name }}
                    </div>
                    <div class="text-[10px] text-zinc-400 uppercase font-black">
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
                    class="h-1.5 w-1.5 rounded-full"
                    :class="m.stock < 100 ? 'bg-amber-500' : 'bg-green-500'"
                  />
                  <span class="font-bold text-zinc-900 dark:text-white">
                    {{ formatNumber(m.stock) }} {{ m.unit }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-4">
                <UBadge
                  :color="m.active ? 'success' : 'neutral'"
                  variant="soft"
                  size="xs"
                >
                  {{ m.active ? "Ativo" : "Inativo" }}
                </UBadge>
              </td>
              <td class="px-4 py-4 text-right">
                <UDropdownMenu
                  :items="[
                    [
                      {
                        label: 'Editar',
                        icon: 'i-heroicons-pencil-square',
                        onSelect: () => openEdit(m),
                      },
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
                    size="xs"
                  />
                </UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template v-if="totalPages > 1" #footer>
        <div class="flex justify-center py-2">
          <UPagination
            v-model="page"
            :total="filteredMaterials.length"
            :page-count="pageSize"
          />
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
