<script setup lang="ts">
import type { MixDesign, MixDesignItem } from '~/types/mix-designs'
import {
  typeConfig,
  type Material,
  type MaterialType,
  type MaterialUnit
} from '~/types/inventory'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Traços | Meu Concreto' })

const { companyId } = useAuth()
const toast = useToast()

// typeConfig imported from inventory types

// ─────────────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────────────
// 1. Fetch Mix Designs
const {
  data: mixDesignsData,
  refresh: refreshMixDesigns,
  pending: loadingMixDesigns
} = await useFetch<{ mixDesigns: MixDesign[] }>('/api/mix-designs', {
  query: { companyId }
})

const mixDesigns = computed<MixDesign[]>(
  () => mixDesignsData.value?.mixDesigns ?? []
)

// 2. Fetch Materials (for the drawer)
const { data: materialsData } = await useFetch<{ materials: Material[] }>(
  '/api/materials',
  { query: { companyId } }
)

const materials = computed(() => materialsData.value?.materials ?? [])

// ─────────────────────────────────────────────
// Summary Stats
// ─────────────────────────────────────────────
const stats = computed(() => {
  const all = mixDesigns.value
  // Calculate average cost per mix design based on current material costs
  // Note: This requires full material data, but we rely on what's in items.material
  // If items.material is populated by the API, we can calculate.

  return {
    total: all.length,
    recent: all.filter((m) => {
      const date = new Date(m.createdAt)
      const now = new Date()
      return now.getTime() - date.getTime() < 30 * 24 * 60 * 60 * 1000 // 30 days
    }).length
  }
})

// materials used in MixDesignDrawer

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref('')

const filteredMixDesigns = computed(() => {
  if (!search.value) return mixDesigns.value
  const q = search.value.toLowerCase()
  return mixDesigns.value.filter(
    m =>
      m.name.toLowerCase().includes(q)
      || (m.description || '').toLowerCase().includes(q)
  )
})

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1)
const pageSize = ref(12)

const paginatedMixDesigns = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredMixDesigns.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() =>
  Math.ceil(filteredMixDesigns.value.length / pageSize.value)
)

watch(search, () => {
  page.value = 1
})

// Drawer state
const isDrawerOpen = ref(false)
const editingMixDesign = ref<MixDesign | null>(null)

const openCreate = () => {
  editingMixDesign.value = null
  isDrawerOpen.value = true
}

const openEdit = (m: MixDesign) => {
  editingMixDesign.value = m
  isDrawerOpen.value = true
}

// Logic moved to MixDesignDrawer

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────
// Logic moved to MixDesignDrawer

const deleteMixDesign = async (id: number) => {
  if (!confirm('Tem certeza que deseja excluir este traço?')) return

  try {
    await $fetch(`/api/mix-designs/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Traço excluído', color: 'success' })
    refreshMixDesigns()
  } catch (error: any) {
    toast.add({
      title: 'Erro ao excluir',
      description: error.data?.message || 'Verifique se o traço está em uso.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- Header Page -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Traços
        </h1>
        <p class="text-sm text-zinc-500 mt-1">
          Gerencie receitas e composições de concreto.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :loading="loadingMixDesigns"
          @click="() => refreshMixDesigns()"
        />
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          @click="openCreate"
        >
          Novo Traço
        </UButton>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <div
        class="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-xs font-black uppercase tracking-widest leading-tight text-zinc-400"
          >Total de Traços</span>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
          >
            <UIcon
              name="i-heroicons-beaker"
              class="h-5 w-5 text-primary-500"
            />
          </div>
        </div>
        <span
          class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
        >{{ stats.total }}</span>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          receitas cadastradas
        </p>
      </div>

      <div
        class="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-xs font-black uppercase tracking-widest leading-tight text-zinc-400"
          >Novos (30d)</span>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10"
          >
            <UIcon
              name="i-heroicons-sparkles"
              class="h-5 w-5 text-blue-500"
            />
          </div>
        </div>
        <span
          class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
        >{{ stats.recent }}</span>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          criados recentemente
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
            >
              <UIcon
                name="i-heroicons-beaker"
                class="h-5 w-5 text-primary-500"
              />
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-widest text-zinc-400"
              >
                Lista de Traços
              </h3>
              <p class="mt-0.5 text-xs text-zinc-400">
                Gerencie suas receitas
              </p>
            </div>
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
          <UIcon
            name="i-heroicons-beaker"
            class="h-8 w-8 text-zinc-400"
          />
        </div>
        <h3 class="text-lg font-bold text-zinc-900 dark:text-white">
          Nenhum traço encontrado
        </h3>
        <p class="text-sm text-zinc-500">
          Crie uma nova receita para começar.
        </p>
        <UButton
          v-if="mixDesigns.length === 0"
          color="primary"
          variant="soft"
          class="mt-4"
          @click="openCreate"
        >
          Criar Traço
        </UButton>
      </div>

      <!-- Grid -->
      <div
        v-else
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="mix in paginatedMixDesigns"
          :key="mix.id"
          class="group relative flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary-800"
        >
          <!-- Header -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
              >
                <UIcon
                  name="i-heroicons-beaker"
                  class="h-5 w-5"
                />
              </div>
              <div>
                <h4 class="font-bold text-zinc-900 dark:text-white">
                  {{ mix.name }}
                </h4>
                <p class="text-xs text-zinc-500">
                  {{ mix.items.length }} insumos
                </p>
              </div>
            </div>
            <UDropdownMenu
              :items="[
                [
                  {
                    label: 'Editar',
                    icon: 'i-heroicons-pencil-square',
                    onSelect: () => openEdit(mix)
                  },
                  {
                    label: 'Excluir',
                    icon: 'i-heroicons-trash',
                    color: 'error',
                    onSelect: () => deleteMixDesign(mix.id)
                  }
                ]
              ]"
            >
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-ellipsis-vertical"
                size="xs"
              />
            </UDropdownMenu>
          </div>

          <!-- Description -->
          <p
            v-if="mix.description"
            class="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400"
          >
            {{ mix.description }}
          </p>

          <!-- Ingredients Preview -->
          <div
            class="flex flex-col gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50"
          >
            <span
              class="text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >Composição (Resumo)</span>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="item in mix.items.slice(0, 3)"
                :key="item.id"
                color="neutral"
                variant="soft"
                size="xs"
              >
                {{ item.material?.name }}
              </UBadge>
              <span
                v-if="mix.items.length > 3"
                class="text-xs text-zinc-500"
              >+{{ mix.items.length - 3 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <template #footer>
        <div
          v-if="totalPages > 1"
          class="flex justify-center py-2"
        >
          <UPagination
            v-model="page"
            :total="filteredMixDesigns.length"
            :page-count="pageSize"
          />
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
