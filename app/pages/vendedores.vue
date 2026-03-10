<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Vendedores | Meu Concreto' })

const { companyId } = useAuth()
const toast = useToast()

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Seller {
  id: number
  companyId: number
  name: string
  document: string | null
  email: string | null
  phone: string | null
  commissionRate: number
  active: boolean
  createdAt: string | number
  updatedAt: string | number
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: sellersData,
  refresh,
  pending: loadingList
} = await useFetch<{ sellers: Seller[] }>('/api/sellers', {
  query: { companyId }
})

const sellersList = computed<Seller[]>(() => sellersData.value?.sellers ?? [])

// ─────────────────────────────────────────────
// KPIs
// ─────────────────────────────────────────────
const stats = computed(() => {
  const list = sellersList.value
  const avgCommission = list.length
    ? list.reduce((s, m) => s + m.commissionRate, 0) / list.length
    : 0
  return {
    total: list.length,
    active: list.filter(s => s.active).length,
    inactive: list.filter(s => !s.active).length,
    avgCommission: Number(avgCommission.toFixed(2))
  }
})

const kpiItems = computed(() => [
  {
    label: 'Total de Vendedores',
    value: stats.value.total,
    suffix: 'cadastrados',
    icon: 'i-heroicons-user-group',
    color: 'text-primary-500',
    bg: 'bg-primary-50 dark:bg-primary-500/10'
  },
  {
    label: 'Vendedores Ativos',
    value: stats.value.active,
    suffix: 'disponíveis',
    icon: 'i-heroicons-check-circle',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-500/10'
  },
  {
    label: 'Vendedores Inativos',
    value: stats.value.inactive,
    suffix: 'desativados',
    icon: 'i-heroicons-eye-slash',
    color: 'text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-800'
  },
  {
    label: 'Comissão Média',
    value: `${stats.value.avgCommission}%`,
    suffix: 'sobre vendas',
    icon: 'i-heroicons-percent-badge',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10'
  }
])

// ─────────────────────────────────────────────
// Formatters / masks
// ─────────────────────────────────────────────
const formatCpf = (raw: string) => {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return raw
}

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11)
    return d.replace(/(\d{2})(\d{1})(\d{0,4})(\d{0,4})/, '($1) $2.$3-$4')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return raw
}

const sellerInitials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2)
    return (
      (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
    ).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref('')
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')

const filteredSellers = computed(() => {
  return sellersList.value.filter((s) => {
    const matchActive
      = activeFilter.value === 'all'
        || (activeFilter.value === 'active' && s.active)
        || (activeFilter.value === 'inactive' && !s.active)
    const q = search.value.toLowerCase()
    const matchSearch
      = !q
        || s.name.toLowerCase().includes(q)
        || (s.email ?? '').toLowerCase().includes(q)
        || (s.document ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    return matchActive && matchSearch
  })
})

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1)
const pageSize = ref(10)

const paginatedSellers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredSellers.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() =>
  Math.ceil(filteredSellers.value.length / pageSize.value)
)

watch([search, activeFilter], () => {
  page.value = 1
})

// ─────────────────────────────────────────────
// Drawer state
// ─────────────────────────────────────────────
const isDrawerOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const loadingSave = ref(false)

// ─────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────
const form = reactive({
  name: '',
  document: '',
  email: '',
  phone: '',
  commissionRate: 0,
  active: true
})

// 1. Estado de Erros
const formErrors = reactive<Record<string, string>>({})

// 2. Limpar Erros
const clearErrors = () => {
  for (const key in formErrors) {
    delete formErrors[key]
  }
}

// 3. Validação Universal
const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  // Validação: Nome
  if (!form.name || form.name.trim().length < 3) {
    formErrors.name = 'O nome deve ter pelo menos 3 caracteres.'
    isValid = false
  }

  // Validação: Comissão
  if (form.commissionRate < 0 || form.commissionRate > 100) {
    formErrors.commissionRate = 'A comissão deve estar entre 0% e 100%.'
    isValid = false
  }

  // Validação opcional: E-mail (Se o usuário preencher, tem que ser válido)
  if (form.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      formErrors.email = 'Insira um e-mail válido.'
      isValid = false
    }
  }

  return isValid
}

// Limpar erros ao fechar a gaveta
watch(isDrawerOpen, (isOpen) => {
  if (!isOpen) clearErrors()
})

// Input masks
watch(
  () => form.document,
  (val) => {
    const d = val.replace(/\D/g, '').slice(0, 11)
    let masked = d
    if (d.length > 9)
      masked = d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
    else if (d.length > 6)
      masked = d.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
    else if (d.length > 3) masked = d.replace(/(\d{3})(\d{0,3})/, '$1.$2')
    if (masked !== val) form.document = masked
  }
)

watch(
  () => form.phone,
  (val) => {
    const d = val.replace(/\D/g, '').slice(0, 11)
    let masked = d
    if (d.length > 7)
      masked = d.replace(/(\d{2})(\d{1})(\d{0,4})(\d{0,4})/, (_, a, b, c, e) =>
        e ? `(${a}) ${b}.${c}-${e}` : c ? `(${a}) ${b}.${c}` : `(${a}) ${b}`
      )
    else if (d.length > 2) masked = d.replace(/(\d{2})(\d{0,})/, '($1) $2')
    if (masked !== val) form.phone = masked
  }
)

const resetForm = () => {
  editingId.value = null
  isEditing.value = false
  form.name = ''
  form.document = ''
  form.email = ''
  form.phone = ''
  form.commissionRate = 0
  form.active = true
}

const openCreate = () => {
  resetForm()
  isDrawerOpen.value = true
}

const openEdit = (s: Seller) => {
  resetForm()
  isEditing.value = true
  editingId.value = s.id
  form.name = s.name
  form.document = s.document ? formatCpf(s.document) : ''
  form.email = s.email ?? ''
  form.phone = s.phone ? formatPhone(s.phone) : ''
  form.commissionRate = s.commissionRate
  form.active = s.active
  isDrawerOpen.value = true
}

// ─────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────
const handleSave = async () => {
  if (!validateForm()) return

  loadingSave.value = true
  try {
    const payload = {
      name: form.name.trim(),
      document: form.document.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      commissionRate: form.commissionRate,
      active: form.active
    }

    if (isEditing.value && editingId.value) {
      await $fetch(`/api/sellers/${editingId.value}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({
        title: 'Vendedor atualizado',
        description: `"${form.name}" foi atualizado.`,
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
    } else {
      await $fetch('/api/sellers', {
        method: 'POST',
        body: { companyId: companyId.value, ...payload }
      })
      toast.add({
        title: 'Vendedor cadastrado',
        description: `"${form.name}" foi adicionado.`,
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
    }
    isDrawerOpen.value = false
    await refresh()
  } catch (e: any) {
    const err = e
    toast.add({
      title: 'Erro ao salvar',
      description:
        err?.data?.message
        ?? err?.data?.statusMessage
        ?? err?.message
        ?? 'Erro ao salvar.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingSave.value = false
  }
}

// ─────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────
const toggleActive = async (s: Seller) => {
  try {
    await $fetch(`/api/sellers/${s.id}`, {
      method: 'PUT',
      body: { active: !s.active }
    })
    toast.add({
      title: s.active ? 'Vendedor desativado' : 'Vendedor ativado',
      description: `"${s.name}" foi ${s.active ? 'desativado' : 'ativado'}.`,
      color: s.active ? 'neutral' : 'success',
      icon: s.active ? 'i-heroicons-eye-slash' : 'i-heroicons-check-circle'
    })
    await refresh()
  } catch (e: any) {
    const err = e
    toast.add({
      title: 'Erro',
      description:
        err?.data?.message ?? err?.data?.statusMessage ?? 'Tente novamente.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
const deleteTarget = ref<Seller | null>(null)
const loadingDelete = ref(false)
const isDeleteModalOpen = ref(false)

const confirmDelete = (s: Seller) => {
  deleteTarget.value = s
  isDeleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  loadingDelete.value = true
  const name = deleteTarget.value.name
  try {
    await $fetch(`/api/sellers/${deleteTarget.value.id}`, { method: 'DELETE' })
    isDeleteModalOpen.value = false
    toast.add({
      title: 'Vendedor excluído',
      description: `"${name}" foi removido.`,
      color: 'neutral',
      icon: 'i-heroicons-trash'
    })
    await refresh()
  } catch (e: any) {
    const err = e
    toast.add({
      title: 'Erro ao excluir',
      description:
        err?.data?.message
        ?? err?.data?.statusMessage
        ?? err?.message
        ?? 'Tente novamente.',
      color: 'error'
    })
  } finally {
    loadingDelete.value = false
    deleteTarget.value = null
  }
}

// ─────────────────────────────────────────────
// Row actions (Design System: Edit + Dropdown)
// ─────────────────────────────────────────────
const rowActionItems = (s: Seller) => [
  [
    {
      label: s.active ? 'Desativar' : 'Ativar',
      icon: s.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye',
      onSelect: () => toggleActive(s)
    }
  ],
  [
    {
      label: 'Excluir Vendedor',
      icon: 'i-heroicons-trash',
      color: 'error' as const,
      onSelect: () => confirmDelete(s)
    }
  ]
]

const STATUS_FILTER_OPTS = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'active' },
  { label: 'Inativos', value: 'inactive' }
]
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Vendedores
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie os vendedores e representantes da empresa
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Novo Vendedor
      </UButton>
    </div>

    <!-- ── KPI Strip (Design System compliant) ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <template v-if="loadingList">
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
              Vendedores
            </h3>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar nome, CPF, e-mail..."
              size="sm"
              class="w-full sm:w-48 lg:w-64"
            />
            <USelect
              v-model="activeFilter"
              :items="STATUS_FILTER_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-full sm:w-28"
            />
          </div>
        </div>
      </template>

      <!-- Loading skeleton -->
      <div
        v-if="loadingList"
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
        v-else-if="filteredSellers.length === 0"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <div class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
          <UIcon
            name="i-heroicons-user-group"
            class="w-8 h-8 text-zinc-300 dark:text-zinc-600"
          />
        </div>
        <p class="text-sm font-bold text-zinc-900 dark:text-white">
          {{ sellersList.length === 0 ? "Nenhum vendedor encontrado" : "Nenhum vendedor corresponde aos filtros" }}
        </p>
        <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">
          {{ sellersList.length === 0 ? "Crie o primeiro vendedor para começar" : "Tente outros termos de busca" }}
        </p>
        <UButton
          v-if="sellersList.length === 0"
          color="primary"
          icon="i-heroicons-plus"
          size="sm"
          class="mt-4"
          @click="openCreate"
        >
          Criar Primeiro Vendedor
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
                Vendedor
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden md:table-cell">
                CPF
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden lg:table-cell">
                Telefone
              </th>
              <th class="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                Comissão
              </th>
              <th class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                Status
              </th>
              <th class="px-6 py-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            <tr
              v-for="s in paginatedSellers"
              :key="s.id"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
              :class="{ 'opacity-60': !s.active }"
            >
              <!-- Name + avatar -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                    <span class="text-xs font-black text-primary-600 dark:text-primary-400">
                      {{ sellerInitials(s.name) }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-zinc-900 dark:text-white truncate max-w-35 sm:max-w-50 group-hover:text-primary-600 transition-colors">
                      {{ s.name }}
                    </p>
                    <p
                      v-if="s.email"
                      class="text-xs text-zinc-400 truncate max-w-35 sm:max-w-50"
                    >
                      {{ s.email }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- CPF -->
              <td class="px-4 py-4 text-xs text-zinc-500 font-mono whitespace-nowrap hidden md:table-cell">
                {{ s.document ? formatCpf(s.document) : "—" }}
              </td>

              <!-- Phone -->
              <td class="px-4 py-4 hidden lg:table-cell">
                <div
                  v-if="s.phone"
                  class="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300"
                >
                  <UIcon
                    name="i-heroicons-phone"
                    class="w-3.5 h-3.5 text-zinc-400 shrink-0"
                  />
                  {{ formatPhone(s.phone) }}
                </div>
                <span
                  v-else
                  class="text-xs text-zinc-300 dark:text-zinc-700"
                >
                  —
                </span>
              </td>

              <!-- Commission -->
              <td class="px-4 py-4 text-center">
                <span
                  :class="[
                    'inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full',
                    s.commissionRate > 0
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  ]"
                >
                  <UIcon
                    name="i-heroicons-percent-badge"
                    class="w-3.5 h-3.5"
                  />
                  {{ s.commissionRate.toFixed(1) }}%
                </span>
              </td>

              <!-- Status -->
              <td class="px-4 py-4">
                <UBadge
                  :color="s.active ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5 cursor-pointer transition-opacity hover:opacity-70"
                  @click="toggleActive(s)"
                >
                  {{ s.active ? "Ativo" : "Inativo" }}
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
                    @click="openEdit(s)"
                  />
                  <UDropdownMenu :items="rowActionItems(s)">
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
            {{ filteredSellers.length }} vendedores · página {{ page }} de {{ totalPages }}
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
    <USlideover
      v-model:open="isDrawerOpen"
      :title="isEditing ? 'Editar Vendedor' : 'Novo Vendedor'"
      side="right"
      :ui="{ footer: 'p-0 block' }"
    >
      <template #body>
        <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24">
          <!-- ── Identificação ── -->
          <div class="rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 p-6 border border-zinc-200/50 dark:border-zinc-700/30 space-y-5">
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Identificação
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <UFormField
                label="Nome Completo"
                required
                :error="formErrors.name"
                class="col-span-full"
              >
                <UInput
                  v-model="form.name"
                  placeholder="ex: João da Silva"
                  icon="i-heroicons-user"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="CPF"
                :error="formErrors.document"
              >
                <UInput
                  v-model="form.document"
                  placeholder="000.000.000-00"
                  icon="i-heroicons-identification"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Telefone"
                :error="formErrors.phone"
              >
                <UInput
                  v-model="form.phone"
                  placeholder="(00) 00000-0000"
                  icon="i-heroicons-phone"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="E-mail"
                :error="formErrors.email"
                class="col-span-full"
              >
                <UInput
                  v-model="form.email"
                  type="email"
                  placeholder="vendedor@email.com"
                  icon="i-heroicons-envelope"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <!-- ── Comissão ── -->
          <div class="rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 p-6 border border-zinc-200/50 dark:border-zinc-700/30 space-y-5">
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Comissão
            </h4>
            <UFormField
              label="Taxa de Comissão (%)"
              hint="Percentual sobre o valor total das vendas"
              required
              :error="formErrors.commissionRate"
            >
              <UInput
                v-model.number="form.commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="ex: 3.5"
                icon="i-heroicons-percent-badge"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <div
              v-if="form.commissionRate > 0"
              class="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/20"
            >
              <UIcon
                name="i-heroicons-information-circle"
                class="w-5 h-5 text-amber-500 shrink-0"
              />
              <p class="text-xs text-amber-700 dark:text-amber-300 font-bold">
                A cada R$ 1.000,00 em vendas, este vendedor receberá
                <span class="font-black">R$ {{ (form.commissionRate * 10).toFixed(2) }}</span>
                de comissão.
              </p>
            </div>
          </div>

          <!-- ── Status ── -->
          <div class="rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 p-6 border border-zinc-200/50 dark:border-zinc-700/30 space-y-5">
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Configurações
            </h4>
            <div class="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-700">
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  Vendedor Ativo
                </p>
                <p class="text-xs text-zinc-400 mt-0.5">
                  Vendedores inativos não aparecem nas seleções de novas vendas e orçamentos
                </p>
              </div>
              <USwitch
                v-model="form.active"
                size="md"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center gap-4 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <UButton
            color="neutral"
            variant="ghost"
            class="flex-1 h-12 rounded-2xl font-bold"
            @click="isDrawerOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="primary"
            class="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-primary-500/20"
            :loading="loadingSave"
            icon="i-heroicons-check"
            @click="handleSave"
          >
            {{ isEditing ? "Salvar Alterações" : "Cadastrar" }}
          </UButton>
        </div>
      </template>
    </USlideover>

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm (Design System compliant)
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Excluir Vendedor"
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
            <div class="flex-1 min-w-0">
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar exclusão
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja excluir
                <span class="font-bold text-zinc-700 dark:text-zinc-300">"{{ deleteTarget?.name }}"</span>?
                O histórico de vendas associado será mantido, mas o vínculo com este vendedor será removido.
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
                <span class="text-xs font-black text-primary-600 dark:text-primary-400">
                  {{ sellerInitials(deleteTarget.name) }}
                </span>
              </div>
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  {{ deleteTarget.name }}
                </p>
                <p class="text-xs text-zinc-400">
                  {{ deleteTarget.commissionRate.toFixed(1) }}% comissão
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
