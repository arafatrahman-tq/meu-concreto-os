<script setup lang="ts">
definePageMeta({ layout: "default" });
useSeoMeta({ title: "Empresas | Meu Concreto" });

const { user } = useAuth();
const toast = useToast();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Company {
  id: number;
  name: string;
  document: string; // CNPJ — stored without mask
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  active: boolean;
  createdAt: string | number;
  updatedAt: string | number;
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: companiesData,
  refresh: refreshCompanies,
  pending: loadingCompanies,
} = await useFetch("/api/companies");

const companies = computed<Company[]>(
  () => (companiesData.value as { companies?: Company[] })?.companies ?? [],
);

// ─────────────────────────────────────────────
// Summary stats
// ─────────────────────────────────────────────
const stats = computed(() => {
  const all = companies.value;
  const now = new Date();
  const thisMonth = all.filter((c) => {
    const d = new Date(c.createdAt as string | number);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });
  return {
    total: all.length,
    active: all.filter((c) => c.active).length,
    inactive: all.filter((c) => !c.active).length,
    thisMonth: thisMonth.length,
  };
});

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref("");
const activeFilter = ref<"all" | "active" | "inactive">("all");

const filteredCompanies = computed(() => {
  return companies.value.filter((c) => {
    const matchActive =
      activeFilter.value === "all" ||
      (activeFilter.value === "active" && c.active) ||
      (activeFilter.value === "inactive" && !c.active);
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.document.includes(q.replace(/\D/g, "")) ||
      (c.city ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q);
    return matchActive && matchSearch;
  });
});

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1);
const pageSize = ref(10);

const paginatedCompanies = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredCompanies.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredCompanies.value.length / pageSize.value),
);

watch([search, activeFilter], () => {
  page.value = 1;
});

// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────
const formatCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

const _formatZip = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
};

const formatDate = (v: string | number | null | undefined) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(v as string | number),
  );
};

// ─────────────────────────────────────────────
// Drawer State
// ─────────────────────────────────────────────
const isDrawerOpen = ref(false);
const editingCompany = ref<Company | null>(null);

const openCreate = () => {
  editingCompany.value = null;
  isDrawerOpen.value = true;
};

const openEdit = (c: Company) => {
  editingCompany.value = c;
  isDrawerOpen.value = true;
};

// ─────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────
const toggleActive = async (c: Company) => {
  try {
    await $fetch(`/api/companies/${c.id}`, {
      method: "PUT",
      body: { active: !c.active },
    });
    toast.add({
      title: c.active ? "Empresa desativada" : "Empresa ativada",
      description: `"${c.name}" foi ${c.active ? "desativada" : "ativada"}.`,
      color: c.active ? "neutral" : "success",
      icon: c.active ? "i-heroicons-eye-slash" : "i-heroicons-check-circle",
    });
    await refreshCompanies();
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; statusMessage?: string } };
    toast.add({
      title: "Erro",
      description:
        err?.data?.message ?? err?.data?.message ?? err?.data?.statusMessage ?? "Tente novamente.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  }
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
const deleteTarget = ref<Company | null>(null);
const loadingDelete = ref(false);
const isDeleteModalOpen = ref(false);
const deleteError = ref("");

const confirmDelete = (c: Company) => {
  deleteTarget.value = c;
  deleteError.value = "";
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  loadingDelete.value = true;
  deleteError.value = "";
  const name = deleteTarget.value.name;
  try {
    await $fetch(`/api/companies/${deleteTarget.value.id}`, {
      method: "DELETE",
    });
    isDeleteModalOpen.value = false;
    toast.add({
      title: "Empresa excluída",
      description: `"${name}" foi removida do sistema.`,
      color: "neutral",
      icon: "i-heroicons-trash",
    });
    await refreshCompanies();
  } catch (e: unknown) {
    const err = e as {
      statusCode?: number;
      data?: { message?: string; statusMessage?: string };
      message?: string;
    };
    if (err?.statusCode === 409) {
      deleteError.value =
        "Não é possível excluir: esta empresa possui usuários vinculados. Remova os usuários primeiro.";
    } else {
      deleteError.value =
        err?.data?.message ??
        err?.data?.message ?? err?.data?.statusMessage ??
        err?.message ??
        "Erro ao excluir.";
    }
  } finally {
    loadingDelete.value = false;
  }
};

// ─────────────────────────────────────────────
// Row actions
// ─────────────────────────────────────────────
const _rowActions = (c: Company) => {
  const isAdmin = user.value?.role === "admin";

  return [
    [
      {
        label: "Editar Empresa",
        icon: "i-heroicons-pencil-square",
        onSelect: () => openEdit(c),
      },
      {
        label: c.active ? "Desativar" : "Ativar",
        icon: c.active ? "i-heroicons-eye-slash" : "i-heroicons-eye",
        onSelect: () => toggleActive(c),
      },
    ],
    ...(isAdmin
      ? [
          [
            {
              label: "Excluir",
              icon: "i-heroicons-trash",
              color: "error" as const,
              onSelect: () => confirmDelete(c),
            },
          ],
        ]
      : []),
  ];
};

const ACTIVE_OPTS = [
  { label: "Todas", value: "all" },
  { label: "Ativas", value: "active" },
  { label: "Inativas", value: "inactive" },
];
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

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        v-for="(kpi, i) in [
          {
            label: 'Total de Empresas',
            value: stats.total,
            suffix: 'cadastradas',
            icon: 'i-heroicons-building-office-2',
            color: 'text-primary-500',
            bg: 'bg-primary-50 dark:bg-primary-500/10',
          },
          {
            label: 'Empresas Ativas',
            value: stats.active,
            suffix: 'em operação',
            icon: 'i-heroicons-check-circle',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
          {
            label: 'Empresas Inativas',
            value: stats.inactive,
            suffix: 'desativadas',
            icon: 'i-heroicons-eye-slash',
            color: 'text-zinc-400',
            bg: 'bg-zinc-100 dark:bg-zinc-800',
          },
          {
            label: 'Cadastradas no Mês',
            value: stats.thisMonth,
            suffix: 'este mês',
            icon: 'i-heroicons-calendar-days',
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
          },
        ]"
        :key="i"
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight"
          >
            {{ kpi.label }}
          </span>
          <div
            :class="[
              kpi.bg,
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            ]"
          >
            <UIcon :name="kpi.icon" :class="['w-5 h-5', kpi.color]" />
          </div>
        </div>
        <p
          class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums"
        >
          {{ kpi.value }}
        </p>
        <p v-if="kpi.suffix" class="text-xs text-zinc-400 font-medium -mt-2">
          {{ kpi.suffix }}
        </p>
      </div>
    </div>

    <!-- ── Table Card ── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h3
            class="text-sm font-black uppercase tracking-widest text-zinc-400 shrink-0"
          >
            Lista de Empresas
          </h3>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar nome, CNPJ, cidade..."
              size="sm"
              class="w-52 lg:w-64"
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
      <div v-if="loadingCompanies" class="space-y-3 py-2">
        <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredCompanies.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon name="i-heroicons-building-office-2" class="w-12 h-12 mb-3" />
        <p class="text-sm font-bold">Nenhuma empresa encontrada</p>
        <p class="text-xs mt-1">
          Ajuste os filtros ou cadastre uma nova empresa
        </p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800">
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Empresa
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
              >
                CNPJ
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Localização
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell"
              >
                Contato
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell"
              >
                Cadastro
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
              v-for="c in paginatedCompanies"
              :key="c.id"
              class="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors group relative"
              :class="{ 'opacity-60': !c.active }"
            >
              <!-- Name + initials avatar -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
                  >
                    <span
                      class="text-sm font-black text-primary-600 dark:text-primary-400"
                    >
                      {{ c.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <p
                      class="font-bold text-zinc-900 dark:text-white truncate max-w-36 sm:max-w-52"
                    >
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
              <td
                class="px-4 py-3.5 text-xs text-zinc-500 font-mono whitespace-nowrap hidden md:table-cell"
              >
                {{ formatCnpj(c.document) }}
              </td>

              <!-- Location -->
              <td class="px-4 py-3.5 hidden lg:table-cell">
                <div v-if="c.city || c.state" class="flex items-center gap-1.5">
                  <UIcon
                    name="i-heroicons-map-pin"
                    class="w-3.5 h-3.5 text-zinc-400 shrink-0"
                  />
                  <span class="text-sm text-zinc-600 dark:text-zinc-300">
                    {{ [c.city, c.state].filter(Boolean).join(" / ") }}
                  </span>
                </div>
                <span v-else class="text-xs text-zinc-300 dark:text-zinc-700"
                  >—</span
                >
              </td>

              <!-- Contact -->
              <td class="px-4 py-3.5 hidden xl:table-cell">
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
                <span v-else class="text-xs text-zinc-300 dark:text-zinc-700"
                  >—</span
                >
              </td>

              <!-- Created at -->
              <td
                class="px-4 py-3.5 text-xs text-zinc-400 whitespace-nowrap hidden sm:table-cell"
              >
                {{ formatDate(c.createdAt) }}
              </td>

              <!-- Status -->
              <td class="px-4 py-3.5">
                <button class="group/toggle" @click="toggleActive(c)">
                  <UBadge
                    :color="c.active ? 'success' : 'neutral'"
                    variant="soft"
                    size="sm"
                    :icon="
                      c.active
                        ? 'i-heroicons-check-circle'
                        : 'i-heroicons-eye-slash'
                    "
                    class="cursor-pointer transition-opacity group-hover/toggle:opacity-70"
                  >
                    {{ c.active ? "Ativa" : "Inativa" }}
                  </UBadge>
                </button>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5 text-right">
                <div
                  class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <UTooltip :text="c.active ? 'Desativar' : 'Ativar'">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      :icon="
                        c.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                      "
                      size="xs"
                      @click="toggleActive(c)"
                    />
                  </UTooltip>
                  <UTooltip text="Editar Empresa">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="xs"
                      @click="openEdit(c)"
                    />
                  </UTooltip>
                  <UTooltip v-if="user?.role === 'admin'" text="Excluir">
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="xs"
                      @click="confirmDelete(c)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <template v-if="filteredCompanies.length > pageSize" #footer>
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1"
        >
          <p class="text-xs text-zinc-400">
            {{ filteredCompanies.length }} empresas · página {{ page }} de
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

    <!-- ── Drawer ── -->
    <CompaniesCompanyDrawer
      v-model:open="isDrawerOpen"
      :company="editingCompany"
      @saved="refreshCompanies"
    />

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm
    ══════════════════════════════════════════ -->
    <UModal v-model:open="isDeleteModalOpen" title="Excluir Empresa">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar exclusão
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja excluir a empresa
                <strong class="text-zinc-700 dark:text-zinc-300">
                  "{{ deleteTarget?.name }}"
                </strong>
                ? Esta ação não pode ser desfeita e todos os dados associados
                serão perdidos.
              </p>

              <!-- Conflict error shown inline in modal -->
              <UAlert
                v-if="deleteError"
                class="mt-3"
                color="error"
                variant="soft"
                icon="i-heroicons-exclamation-triangle"
                :description="deleteError"
              />
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isDeleteModalOpen = false"
            >
              Cancelar
            </UButton>
            <UButton
              color="error"
              :loading="loadingDelete"
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

