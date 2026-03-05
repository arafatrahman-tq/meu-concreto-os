<script setup lang="ts">
import type { User, UserRole } from "~/types/users";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Usuários | Meu Concreto" });

// ─── Auth ────────────────────────────────────────────────────────────────────
const { user: authUser, companies: authCompanies, companyId } = useAuth();
const toast = useToast();

// ─── Fetch ───────────────────────────────────────────────────────────────────
const {
  data: usersData,
  pending,
  refresh,
} = await useFetch<{ users: User[] }>("/api/users", { query: { companyId } });

const usersList = computed(() => usersData.value?.users ?? []);

// All companies for the add-company combobox (only fetched for global admins)
const { data: allCompaniesData } = await useFetch("/api/companies", {
  immediate: authUser.value?.role === "admin",
});
const allCompaniesList = computed(() => {
  if (authUser.value?.role === "admin") {
    return (allCompaniesData.value as any)?.companies ?? [];
  }
  return authCompanies.value ?? [];
});

// ─── KPIs ────────────────────────────────────────────────────────────────────
const totalUsers = computed(() => usersList.value.length);
const activeUsers = computed(
  () => usersList.value.filter((u) => u.active).length,
);
const adminUsers = computed(
  () => usersList.value.filter((u) => u.role === "admin").length,
);
const managerUsers = computed(
  () => usersList.value.filter((u) => u.role === "manager").length,
);

// ─── Filter / search ─────────────────────────────────────────────────────────
const search = ref("");
const roleFilter = ref<UserRole | "all">("all");

const filteredUsers = computed(() => {
  let list = usersList.value;
  if (roleFilter.value !== "all") {
    list = list.filter((u) => u.role === roleFilter.value);
  }
  const q = search.value.toLowerCase().trim();
  if (!q) return list;
  return list.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.document ?? "").includes(q),
  );
});

// ─── Pagination ──────────────────────────────────────────────────────────────
const page = ref(1);
const pageSize = ref(10);

const totalPages = computed(() =>
  Math.ceil(filteredUsers.value.length / pageSize.value),
);

const paginatedUsers = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredUsers.value.slice(start, end);
});

// ─── Role helpers ─────────────────────────────────────────────────────────────
function roleConfig(role: string) {
  if (role === "admin") {
    return {
      label: "Administrador",
      color: "error" as const,
      icon: "i-heroicons-shield-check",
    };
  }
  if (role === "manager") {
    return {
      label: "Gerente",
      color: "warning" as const,
      icon: "i-heroicons-briefcase",
    };
  }
  return {
    label: "Usuário",
    color: "neutral" as const,
    icon: "i-heroicons-user",
  };
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return (first + last).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── Drawer state ─────────────────────────────────────────────────────────────
const isDrawerOpen = ref(false);
const isEditMode = ref(false);
const editingId = ref<number | null>(null);
const selectedUser = ref<User | null>(null);

function openCreate() {
  isEditMode.value = false;
  editingId.value = null;
  selectedUser.value = null;
  isDrawerOpen.value = true;
}

function openEdit(u: User) {
  isEditMode.value = true;
  editingId.value = u.id;
  selectedUser.value = { ...u };
  isDrawerOpen.value = true;
}

// ─── Toggle active ────────────────────────────────────────────────────────────
async function toggleActive(u: User) {
  if (u.id === authUser.value?.id) {
    toast.add({
      title: "Ação não permitida",
      description: "Você não pode desativar seu próprio usuário.",
      color: "error",
    });
    return;
  }
  try {
    await $fetch(`/api/users/${u.id}`, {
      method: "PUT",
      body: { active: !u.active },
    });
    const label = u.active ? "desativado" : "ativado";
    toast.add({
      title: `Usuário ${label}`,
      description: `${u.name} foi ${label} com sucesso.`,
      color: u.active ? "warning" : "success",
    });
    await refresh();
  } catch {
    toast.add({
      title: "Erro",
      description: "Não foi possível alterar o status.",
      color: "error",
    });
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const userToDelete = ref<User | null>(null);

function confirmDelete(u: User) {
  if (u.id === authUser.value?.id) {
    toast.add({
      title: "Ação não permitida",
      description: "Você não pode excluir seu próprio usuário.",
      color: "error",
    });
    return;
  }
  userToDelete.value = u;
  isDeleteModalOpen.value = true;
}

async function handleDelete() {
  if (!userToDelete.value) return;
  isDeleting.value = true;
  try {
    await $fetch(`/api/users/${userToDelete.value.id}`, { method: "DELETE" });
    toast.add({
      title: "Usuário excluído",
      description: `${userToDelete.value.name} foi removido.`,
      color: "success",
    });
    isDeleteModalOpen.value = false;
    userToDelete.value = null;
    await refresh();
  } catch (e: any) {
    toast.add({
      title: "Erro ao excluir",
      description: e.data?.message ?? "Não foi possível excluir o usuário.",
      color: "error",
    });
  } finally {
    isDeleting.value = false;
  }
}

// ─── Dropdown actions ─────────────────────────────────────────────────────────
function _rowActions(u: User) {
  const isAdmin = authUser.value?.role === "admin";
  const isSelf = authUser.value?.id === u.id;

  return [
    [
      {
        label: "Editar",
        icon: "i-heroicons-pencil-square",
        onSelect: () => openEdit(u),
      },
      {
        label: u.active ? "Desativar" : "Ativar",
        icon: u.active ? "i-heroicons-eye-slash" : "i-heroicons-eye",
        onSelect: () => toggleActive(u),
      },
    ],
    ...(isAdmin && !isSelf
      ? [
          [
            {
              label: "Excluir",
              icon: "i-heroicons-trash",
              color: "error" as const,
              onSelect: () => confirmDelete(u),
            },
          ],
        ]
      : []),
  ];
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

    <!-- KPI Strip -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        v-for="kpi in [
          {
            label: 'Total de Usuários',
            value: totalUsers,
            suffix: 'usuários cadastrados',
            icon: 'i-heroicons-users',
            color: 'text-primary-500',
            bg: 'bg-primary-50 dark:bg-primary-500/10',
          },
          {
            label: 'Usuários Ativos',
            value: activeUsers,
            suffix: 'com acesso ao sistema',
            icon: 'i-heroicons-check-circle',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
          {
            label: 'Administradores',
            value: adminUsers,
            suffix: 'perfil admin',
            icon: 'i-heroicons-shield-check',
            color: 'text-red-500',
            bg: 'bg-red-50 dark:bg-red-500/10',
          },
          {
            label: 'Gerentes',
            value: managerUsers,
            suffix: 'perfil gerente',
            icon: 'i-heroicons-briefcase',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
          },
        ]"
        :key="kpi.label"
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
            >{{ kpi.label }}</span
          >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="kpi.bg"
          >
            <UIcon :name="kpi.icon" class="w-5 h-5" :class="kpi.color" />
          </div>
        </div>
        <p
          class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums"
        >
          {{ kpi.value }}
        </p>
        <p class="text-xs text-zinc-400 font-medium -mt-2">
          {{ kpi.suffix }}
        </p>
      </div>
    </div>

    <!-- Table Card -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
            >
              <UIcon
                name="i-heroicons-users"
                class="h-5 w-5 text-primary-500"
              />
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-widest text-zinc-400"
              >
                Lista de Usuários
              </h3>
              <p class="mt-0.5 text-xs text-zinc-400">
                Controle de acessos e permissões
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-end">
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
                { label: 'Todos Perfis', value: 'all' },
                { label: 'Admins', value: 'admin' },
                { label: 'Gerentes', value: 'manager' },
                { label: 'Usuários', value: 'user' },
              ]"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-40"
            />
          </div>
        </div>
      </template>

      <!-- Loading skeleton -->
      <div v-if="pending" class="space-y-3 py-2">
        <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredUsers.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon name="i-heroicons-users" class="w-12 h-12 mb-3" />
        <p class="text-sm font-bold">Nenhum usuário encontrado</p>
        <p class="text-xs mt-1">
          Tente ajustar o filtro ou cadastre um novo usuário
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
                Usuário
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell"
              >
                Perfil
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Documento
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
              >
                WhatsApp
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
              v-for="u in paginatedUsers"
              :key="u.id"
              class="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors group relative"
              :class="{ 'opacity-50': !u.active }"
            >
              <!-- User Info -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs text-white"
                    :class="
                      u.id === authUser?.id
                        ? 'bg-primary-500'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    "
                  >
                    {{ userInitials(u.name) }}
                  </div>
                  <div class="min-w-0">
                    <p
                      class="font-bold text-zinc-900 dark:text-white truncate max-w-40 sm:max-w-56"
                    >
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
                    <p
                      class="text-xs text-zinc-400 truncate max-w-40 sm:max-w-56"
                    >
                      {{ u.email }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Profile -->
              <td class="px-4 py-3.5 hidden sm:table-cell">
                <UBadge
                  v-bind="roleConfig(u.role)"
                  variant="soft"
                  size="sm"
                  class="gap-1.5"
                >
                  <template #leading v-if="roleConfig(u.role).icon">
                    <UIcon
                      :name="roleConfig(u.role).icon"
                      class="w-3.5 h-3.5"
                    />
                  </template>
                  {{ roleConfig(u.role).label }}
                </UBadge>
              </td>

              <!-- Document -->
              <td
                class="px-4 py-3.5 text-xs text-zinc-400 font-mono hidden lg:table-cell"
              >
                {{ u.document ? maskDocument(u.document) : "—" }}
              </td>

              <!-- WhatsApp -->
              <td
                class="px-4 py-3.5 text-xs text-zinc-400 hidden md:table-cell"
              >
                {{ u.phone ? formatPhone(u.phone) : "—" }}
              </td>

              <!-- Status -->
              <td class="px-4 py-3.5">
                <template v-if="u.id !== authUser?.id">
                  <button
                    class="group/toggle"
                    title="Clique para alternar"
                    @click="toggleActive(u)"
                  >
                    <UBadge
                      :color="u.active ? 'success' : 'neutral'"
                      variant="soft"
                      size="sm"
                      :icon="
                        u.active
                          ? 'i-heroicons-check-circle'
                          : 'i-heroicons-eye-slash'
                      "
                      class="cursor-pointer transition-opacity group-hover/toggle:opacity-70"
                    >
                      {{ u.active ? "Ativo" : "Inativo" }}
                    </UBadge>
                  </button>
                </template>
                <template v-else>
                  <UBadge
                    color="success"
                    variant="soft"
                    size="sm"
                    icon="i-heroicons-check-circle"
                  >
                    Ativo
                  </UBadge>
                </template>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5 text-right">
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

      <!-- Footer / Pagination -->
      <template #footer v-if="totalPages > 1">
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1"
        >
          <p class="text-xs text-zinc-400">
            {{ filteredUsers.length }} usuários · página {{ page }} de
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
    <UModal v-model:open="isDeleteModalOpen" :dismissible="!isDeleting">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon name="i-heroicons-trash" class="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 class="font-black text-zinc-900 dark:text-white">
                Excluir usuário
              </h3>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja excluir
                <span class="font-bold text-zinc-700 dark:text-zinc-300">{{
                  userToDelete?.name
                }}</span
                >? Esta ação não pode ser desfeita.
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
