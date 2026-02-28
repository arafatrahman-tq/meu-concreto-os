<script setup lang="ts">
import type { User, UserRole } from '~/types/users'
import { USER_ROLE_OPTS } from '~/types/users'

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
const activeUsers = computed(() => usersList.value.filter(u => u.active).length)
const adminUsers = computed(() => usersList.value.filter(u => u.role === 'admin').length)
const managerUsers = computed(() => usersList.value.filter(u => u.role === 'manager').length)

// ─── Filter / search ─────────────────────────────────────────────────────────
const search = ref('')
const roleFilter = ref<UserRole | 'all'>('all')

const filteredUsers = computed(() => {
  let list = usersList.value
  if (roleFilter.value !== 'all')
    list = list.filter(u => u.role === roleFilter.value)
  const q = search.value.toLowerCase().trim()
  if (!q) return list
  return list.filter(
    u =>
      u.name.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.document ?? '').includes(q)
  )
})

// ─── Role helpers ─────────────────────────────────────────────────────────────
function roleColor(role: string) {
  if (role === 'admin') return 'error'
  if (role === 'manager') return 'warning'
  return 'neutral'
}

function roleLabel(role: string) {
  return USER_ROLE_OPTS.find(r => r.value === role)?.label ?? role
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

// ─── Dropdown actions ─────────────────────────────────────────────────────────
function _rowActions(u: User) {
  const isAdmin = authUser.value?.role === 'admin'
  const isSelf = authUser.value?.id === u.id

  return [
    [
      {
        label: 'Editar',
        icon: 'i-heroicons-pencil-square',
        onSelect: () => openEdit(u)
      },
      {
        label: u.active ? 'Desativar' : 'Ativar',
        icon: u.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye',
        onSelect: () => toggleActive(u)
      }
    ],
    ...(isAdmin && !isSelf
      ? [
          [
            {
              label: 'Excluir',
              icon: 'i-heroicons-trash',
              color: 'error' as const,
              onSelect: () => confirmDelete(u)
            }
          ]
        ]
      : [])
  ]
}
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- Page Header -->
    <div class="flex items-start justify-between flex-wrap gap-4">
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
        @click="openCreate"
      >
        Novo Usuário
      </UButton>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >Total</span>
          <div
            class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-users"
              class="w-5 h-5 text-primary-500"
            />
          </div>
        </div>
        <p class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums">{{
          totalUsers
        }}</p>
        <p class="text-xs text-zinc-400 font-medium -mt-2">
          usuários cadastrados
        </p>
      </div>

      <div
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >Ativos</span>
          <div
            class="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-check-circle"
              class="w-5 h-5 text-green-500"
            />
          </div>
        </div>
        <p class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums">{{
          activeUsers
        }}</p>
        <p class="text-xs text-zinc-400 font-medium -mt-2">
          com acesso ao sistema
        </p>
      </div>

      <div
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >Admins</span>
          <div
            class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-shield-check"
              class="w-5 h-5 text-red-500"
            />
          </div>
        </div>
        <p class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums">{{
          adminUsers
        }}</p>
        <p class="text-xs text-zinc-400 font-medium -mt-2">
          administradores
        </p>
      </div>

      <div
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >Gerentes</span>
          <div
            class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-briefcase"
              class="w-5 h-5 text-amber-500"
            />
          </div>
        </div>
        <p class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums">{{
          managerUsers
        }}</p>
        <p class="text-xs text-zinc-400 font-medium -mt-2">
          com perfil gerente
        </p>
      </div>
    </div>

    <!-- Table Card -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h3
            class="text-sm font-black uppercase tracking-widest text-zinc-400 shrink-0"
          >
            Usuários
          </h3>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <!-- Role filter -->
            <div
              class="flex items-center gap-1 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700 p-0.5 bg-white dark:bg-zinc-900"
            >
              <button
                v-for="opt in [
                  { value: 'all', label: 'Todos' },
                  { value: 'admin', label: 'Admins' },
                  { value: 'manager', label: 'Gerentes' },
                  { value: 'user', label: 'Usuários' }
                ]"
                :key="opt.value"
                class="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                :class="
                  roleFilter === opt.value
                    ? 'bg-primary-500 text-white shadow'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                "
                @click="roleFilter = opt.value as typeof roleFilter"
              >
                {{ opt.label }}
              </button>
            </div>
            <UInput
              v-model="search"
              size="sm"
              placeholder="Buscar usuário..."
              icon="i-heroicons-magnifying-glass"
              class="w-44 lg:w-56"
            />
          </div>
        </div>
      </template>

      <!-- Loading -->
      <div
        v-if="pending"
        class="space-y-3 p-4"
      >
        <USkeleton
          v-for="i in 5"
          :key="i"
          class="h-14 rounded-xl"
        />
      </div>

      <!-- Empty -->
      <div
        v-else-if="filteredUsers.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon
          name="i-heroicons-users"
          class="w-12 h-12 mb-3"
        />
        <p class="text-sm font-bold">
          Nenhum usuário encontrado
        </p>
        <p class="text-xs mt-1">
          Tente ajustar o filtro ou cadastre um novo usuário
        </p>
      </div>

      <!-- Table -->
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800">
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Usuário
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Perfil
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
              >
                CPF
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Telefone
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell"
              >
                Cadastro
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Status
              </th>
              <th class="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in filteredUsers"
              :key="u.id"
              class="border-b border-zinc-100 dark:border-zinc-800 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 group transition-colors"
            >
              <!-- Avatar + name + email -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-xs text-white"
                    :class="
                      u.id === authUser?.id
                        ? 'bg-primary-500'
                        : 'bg-zinc-300 dark:bg-zinc-600'
                    "
                  >
                    {{ userInitials(u.name) }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span
                        class="font-bold text-zinc-900 dark:text-white truncate"
                      >{{ u.name }}</span>
                      <UBadge
                        v-if="u.id === authUser?.id"
                        color="primary"
                        variant="soft"
                        size="xs"
                      >
                        você
                      </UBadge>
                    </div>
                    <span class="text-xs text-zinc-400 truncate block">{{
                      u.email
                    }}</span>
                  </div>
                </div>
              </td>

              <!-- Role -->
              <td class="py-3 px-4">
                <UBadge
                  :color="roleColor(u.role)"
                  variant="soft"
                  size="sm"
                >
                  {{ roleLabel(u.role) }}
                </UBadge>
              </td>

              <!-- CPF -->
              <td
                class="py-3 px-4 hidden md:table-cell text-zinc-600 dark:text-zinc-400 font-mono text-xs"
              >
                {{ u.document ? maskDocument(u.document) : "—" }}
              </td>

              <!-- Phone -->
              <td
                class="py-3 px-4 hidden lg:table-cell text-zinc-600 dark:text-zinc-400 text-xs"
              >
                {{ u.phone ? maskPhone(u.phone) : "—" }}
              </td>

              <!-- Created -->
              <td class="py-3 px-4 hidden xl:table-cell text-zinc-400 text-xs">
                {{ formatDate(u.createdAt) }}
              </td>

              <!-- Status -->
              <td class="py-3 px-4">
                <button
                  class="cursor-pointer"
                  @click="toggleActive(u)"
                >
                  <UBadge
                    :color="u.active ? 'success' : 'neutral'"
                    variant="soft"
                    size="sm"
                    :ui="{
                      label:
                        'text-[10px] font-black uppercase tracking-[0.15em]'
                    }"
                  >
                    {{ u.active ? "Ativo" : "Inativo" }}
                  </UBadge>
                </button>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div
                  class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <UTooltip :text="u.active ? 'Desativar' : 'Ativar'">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      :icon="
                        u.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                      "
                      size="xs"
                      @click="toggleActive(u)"
                    />
                  </UTooltip>
                  <UTooltip text="Editar Usuário">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="xs"
                      @click="openEdit(u)"
                    />
                  </UTooltip>
                  <UTooltip
                    v-if="authUser?.role === 'admin' && authUser?.id !== u.id"
                    text="Excluir"
                  >
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="xs"
                      @click="confirmDelete(u)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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

    <!-- ─── Delete Confirm Modal ─────────────────────────────────────────── -->
    <UModal
      v-model:open="isDeleteModalOpen"
      :dismissible="!isDeleting"
    >
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-trash"
                class="w-5 h-5 text-red-500"
              />
            </div>
            <div>
              <h3 class="font-black text-zinc-900 dark:text-white">
                Excluir usuário
              </h3>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja excluir
                <span class="font-bold text-zinc-700 dark:text-zinc-300">{{
                  userToDelete?.name
                }}</span>? Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
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
              :loading="isDeleting"
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

