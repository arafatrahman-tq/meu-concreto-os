<script setup lang="ts">
import type { User, UserRole } from '~/types/users'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Usuários | Meu Concreto' })

// ─── Auth ────────────────────────────────────────────────────────────────────
const { user: authUser, companies: authCompanies, companyId } = useAuth()
const toast = useToast()

// ─── Fetch ───────────────────────────────────────────────────────────────────
const {
  data: usersData,
  pending,
  refresh
} = await useFetch<{ users: User[] }>('/api/users', { query: { companyId } })

const usersList = computed(() => usersData.value?.users ?? [])

// All companies for the add-company combobox (only fetched for global admins)
const { data: allCompaniesData } = await useFetch('/api/companies', {
  immediate: authUser.value?.role === 'admin'
})
const allCompaniesList = computed(() => {
  if (authUser.value?.role === 'admin') {
    return (allCompaniesData.value as any)?.companies ?? []
  }
  return authCompanies.value ?? []
})

// ─── KPIs ────────────────────────────────────────────────────────────────────
const totalUsers = computed(() => usersList.value.length)
const activeUsers = computed(
  () => usersList.value.filter(u => u.active).length
)
const adminUsers = computed(
  () => usersList.value.filter(u => u.role === 'admin').length
)
const managerUsers = computed(
  () => usersList.value.filter(u => u.role === 'manager').length
)

const kpiItems = computed(() => [
  {
    label: 'Total de Usuários',
    value: totalUsers.value,
    suffix: 'usuários cadastrados',
    icon: 'i-heroicons-users',
    color: 'text-primary-500',
    bg: 'bg-primary-50 dark:bg-primary-500/10'
  },
  {
    label: 'Usuários Ativos',
    value: activeUsers.value,
    suffix: 'com acesso ao sistema',
    icon: 'i-heroicons-check-circle',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-500/10'
  },
  {
    label: 'Administradores',
    value: adminUsers.value,
    suffix: 'perfil admin',
    icon: 'i-heroicons-shield-check',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-500/10'
  },
  {
    label: 'Gerentes',
    value: managerUsers.value,
    suffix: 'perfil gerente',
    icon: 'i-heroicons-briefcase',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10'
  }
])

// ─── Filter / search ─────────────────────────────────────────────────────────
const search = ref('')
const roleFilter = ref<UserRole | 'all'>('all')

const filteredUsers = computed(() => {
  let list = usersList.value
  if (roleFilter.value !== 'all') {
    list = list.filter(u => u.role === roleFilter.value)
  }
  const q = search.value.toLowerCase().trim()
  if (!q) return list
  return list.filter(
    u =>
      u.name.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.document ?? '').includes(q)
  )
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const page = ref(1)
const pageSize = ref(12)

const totalPages = computed(() =>
  Math.ceil(filteredUsers.value.length / pageSize.value)
)

const paginatedUsers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredUsers.value.slice(start, end)
})

watch([search, roleFilter], () => {
  page.value = 1
})

// ─── Role helpers ─────────────────────────────────────────────────────────────
function roleConfig(role: string) {
  if (role === 'admin') {
    return {
      label: 'Administrador',
      color: 'error' as const,
      icon: 'i-heroicons-shield-check'
    }
  }
  if (role === 'manager') {
    return {
      label: 'Gerente',
      color: 'warning' as const,
      icon: 'i-heroicons-briefcase'
    }
  }
  return {
    label: 'Usuário',
    color: 'neutral' as const,
    icon: 'i-heroicons-user'
  }
}

// Avatar colors for visual variety
const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-orange-500'
]

function avatarColor(name: string) {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? ''
    const last = parts[parts.length - 1]?.[0] ?? ''
    return (first + last).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// ─── Drawer state ─────────────────────────────────────────────────────────────
const isDrawerOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<number | null>(null)
const selectedUser = ref<User | null>(null)

function openCreate() {
  isEditMode.value = false
  editingId.value = null
  selectedUser.value = null
  isDrawerOpen.value = true
}

function openEdit(u: User) {
  isEditMode.value = true
  editingId.value = u.id
  selectedUser.value = { ...u }
  isDrawerOpen.value = true
}

// ─── Toggle active ────────────────────────────────────────────────────────────
async function toggleActive(u: User) {
  if (u.id === authUser.value?.id) {
    toast.add({
      title: 'Ação não permitida',
      description: 'Você não pode desativar seu próprio usuário.',
      color: 'error'
    })
    return
  }
  try {
    await $fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      body: { active: !u.active }
    })
    const label = u.active ? 'desativado' : 'ativado'
    toast.add({
      title: `Usuário ${label}`,
      description: `${u.name} foi ${label} com sucesso.`,
      color: u.active ? 'warning' : 'success'
    })
    await refresh()
  } catch {
    toast.add({
      title: 'Erro',
      description: 'Não foi possível alterar o status.',
      color: 'error'
    })
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)
const userToDelete = ref<User | null>(null)

function confirmDelete(u: User) {
  if (u.id === authUser.value?.id) {
    toast.add({
      title: 'Ação não permitida',
      description: 'Você não pode excluir seu próprio usuário.',
      color: 'error'
    })
    return
  }
  userToDelete.value = u
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!userToDelete.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/users/${userToDelete.value.id}`, { method: 'DELETE' })
    toast.add({
      title: 'Usuário excluído',
      description: `${userToDelete.value.name} foi removido.`,
      color: 'success'
    })
    isDeleteModalOpen.value = false
    userToDelete.value = null
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Erro ao excluir',
      description: e.data?.message ?? 'Não foi possível excluir o usuário.',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Usuários
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie os usuários e permissões de acesso ao sistema
        </p>
      </div>
      <UButton
        v-if="authUser?.role === 'admin' || authUser?.role === 'manager'"
        color="primary"
        icon="i-heroicons-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Novo Usuário
      </UButton>
    </div>

    <!-- ── KPI Strip (consistente com TransactionKpis) ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <template v-if="pending">
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
              <UIcon :name="kpi.icon" :class="['w-6 h-6', kpi.color]" />
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

    <!-- ── Table Card (consistente com TransactionList) ── -->
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
              Lista de Usuários
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar..."
              size="sm"
              class="w-44 lg:w-56"
            />
            <USelect
              v-model="roleFilter"
              :items="[
                { label: 'Todos', value: 'all' },
                { label: 'Admins', value: 'admin' },
                { label: 'Gerentes', value: 'manager' },
                { label: 'Usuários', value: 'user' }
              ]"
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
        v-if="pending"
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
        v-else-if="filteredUsers.length === 0"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <div
          class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4"
        >
          <UIcon
            name="i-heroicons-users"
            class="w-8 h-8 text-zinc-300 dark:text-zinc-600"
          />
        </div>
        <p class="text-sm font-bold text-zinc-900 dark:text-white">
          {{
            usersList.length === 0
              ? "Nenhum usuário cadastrado"
              : "Nenhum usuário encontrado"
          }}
        </p>
        <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">
          {{
            usersList.length === 0
              ? "Cadastre usuários para acessarem o sistema"
              : "Tente ajustar os filtros de busca"
          }}
        </p>
        <UButton
          v-if="
            usersList.length === 0
              && (authUser?.role === 'admin' || authUser?.role === 'manager')
          "
          color="primary"
          icon="i-heroicons-plus"
          size="sm"
          class="mt-4"
          @click="openCreate"
        >
          Cadastrar Primeiro Usuário
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
              <th
                class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Usuário
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell"
              >
                Perfil
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Documento
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
              >
                WhatsApp
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
              v-for="u in paginatedUsers"
              :key="u.id"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
              :class="{ 'opacity-50': !u.active }"
            >
              <!-- User Info -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm text-white"
                    :class="
                      u.id === authUser?.id
                        ? 'bg-primary-500'
                        : avatarColor(u.name)
                    "
                  >
                    {{ userInitials(u.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors">
                      {{ u.name }}
                      <UBadge
                        v-if="u.id === authUser?.id"
                        color="primary"
                        variant="soft"
                        size="xs"
                        class="ml-1 rounded-md font-black uppercase text-[9px]"
                      >
                        você
                      </UBadge>
                    </p>
                    <p class="text-xs text-zinc-400 truncate max-w-48">
                      {{ u.email }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Profile -->
              <td class="px-4 py-4 hidden sm:table-cell">
                <UBadge
                  v-bind="roleConfig(u.role)"
                  variant="subtle"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
                >
                  <template
                    v-if="roleConfig(u.role).icon"
                    #leading
                  >
                    <UIcon
                      :name="roleConfig(u.role).icon"
                      class="w-3.5 h-3.5"
                    />
                  </template>
                  {{ roleConfig(u.role).label }}
                </UBadge>
              </td>

              <!-- Document -->
              <td class="px-4 py-4 text-xs text-zinc-400 font-mono hidden lg:table-cell">
                {{ u.document ? maskDocument(u.document) : "—" }}
              </td>

              <!-- WhatsApp -->
              <td class="px-4 py-4 text-xs text-zinc-400 hidden md:table-cell">
                {{ u.phone ? formatPhone(u.phone) : "—" }}
              </td>

              <!-- Status -->
              <td class="px-4 py-4">
                <template v-if="u.id !== authUser?.id">
                  <button
                    class="group/toggle"
                    @click="toggleActive(u)"
                  >
                    <UBadge
                      :color="u.active ? 'success' : 'neutral'"
                      variant="subtle"
                      size="sm"
                      class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5 cursor-pointer transition-opacity group-hover/toggle:opacity-70"
                    >
                      {{ u.active ? "Ativo" : "Inativo" }}
                    </UBadge>
                  </button>
                </template>
                <template v-else>
                  <UBadge
                    color="success"
                    variant="subtle"
                    size="sm"
                    class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
                  >
                    Ativo
                  </UBadge>
                </template>
              </td>

              <!-- Actions (consistente com TransactionList) -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1 transition-all">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="md"
                    class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    @click="openEdit(u)"
                  />
                  <UDropdownMenu
                    :items="[
                      [
                        {
                          label: u.active ? 'Desativar' : 'Ativar',
                          icon: u.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye',
                          onSelect: () => toggleActive(u)
                        }
                      ],
                      ...(authUser?.role === 'admin' && authUser?.id !== u.id
                        ? [
                          [
                            {
                              label: 'Excluir Usuário',
                              icon: 'i-heroicons-trash',
                              color: 'error' as const,
                              onSelect: () => confirmDelete(u)
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

      <!-- Footer / Pagination (consistente com TransactionList) -->
      <template
        v-if="totalPages > 1"
        #footer
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
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
              :disabled="page >= totalPages"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>

    <!-- ─── Slideover Drawer ─────────────────────────────────────────────── -->
    <UserDrawer
      v-model:open="isDrawerOpen"
      :edit-mode="isEditMode"
      :editing-id="editingId"
      :initial-data="selectedUser"
      :all-companies="allCompaniesList"
      :auth-user="authUser"
      :current-company-id="companyId"
      @saved="refresh"
    />

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Excluir Usuário"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir o usuário
            <span class="font-bold text-zinc-900 dark:text-white">
              "{{ userToDelete?.name }}" </span>?
          </p>
          <div
            v-if="userToDelete"
            class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm text-white"
                :class="avatarColor(userToDelete.name)"
              >
                {{ userInitials(userToDelete.name) }}
              </div>
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  {{ userToDelete.name }}
                </p>
                <p class="text-xs text-zinc-400">
                  {{ userToDelete.email }}
                </p>
              </div>
            </div>
            <UBadge
              v-bind="roleConfig(userToDelete.role)"
              variant="subtle"
              size="sm"
              class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
            >
              {{ roleConfig(userToDelete.role).label }}
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
            :disabled="isDeleting"
            @click="isDeleteModalOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            :loading="isDeleting"
            @click="handleDelete"
          >
            Excluir
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
