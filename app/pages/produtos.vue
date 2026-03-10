<script setup lang="ts">
import type {
  Product,
  ProductType,
  MixDesign
} from '~/types/products'
import { typeConfig, UNIT_LABELS } from '~/types/products'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Produtos | Meu Concreto' })

const { companyId } = useAuth()
const toast = useToast()

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

const {
  data: productsData,
  refresh: refreshProducts,
  pending: loadingProducts
} = await useFetch<{ products: Product[] }>('/api/products', {
  query: { companyId }
})

const products = computed<Product[]>(() => productsData.value?.products ?? [])

const { data: mixDesignsData } = await useFetch<{ mixDesigns: MixDesign[] }>(
  '/api/mix-designs',
  {
    query: { companyId }
  }
)
const mixDesigns = computed(() => mixDesignsData.value?.mixDesigns ?? [])
const PREVIEW_TYPE_OPTS = [
  { label: 'Todos os Tipos', value: 'all' },
  { label: 'Concreto', value: 'concrete' },
  { label: 'Bombeamento', value: 'pump' },
  { label: 'Aditivo', value: 'additive' },
  { label: 'Locação', value: 'rental' },
  { label: 'Outro', value: 'other' }
]

// ─────────────────────────────────────────────
// Summary stats
// ─────────────────────────────────────────────
const stats = computed(() => {
  const all = products.value
  const active = all.filter(p => p.active)
  const concrete = all.filter(p => p.type === 'concrete')
  const avgPrice
    = active.length > 0
      ? active.reduce((s, p) => s + p.price, 0) / active.length
      : 0
  return {
    total: all.length,
    active: active.length,
    concrete: concrete.length,
    avgPrice
  }
})

const kpiItems = computed(() => [
  {
    label: 'Total de Produtos',
    value: stats.value.total,
    suffix: 'cadastrados',
    icon: 'i-heroicons-archive-box',
    color: 'text-primary-500',
    bg: 'bg-primary-50 dark:bg-primary-500/10'
  },
  {
    label: 'Produtos Ativos',
    value: stats.value.active,
    suffix: 'disponíveis',
    icon: 'i-heroicons-check-circle',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-500/10'
  },
  {
    label: 'Concretos',
    value: stats.value.concrete,
    suffix: 'traços cadastrados',
    icon: 'i-heroicons-cube',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10'
  },
  {
    label: 'Preço Médio',
    value: formatCurrency(stats.value.avgPrice),
    suffix: 'por produto ativo',
    icon: 'i-heroicons-currency-dollar',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10'
  }
])

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref('')
const typeFilter = ref<ProductType | 'all'>('all')
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')

const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchType = typeFilter.value === 'all' || p.type === typeFilter.value
    const matchActive
      = activeFilter.value === 'all'
        || (activeFilter.value === 'active' && p.active)
        || (activeFilter.value === 'inactive' && !p.active)
    const q = search.value.toLowerCase()
    const matchSearch
      = !q
        || p.name.toLowerCase().includes(q)
        || (p.sku ?? '').toLowerCase().includes(q)
        || (p.description ?? '').toLowerCase().includes(q)
    return matchType && matchActive && matchSearch
  })
})

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1)
const pageSize = ref(12)

const paginatedProducts = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredProducts.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() =>
  Math.ceil(filteredProducts.value.length / pageSize.value)
)

watch([search, typeFilter, activeFilter], () => {
  page.value = 1
})

// Drawer state
const isDrawerOpen = ref(false)
const editingProduct = ref<Product | null>(null)

const openCreate = () => {
  editingProduct.value = null
  isDrawerOpen.value = true
}

const openEdit = (p: Product) => {
  editingProduct.value = p
  isDrawerOpen.value = true
}

// Save logic now in ProductDrawer components

// ─────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────
const toggleActive = async (p: Product) => {
  try {
    await $fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      body: { active: !p.active }
    })
    toast.add({
      title: p.active ? 'Produto desativado' : 'Produto ativado',
      description: `"${p.name}" foi ${p.active ? 'desativado' : 'ativado'}.`,
      color: p.active ? 'neutral' : 'success',
      icon: p.active ? 'i-heroicons-eye-slash' : 'i-heroicons-check-circle'
    })
    await refreshProducts()
  } catch (e: any) {
    toast.add({
      title: 'Erro',
      description:
        e?.data?.message
        ?? e?.data?.message
        ?? e?.data?.statusMessage
        ?? 'Tente novamente.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
const deleteTarget = ref<Product | null>(null)
const loadingDelete = ref(false)
const isDeleteModalOpen = ref(false)

const confirmDelete = (p: Product) => {
  deleteTarget.value = p
  isDeleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  loadingDelete.value = true
  const name = deleteTarget.value.name
  try {
    await $fetch(`/api/products/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    isDeleteModalOpen.value = false
    toast.add({
      title: 'Produto excluído',
      description: `"${name}" foi removido do catálogo.`,
      color: 'neutral',
      icon: 'i-heroicons-trash'
    })
    await refreshProducts()
  } catch (e: any) {
    toast.add({
      title: 'Erro ao excluir',
      description:
        e?.data?.message
        ?? e?.data?.message
        ?? e?.data?.statusMessage
        ?? e?.message
        ?? 'Tente novamente.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingDelete.value = false
    deleteTarget.value = null
  }
}

// ─────────────────────────────────────────────
// Row actions (Design System: Edit + Dropdown)
// ─────────────────────────────────────────────
const rowActionItems = (p: Product) => [
  [
    {
      label: p.active ? 'Desativar' : 'Ativar',
      icon: p.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye',
      onSelect: () => toggleActive(p)
    }
  ],
  [
    {
      label: 'Excluir Produto',
      icon: 'i-heroicons-trash',
      color: 'error' as const,
      onSelect: () => confirmDelete(p)
    }
  ]
]

// Active filter options
const ACTIVE_OPTS = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'active' },
  { label: 'Inativos', value: 'inactive' }
]

// Unit options for select
const UNIT_OPTS = [
  { label: 'm³ — metros cúbicos', value: 'm3' },
  { label: 'un — unidade', value: 'un' },
  { label: 'hr — hora', value: 'hr' },
  { label: 'kg — quilograma', value: 'kg' },
  { label: 'ton — tonelada', value: 'ton' }
]

// Type options for form
const TYPE_FORM_OPTS = [
  { label: 'Concreto', value: 'concrete' },
  { label: 'Bombeamento', value: 'pump' },
  { label: 'Aditivo', value: 'additive' },
  { label: 'Locação', value: 'rental' },
  { label: 'Outro', value: 'other' }
]
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

    <!-- ── KPI Strip (Design System compliant) ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <template v-if="loadingProducts">
        <USkeleton
          v-for="i in 4"
          :key="i"
          class="h-28 rounded-3xl"
        />
      </template>
      <template v-else>
        <div
          v-for="(kpi, i) in kpiItems"
          :key="i"
          class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-tight">
              {{ kpi.label }}
            </span>
            <div :class="[kpi.bg, 'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0']">
              <UIcon
                :name="kpi.icon"
                :class="['w-6 h-6', kpi.color]"
              />
            </div>
          </div>
          <p class="text-3xl font-black tabular-nums tracking-tighter" :class="kpi.color">
            {{ kpi.value }}
          </p>
          <div class="flex items-center gap-1.5 -mt-2">
            <div :class="[kpi.color, 'w-1.5 h-1.5 rounded-full animate-pulse']" />
            <p class="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
              {{ kpi.suffix }}
            </p>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Table Card (Design System compliant) ── -->
    <UCard
      :ui="{
        body: 'p-0 sm:p-0',
        header: 'p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
        footer: 'p-4 border-t border-zinc-100 dark:border-zinc-800'
      }"
      class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden"
    >
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-2 h-6 bg-primary-500 rounded-full" />
            <h3 class="font-black text-zinc-900 dark:text-white uppercase tracking-tight">
              Catálogo de Produtos
            </h3>
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
      <div
        v-if="loadingProducts"
        class="divide-y divide-zinc-100 dark:divide-zinc-800/50"
      >
        <div
          v-for="i in 6"
          :key="i"
          class="px-6 py-4"
        >
          <USkeleton class="h-12 rounded-xl" />
        </div>
      </div>

      <!-- Empty state (Design System compliant) -->
      <div
        v-else-if="filteredProducts.length === 0"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <div class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
          <UIcon
            name="i-heroicons-archive-box"
            class="w-8 h-8 text-zinc-300 dark:text-zinc-600"
          />
        </div>
        <p class="text-sm font-bold text-zinc-900 dark:text-white">
          {{ products.length === 0 ? "Nenhum produto encontrado" : "Nenhum produto corresponde aos filtros" }}
        </p>
        <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">
          {{ products.length === 0 ? "Crie o primeiro produto para começar" : "Tente outros termos de busca" }}
        </p>
        <UButton
          v-if="products.length === 0"
          color="primary"
          icon="i-heroicons-plus"
          size="sm"
          class="mt-4"
          @click="openCreate"
        >
          Criar Primeiro Produto
        </UButton>
      </div>

      <!-- Table -->
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
              <th class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                Produto
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden sm:table-cell">
                Tipo
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden lg:table-cell">
                Especificações
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden md:table-cell">
                SKU
              </th>
              <th class="text-right px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                Preço
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                Status
              </th>
              <th class="px-6 py-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            <tr
              v-for="p in paginatedProducts"
              :key="p.id"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
              :class="{ 'opacity-50': !p.active }"
            >
              <!-- Product name + description -->
              <td class="px-6 py-4">
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
                            : 'bg-zinc-100 dark:bg-zinc-800'
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
                              : 'text-zinc-500'
                      ]"
                    />
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-zinc-900 dark:text-white truncate max-w-40 sm:max-w-56 group-hover:text-primary-600 transition-colors">
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
              <td class="px-4 py-4 hidden sm:table-cell">
                <UBadge
                  :color="typeConfig[p.type].color as any"
                  variant="subtle"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
                >
                  {{ typeConfig[p.type].label }}
                </UBadge>
              </td>

              <!-- Concrete specs -->
              <td class="px-4 py-4 hidden lg:table-cell">
                <div
                  v-if="p.type === 'concrete' && (p.fck || p.slump || p.stoneSize)"
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
                <span
                  v-else
                  class="text-xs text-zinc-300 dark:text-zinc-700"
                >—</span>
              </td>

              <!-- SKU -->
              <td class="px-4 py-4 text-xs text-zinc-400 font-mono hidden md:table-cell">
                {{ p.sku || "—" }}
              </td>

              <!-- Price -->
              <td class="px-4 py-4 text-right whitespace-nowrap">
                <span class="font-black tabular-nums text-base tracking-tighter text-zinc-900 dark:text-white">
                  {{ formatCurrency(p.price) }}
                </span>
                <span class="text-xs text-zinc-400 font-normal ml-1">
                  / {{ UNIT_LABELS[p.unit] }}
                </span>
              </td>

              <!-- Status -->
              <td class="px-4 py-4">
                <UBadge
                  :color="p.active ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5 cursor-pointer transition-opacity hover:opacity-70"
                  @click="toggleActive(p)"
                >
                  {{ p.active ? "Ativo" : "Inativo" }}
                </UBadge>
              </td>

              <!-- Actions (Design System: Edit + Dropdown) -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1 transition-all">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="md"
                    class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    @click="openEdit(p)"
                  />
                  <UDropdownMenu :items="rowActionItems(p)">
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

      <!-- Pagination (Design System compliant) -->
      <template
        v-if="totalPages > 1"
        #footer
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            {{ filteredProducts.length }} produtos · página {{ page }} de {{ totalPages }}
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

    <!-- ══════════════════════════════════════════
         DRAWER — Create / Edit
    ══════════════════════════════════════════ -->
    <ProductsProductDrawer
      v-model:open="isDrawerOpen"
      :product="editingProduct"
      :mix-designs="mixDesigns"
      @saved="refreshProducts"
    />

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm (Design System compliant)
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Excluir Produto"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-6 h-6 text-red-500"
              />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar exclusão
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja excluir
                <span class="font-bold text-zinc-700 dark:text-zinc-300">"{{ deleteTarget?.name }}"</span>?
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <!-- Preview do item -->
          <div
            v-if="deleteTarget"
            class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-500/20">
                <UIcon :name="typeConfig[deleteTarget.type].icon" class="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  {{ deleteTarget.name }}
                </p>
                <p class="text-xs text-zinc-400">
                  {{ formatCurrency(deleteTarget.price) }} / {{ UNIT_LABELS[deleteTarget.unit] }}
                </p>
              </div>
            </div>
            <UBadge
              :color="deleteTarget.active ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
              class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
            >
              {{ deleteTarget.active ? 'Ativo' : 'Inativo' }}
            </UBadge>
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            description="Orçamentos e vendas que já usam este produto não serão afetados."
          />

          <p class="text-xs text-zinc-400">
            Esta ação é irreversível.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="loadingDelete"
            @click="isDeleteModalOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            :loading="loadingDelete"
            @click="handleDelete"
          >
            Excluir
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
