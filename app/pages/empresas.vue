<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Empresas | Meu Concreto' })

const { user } = useAuth()
const toast = useToast()

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Company {
  id: number
  name: string
  document: string // CNPJ — stored without mask
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  active: boolean
  createdAt: string | number
  updatedAt: string | number
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: companiesData,
  refresh: refreshCompanies,
  pending: loadingCompanies
} = await useFetch('/api/companies')

const companies = computed<Company[]>(
  () => (companiesData.value as { companies?: Company[] })?.companies ?? []
)

// ─────────────────────────────────────────────
// Summary stats
// ─────────────────────────────────────────────
const stats = computed(() => {
  const all = companies.value
  const now = new Date()
  const thisMonth = all.filter((c) => {
    const d = new Date(c.createdAt as string | number)
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    )
  })
  return {
    total: all.length,
    active: all.filter(c => c.active).length,
    inactive: all.filter(c => !c.active).length,
    thisMonth: thisMonth.length
  }
})

const kpiItems = computed(() => [
  {
    label: 'Total de Empresas',
    value: stats.value.total,
    suffix: 'cadastradas',
    icon: 'i-heroicons-building-office-2',
    color: 'text-primary-500',
    bg: 'bg-primary-50 dark:bg-primary-500/10'
  },
  {
    label: 'Empresas Ativas',
    value: stats.value.active,
    suffix: 'em operação',
    icon: 'i-heroicons-check-circle',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-500/10'
  },
  {
    label: 'Empresas Inativas',
    value: stats.value.inactive,
    suffix: 'desativadas',
    icon: 'i-heroicons-eye-slash',
    color: 'text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-800'
  },
  {
    label: 'Cadastradas no Mês',
    value: stats.value.thisMonth,
    suffix: 'este mês',
    icon: 'i-heroicons-calendar-days',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10'
  }
])

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref('')
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')

const filteredCompanies = computed(() => {
  return companies.value.filter((c) => {
    const matchActive
      = activeFilter.value === 'all'
        || (activeFilter.value === 'active' && c.active)
        || (activeFilter.value === 'inactive' && !c.active)
    const q = search.value.toLowerCase()
    const matchSearch
      = !q
        || c.name.toLowerCase().includes(q)
        || c.document.includes(q.replace(/\D/g, ''))
        || (c.city ?? '').toLowerCase().includes(q)
        || (c.email ?? '').toLowerCase().includes(q)
    return matchActive && matchSearch
  })
})

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1)
const pageSize = ref(10)

const paginatedCompanies = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCompanies.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() =>
  Math.ceil(filteredCompanies.value.length / pageSize.value)
)

watch([search, activeFilter], () => {
  page.value = 1
})

// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────
const formatCnpj = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

const formatDate = (v: string | number | null | undefined) => {
  if (!v) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(
    new Date(v as string | number)
  )
}

// ─────────────────────────────────────────────
// Drawer State
// ─────────────────────────────────────────────
const isDrawerOpen = ref(false)
const editingCompany = ref<Company | null>(null)

const openCreate = () => {
  editingCompany.value = null
  isDrawerOpen.value = true
}

const openEdit = (c: Company) => {
  editingCompany.value = c
  isDrawerOpen.value = true
}

// ─────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────
const toggleActive = async (c: Company) => {
  try {
    await $fetch(`/api/companies/${c.id}`, {
      method: 'PUT',
      body: { active: !c.active }
    })
    toast.add({
      title: c.active ? 'Empresa desativada' : 'Empresa ativada',
      description: `"${c.name}" foi ${c.active ? 'desativada' : 'ativada'}.`,
      color: c.active ? 'neutral' : 'success',
      icon: c.active ? 'i-heroicons-eye-slash' : 'i-heroicons-check-circle'
    })
    await refreshCompanies()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string, statusMessage?: string } }
    toast.add({
      title: 'Erro',
      description:
        err?.data?.message ?? err?.data?.message ?? err?.data?.statusMessage ?? 'Tente novamente.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
const deleteTarget = ref<Company | null>(null)
const loadingDelete = ref(false)
const isDeleteModalOpen = ref(false)
const deleteError = ref('')

const confirmDelete = (c: Company) => {
  deleteTarget.value = c
  deleteError.value = ''
  isDeleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  loadingDelete.value = true
  deleteError.value = ''
  const name = deleteTarget.value.name
  try {
    await $fetch(`/api/companies/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    isDeleteModalOpen.value = false
    toast.add({
      title: 'Empresa excluída',
      description: `"${name}" foi removida do sistema.`,
      color: 'neutral',
      icon: 'i-heroicons-trash'
    })
    await refreshCompanies()
  } catch (e: unknown) {
    const err = e as {
      statusCode?: number
      data?: { message?: string, statusMessage?: string }
      message?: string
    }
    if (err?.statusCode === 409) {
      deleteError.value
        = 'Não é possível excluir: esta empresa possui usuários vinculados. Remova os usuários primeiro.'
    } else {
      deleteError.value
        = err?.data?.message
          ?? err?.data?.message ?? err?.data?.statusMessage
          ?? err?.message
          ?? 'Erro ao excluir.'
    }
  } finally {
    loadingDelete.value = false
  }
}

const ACTIVE_OPTS = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'active' },
  { label: 'Inativas', value: 'inactive' }
]
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Empresas
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie as empresas e clientes cadastrados no sistema
        </p>
      </div>
      <UButton
        v-if="user?.role === 'admin'"
        color="primary"
        icon="i-heroicons-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Nova Empresa
      </UButton>
    </div>

    <!-- ── KPI Strip (Design System compliant) ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <template v-if="loadingCompanies">
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
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-2 h-6 bg-primary-500 rounded-full" />
            <h3 class="font-black text-zinc-900 dark:text-white uppercase tracking-tight">
              Lista de Empresas
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar nome, CNPJ, cidade..."
              size="sm"
              class="w-44 lg:w-56"
            />
            <USelect
              v-model="activeFilter"
              :items="ACTIVE_OPTS"
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
        v-if="loadingCompanies"
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

      <!-- Empty state -->
      <div
        v-else-if="filteredCompanies.length === 0"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <div class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
          <UIcon
            name="i-heroicons-building-office-2"
            class="w-8 h-8 text-zinc-300 dark:text-zinc-600"
          />
        </div>
        <p class="text-sm font-bold text-zinc-900 dark:text-white">
          Nenhuma empresa encontrada
        </p>
        <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">
          Ajuste os filtros ou cadastre uma nova empresa
        </p>
        <UButton
          v-if="user?.role === 'admin'"
          color="primary"
          icon="i-heroicons-plus"
          size="sm"
          class="mt-4"
          @click="openCreate"
        >
          Cadastrar Empresa
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
              <th class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Empresa
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell">
                CNPJ
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell">
                Localização
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell">
                Contato
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell">
                Cadastro
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Status
              </th>
              <th class="px-6 py-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            <tr
              v-for="c in paginatedCompanies"
              :key="c.id"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
              :class="{ 'opacity-60': !c.active }"
            >
              <!-- Name + initials avatar -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                    <span class="text-sm font-black text-primary-600 dark:text-primary-400">
                      {{ c.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors">
                      {{ c.name }}
                    </p>
                    <p
                      v-if="c.email"
                      class="text-xs text-zinc-400 truncate max-w-36 sm:max-w-52"
                    >
                      {{ c.email }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- CNPJ -->
              <td class="px-4 py-4 text-xs text-zinc-500 font-mono whitespace-nowrap hidden md:table-cell">
                {{ formatCnpj(c.document) }}
              </td>

              <!-- Location -->
              <td class="px-4 py-4 hidden lg:table-cell">
                <div
                  v-if="c.city || c.state"
                  class="flex items-center gap-1.5"
                >
                  <UIcon
                    name="i-heroicons-map-pin"
                    class="w-3.5 h-3.5 text-zinc-400 shrink-0"
                  />
                  <span class="text-sm text-zinc-600 dark:text-zinc-300">
                    {{ [c.city, c.state].filter(Boolean).join(" / ") }}
                  </span>
                </div>
                <span
                  v-else
                  class="text-xs text-zinc-300 dark:text-zinc-700"
                >—</span>
              </td>

              <!-- Contact -->
              <td class="px-4 py-4 hidden xl:table-cell">
                <div
                  v-if="c.phone"
                  class="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300"
                >
                  <UIcon
                    name="i-heroicons-phone"
                    class="w-3.5 h-3.5 text-zinc-400 shrink-0"
                  />
                  {{ formatPhone(c.phone) }}
                </div>
                <span
                  v-else
                  class="text-xs text-zinc-300 dark:text-zinc-700"
                >—</span>
              </td>

              <!-- Created at -->
              <td class="px-4 py-4 text-xs text-zinc-400 whitespace-nowrap hidden sm:table-cell">
                {{ formatDate(c.createdAt) }}
              </td>

              <!-- Status -->
              <td class="px-4 py-4">
                <button
                  class="group/toggle"
                  @click="toggleActive(c)"
                >
                  <UBadge
                    :color="c.active ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                    class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5 cursor-pointer transition-opacity group-hover/toggle:opacity-70"
                  >
                    {{ c.active ? "Ativa" : "Inativa" }}
                  </UBadge>
                </button>
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
                    @click="openEdit(c)"
                  />
                  <UDropdownMenu
                    :items="[
                      [
                        {
                          label: c.active ? 'Desativar' : 'Ativar',
                          icon: c.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye',
                          onSelect: () => toggleActive(c)
                        }
                      ],
                      ...(user?.role === 'admin'
                        ? [
                          [
                            {
                              label: 'Excluir Empresa',
                              icon: 'i-heroicons-trash',
                              color: 'error' as const,
                              onSelect: () => confirmDelete(c)
                            }
                          ]
                        ]
                        : [])
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

      <!-- Pagination -->
      <template
        v-if="filteredCompanies.length > pageSize"
        #footer
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            {{ filteredCompanies.length }} empresas · página {{ page }} de {{ totalPages }}
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

    <!-- ── Drawer ── -->
    <CompaniesCompanyDrawer
      v-model:open="isDrawerOpen"
      :company="editingCompany"
      @saved="refreshCompanies"
    />

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Excluir Empresa"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir a empresa
            <span class="font-bold text-zinc-900 dark:text-white">
              "{{ deleteTarget?.name }}" </span>?
          </p>

          <!-- Preview do item -->
          <div
            v-if="deleteTarget"
            class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                <span class="text-sm font-black text-primary-600 dark:text-primary-400">
                  {{ deleteTarget.name.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  {{ deleteTarget.name }}
                </p>
                <p class="text-xs text-zinc-400">
                  {{ formatCnpj(deleteTarget.document) }}
                </p>
              </div>
            </div>
            <UBadge
              :color="deleteTarget.active ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
              class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
            >
              {{ deleteTarget.active ? "Ativa" : "Inativa" }}
            </UBadge>
          </div>

          <!-- Conflict error shown inline in modal -->
          <div
            v-if="deleteError"
            class="rounded-xl bg-red-50 dark:bg-red-500/10 p-4 border border-red-200 dark:border-red-500/20"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-red-500"
              />
              <p class="text-xs font-bold text-red-700 dark:text-red-400">
                {{ deleteError }}
              </p>
            </div>
          </div>

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
