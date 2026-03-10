<script setup lang="ts">
import type { MixDesign } from "~/types/mix-designs";
import { type Material } from "~/types/inventory";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Traços | Meu Concreto" });

const { companyId } = useAuth();
const toast = useToast();

// typeConfig imported from inventory types

// ─────────────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────────────
// 1. Fetch Mix Designs
const {
  data: mixDesignsData,
  refresh: refreshMixDesigns,
  pending: loadingMixDesigns,
} = await useFetch<{ mixDesigns: MixDesign[] }>("/api/mix-designs", {
  query: { companyId },
});

const mixDesigns = computed<MixDesign[]>(
  () => mixDesignsData.value?.mixDesigns ?? [],
);

// 2. Fetch Materials (for the drawer)
const { data: materialsData } = await useFetch<{ materials: Material[] }>(
  "/api/materials",
  { query: { companyId } },
);

const materials = computed(() => materialsData.value?.materials ?? []);

// ─────────────────────────────────────────────
// Summary Stats
// ─────────────────────────────────────────────
const stats = computed(() => {
  const all = mixDesigns.value;
  // Calculate average cost per mix design based on current material costs
  // Note: This requires full material data, but we rely on what's in items.material
  // If items.material is populated by the API, we can calculate.

  return {
    total: all.length,
    recent: all.filter((m) => {
      const date = new Date(m.createdAt);
      const now = new Date();
      return now.getTime() - date.getTime() < 30 * 24 * 60 * 60 * 1000; // 30 days
    }).length,
  };
});

// materials used in MixDesignDrawer

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref("");

const filteredMixDesigns = computed(() => {
  if (!search.value) return mixDesigns.value;
  const q = search.value.toLowerCase();
  return mixDesigns.value.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.description || "").toLowerCase().includes(q),
  );
});

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1);
const pageSize = ref(12);

const paginatedMixDesigns = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredMixDesigns.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredMixDesigns.value.length / pageSize.value),
);

watch(search, () => {
  page.value = 1;
});

// Drawer state
const isDrawerOpen = ref(false);
const editingMixDesign = ref<MixDesign | null>(null);

const openCreate = () => {
  editingMixDesign.value = null;
  isDrawerOpen.value = true;
};

const openEdit = (m: MixDesign) => {
  editingMixDesign.value = m;
  isDrawerOpen.value = true;
};

// Logic moved to MixDesignDrawer

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────
// Logic moved to MixDesignDrawer

const deleteMixDesign = async (id: number) => {
  if (!confirm("Tem certeza que deseja excluir este traço?")) return;

  try {
    await $fetch(`/api/mix-designs/${id}`, { method: "DELETE" });
    toast.add({ title: "Traço excluído", color: "success" });
    refreshMixDesigns();
  } catch (error: any) {
    toast.add({
      title: "Erro ao excluir",
      description: error.data?.message || "Verifique se o traço está em uso.",
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
          Traços
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie receitas e composições de concreto.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-path"
          label="Atualizar"
          size="md"
          :loading="loadingMixDesigns"
          @click="() => refreshMixDesigns()"
        />
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          size="md"
          @click="openCreate"
        >
          Novo Traço
        </UButton>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
            >Total de Traços</span
          >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
          >
            <UIcon name="i-heroicons-beaker" class="h-5 w-5 text-primary-500" />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.total }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          receitas cadastradas
        </p>
      </div>

      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
            >Novos (30d)</span
          >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10"
          >
            <UIcon name="i-heroicons-sparkles" class="h-5 w-5 text-blue-500" />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.recent }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          criados recentemente
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
              Registros de Traços
            </h3>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar traço..."
              size="sm"
              class="w-full sm:w-64"
            />
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div
        v-if="filteredMixDesigns.length === 0"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <div
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          <UIcon name="i-heroicons-beaker" class="h-8 w-8 text-zinc-400" />
        </div>
        <h3 class="text-lg font-bold text-zinc-900 dark:text-white">
          Nenhum traço encontrado
        </h3>
        <p class="text-sm text-zinc-500">Crie uma nova receita para começar.</p>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          class="mt-4 h-11 px-4"
          @click="openCreate"
        >
          Criar novo traço
        </UButton>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
              <th
                class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Traço
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                FCK
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Slump
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Composição
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Custo Estimado
              </th>
              <th class="px-6 py-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            <tr
              v-for="mix in paginatedMixDesigns"
              :key="mix.id"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700"
                  >
                    <UIcon
                      name="i-heroicons-beaker"
                      class="h-5 w-5 text-zinc-500"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <span
                      class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors"
                    >
                      {{ mix.name }}
                    </span>
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      >
                        {{ mix.items.length }} insumos
                      </span>
                      <span
                        v-if="mix.description"
                        class="text-[11px] font-bold text-zinc-400 line-clamp-1"
                      >
                        {{ mix.description }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4">
                <span
                  class="text-xs font-bold text-zinc-600 dark:text-zinc-400"
                >
                  {{ mix.fck ? `${mix.fck} MPa` : "—" }}
                </span>
              </td>
              <td class="px-4 py-4">
                <span
                  class="text-xs font-bold text-zinc-600 dark:text-zinc-400"
                >
                  {{ mix.slump ? `${mix.slump} cm` : "—" }}
                </span>
              </td>
              <td class="px-4 py-4">
                <div class="flex flex-wrap gap-1.5">
                  <UBadge
                    v-for="item in mix.items.slice(0, 3)"
                    :key="item.id"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="font-black uppercase tracking-wider"
                  >
                    {{ item.material?.name }}
                  </UBadge>
                  <span
                    v-if="mix.items.length > 3"
                    class="text-[10px] font-black uppercase tracking-wider text-zinc-400"
                  >
                    +{{ mix.items.length - 3 }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-4">
                <span
                  class="font-black tabular-nums text-zinc-900 dark:text-white"
                >
                  {{ formatCurrency(mix.totalCost || 0) }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1 transition-all">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="md"
                    class="rounded-xl w-11 h-11 flex items-center justify-center p-0"
                    @click="openEdit(mix)"
                  />
                  <UDropdownMenu
                    :items="[
                      [
                        {
                          label: 'Excluir',
                          icon: 'i-heroicons-trash',
                          color: 'error',
                          onSelect: () => deleteMixDesign(mix.id),
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

      <!-- Pagination -->
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

    <!-- Mix Design Drawer -->
    <MixDesignsMixDesignDrawer
      v-model:open="isDrawerOpen"
      :mix-design="editingMixDesign"
      :materials="materials"
      @saved="refreshMixDesigns"
    />
  </div>
</template>
