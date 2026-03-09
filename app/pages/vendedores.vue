<script setup lang="ts">
definePageMeta({ layout: "default" });
useSeoMeta({ title: "Vendedores | Meu Concreto" });

const { companyId } = useAuth();
const toast = useToast();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Seller {
  id: number;
  companyId: number;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  commissionRate: number;
  active: boolean;
  createdAt: string | number;
  updatedAt: string | number;
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: sellersData,
  refresh,
  pending: loadingList,
} = await useFetch<{ sellers: Seller[] }>("/api/sellers", {
  query: { companyId },
});

const sellersList = computed<Seller[]>(() => sellersData.value?.sellers ?? []);

// ─────────────────────────────────────────────
// KPIs
// ─────────────────────────────────────────────
const stats = computed(() => {
  const list = sellersList.value;
  const avgCommission = list.length
    ? list.reduce((s, m) => s + m.commissionRate, 0) / list.length
    : 0;
  return {
    total: list.length,
    active: list.filter((s) => s.active).length,
    inactive: list.filter((s) => !s.active).length,
    avgCommission: Number(avgCommission.toFixed(2)),
  };
});

// ─────────────────────────────────────────────
// Formatters / masks
// ─────────────────────────────────────────────
const formatCpf = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return raw;
};

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11)
    return d.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2.$3-$4");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return raw;
};

const sellerInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (
      (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
    ).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// ─────────────────────────────────────────────
// Filter & Search
// ─────────────────────────────────────────────
const search = ref("");
const activeFilter = ref<"all" | "active" | "inactive">("all");

const filteredSellers = computed(() => {
  return sellersList.value.filter((s) => {
    const matchActive =
      activeFilter.value === "all" ||
      (activeFilter.value === "active" && s.active) ||
      (activeFilter.value === "inactive" && !s.active);
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.document ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
    return matchActive && matchSearch;
  });
});

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1);
const pageSize = ref(10);

const paginatedSellers = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredSellers.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredSellers.value.length / pageSize.value),
);

watch([search, activeFilter], () => {
  page.value = 1;
});

// ─────────────────────────────────────────────
// Drawer state
// ─────────────────────────────────────────────
const isDrawerOpen = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);
const loadingSave = ref(false);

// ─────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────
const form = reactive({
  name: "",
  document: "",
  email: "",
  phone: "",
  commissionRate: 0,
  active: true,
});

// 1. Estado de Erros
const formErrors = reactive<Record<string, string>>({});

// 2. Limpar Erros
const clearErrors = () => {
  for (const key in formErrors) {
    delete formErrors[key];
  }
};

// 3. Validação Universal
const validateForm = (): boolean => {
  clearErrors();
  let isValid = true;

  // Validação: Nome
  if (!form.name || form.name.trim().length < 3) {
    formErrors.name = "O nome deve ter pelo menos 3 caracteres.";
    isValid = false;
  }

  // Validação: Comissão
  if (form.commissionRate < 0 || form.commissionRate > 100) {
    formErrors.commissionRate = "A comissão deve estar entre 0% e 100%.";
    isValid = false;
  }

  // Validação opcional: E-mail (Se o usuário preencher, tem que ser válido)
  if (form.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      formErrors.email = "Insira um e-mail válido.";
      isValid = false;
    }
  }

  return isValid;
};

// Limpar erros ao fechar a gaveta
watch(isDrawerOpen, (isOpen) => {
  if (!isOpen) clearErrors();
});

// Input masks
watch(
  () => form.document,
  (val) => {
    const d = val.replace(/\D/g, "").slice(0, 11);
    let masked = d;
    if (d.length > 9)
      masked = d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
    else if (d.length > 6)
      masked = d.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
    else if (d.length > 3) masked = d.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    if (masked !== val) form.document = masked;
  },
);

watch(
  () => form.phone,
  (val) => {
    const d = val.replace(/\D/g, "").slice(0, 11);
    let masked = d;
    if (d.length > 7)
      masked = d.replace(/(\d{2})(\d{1})(\d{0,4})(\d{0,4})/, (_, a, b, c, e) =>
        e ? `(${a}) ${b}.${c}-${e}` : c ? `(${a}) ${b}.${c}` : `(${a}) ${b}`,
      );
    else if (d.length > 2) masked = d.replace(/(\d{2})(\d{0,})/, "($1) $2");
    if (masked !== val) form.phone = masked;
  },
);

const resetForm = () => {
  editingId.value = null;
  isEditing.value = false;
  form.name = "";
  form.document = "";
  form.email = "";
  form.phone = "";
  form.commissionRate = 0;
  form.active = true;
};

const openCreate = () => {
  resetForm();
  isDrawerOpen.value = true;
};

const openEdit = (s: Seller) => {
  resetForm();
  isEditing.value = true;
  editingId.value = s.id;
  form.name = s.name;
  form.document = s.document ? formatCpf(s.document) : "";
  form.email = s.email ?? "";
  form.phone = s.phone ? formatPhone(s.phone) : "";
  form.commissionRate = s.commissionRate;
  form.active = s.active;
  isDrawerOpen.value = true;
};

// ─────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────
const handleSave = async () => {
  if (!validateForm()) return;

  loadingSave.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      document: form.document.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      commissionRate: form.commissionRate,
      active: form.active,
    };

    if (isEditing.value && editingId.value) {
      await $fetch(`/api/sellers/${editingId.value}`, {
        method: "PUT",
        body: payload,
      });
      toast.add({
        title: "Vendedor atualizado",
        description: `"${form.name}" foi atualizado.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else {
      await $fetch("/api/sellers", {
        method: "POST",
        body: { companyId: companyId.value, ...payload },
      });
      toast.add({
        title: "Vendedor cadastrado",
        description: `"${form.name}" foi adicionado.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    }
    isDrawerOpen.value = false;
    await refresh();
  } catch (e: any) {
    const err = e;
    toast.add({
      title: "Erro ao salvar",
      description:
        err?.data?.message ??
        err?.data?.statusMessage ??
        err?.message ??
        "Erro ao salvar.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingSave.value = false;
  }
};

// ─────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────
const toggleActive = async (s: Seller) => {
  try {
    await $fetch(`/api/sellers/${s.id}`, {
      method: "PUT",
      body: { active: !s.active },
    });
    toast.add({
      title: s.active ? "Vendedor desativado" : "Vendedor ativado",
      description: `"${s.name}" foi ${s.active ? "desativado" : "ativado"}.`,
      color: s.active ? "neutral" : "success",
      icon: s.active ? "i-heroicons-eye-slash" : "i-heroicons-check-circle",
    });
    await refresh();
  } catch (e: any) {
    const err = e;
    toast.add({
      title: "Erro",
      description:
        err?.data?.message ?? err?.data?.statusMessage ?? "Tente novamente.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  }
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
const deleteTarget = ref<Seller | null>(null);
const loadingDelete = ref(false);
const isDeleteModalOpen = ref(false);

const confirmDelete = (s: Seller) => {
  deleteTarget.value = s;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  loadingDelete.value = true;
  const name = deleteTarget.value.name;
  try {
    await $fetch(`/api/sellers/${deleteTarget.value.id}`, { method: "DELETE" });
    isDeleteModalOpen.value = false;
    toast.add({
      title: "Vendedor excluído",
      description: `"${name}" foi removido.`,
      color: "neutral",
      icon: "i-heroicons-trash",
    });
    await refresh();
  } catch (e: any) {
    const err = e;
    toast.add({
      title: "Erro ao excluir",
      description:
        err?.data?.message ??
        err?.data?.statusMessage ??
        err?.message ??
        "Tente novamente.",
      color: "error",
    });
  } finally {
    loadingDelete.value = false;
    deleteTarget.value = null;
  }
};

// ─────────────────────────────────────────────
// Row actions
// ─────────────────────────────────────────────
const _rowActions = (s: Seller) => [
  [
    {
      label: "Editar",
      icon: "i-heroicons-pencil-square",
      onSelect: () => openEdit(s),
    },
    {
      label: s.active ? "Desativar" : "Ativar",
      icon: s.active ? "i-heroicons-eye-slash" : "i-heroicons-eye",
      onSelect: () => toggleActive(s),
    },
  ],
  [
    {
      label: "Excluir",
      icon: "i-heroicons-trash",
      color: "error" as const,
      onSelect: () => confirmDelete(s),
    },
  ],
];

const STATUS_FILTER_OPTS = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" },
];
</script>

<template>
  <div class="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
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

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        v-for="(kpi, i) in [
          {
            label: 'Total de Vendedores',
            value: stats.total,
            icon: 'i-heroicons-user-group',
            color: 'text-primary-500',
            bg: 'bg-primary-50 dark:bg-primary-500/10',
            suffix: 'cadastrados',
          },
          {
            label: 'Vendedores Ativos',
            value: stats.active,
            icon: 'i-heroicons-check-circle',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-500/10',
            suffix: 'disponíveis',
          },
          {
            label: 'Vendedores Inativos',
            value: stats.inactive,
            icon: 'i-heroicons-eye-slash',
            color: 'text-zinc-400',
            bg: 'bg-zinc-100 dark:bg-zinc-800',
            suffix: 'desativados',
          },
          {
            label: 'Comissão Média',
            value: `${stats.avgCommission}%`,
            icon: 'i-heroicons-percent-badge',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            suffix: 'sobre vendas',
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
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-user-group"
                class="w-5 h-5 text-primary-500"
              />
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-widest text-zinc-400"
              >
                Vendedores
              </h3>
              <p class="text-xs text-zinc-400 mt-0.5">
                Lista de funcionários e parceiros
              </p>
            </div>
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
      <div v-if="loadingList" class="space-y-3 py-2">
        <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredSellers.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon name="i-heroicons-user-group" class="w-12 h-12 mb-3" />
        <p class="text-sm font-bold">Nenhum vendedor encontrado</p>
        <p v-if="search || activeFilter !== 'all'" class="text-xs mt-1">
          Tente ajustar os filtros
        </p>
        <UButton
          v-else
          color="primary"
          variant="soft"
          size="sm"
          class="mt-4"
          icon="i-heroicons-plus"
          @click="openCreate"
        >
          Cadastrar primeiro vendedor
        </UButton>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800">
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap"
              >
                Vendedor
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell"
              >
                CPF
              </th>
              <th
                class="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Telefone
              </th>
              <th
                class="text-center px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Comissão
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
              v-for="s in paginatedSellers"
              :key="s.id"
              class="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors group relative"
              :class="{ 'opacity-60': !s.active }"
            >
              <!-- Name + avatar -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
                  >
                    <span
                      class="text-xs font-black text-primary-600 dark:text-primary-400"
                    >
                      {{ sellerInitials(s.name) }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <p
                      class="font-bold text-zinc-900 dark:text-white truncate max-w-35 sm:max-w-50"
                    >
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
              <td
                class="px-4 py-3.5 text-xs text-zinc-500 font-mono whitespace-nowrap hidden md:table-cell"
              >
                {{ s.document ? formatCpf(s.document) : "—" }}
              </td>

              <!-- Phone -->
              <td class="px-4 py-3.5 hidden lg:table-cell">
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
                <span v-else class="text-xs text-zinc-300 dark:text-zinc-700">
                  —
                </span>
              </td>

              <!-- Commission -->
              <td class="px-4 py-3.5 text-center">
                <span
                  :class="[
                    'inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full',
                    s.commissionRate > 0
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
                  ]"
                >
                  <UIcon name="i-heroicons-percent-badge" class="w-3.5 h-3.5" />
                  {{ s.commissionRate.toFixed(1) }}%
                </span>
              </td>

              <!-- Status -->
              <td class="px-4 py-3.5">
                <button @click="toggleActive(s)">
                  <UBadge
                    :color="s.active ? 'success' : 'neutral'"
                    variant="soft"
                    size="sm"
                    :icon="
                      s.active
                        ? 'i-heroicons-check-circle'
                        : 'i-heroicons-eye-slash'
                    "
                    class="cursor-pointer"
                  >
                    {{ s.active ? "Ativo" : "Inativo" }}
                  </UBadge>
                </button>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5 text-right">
                <div
                  class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <UTooltip :text="s.active ? 'Desativar' : 'Ativar'">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      :icon="
                        s.active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                      "
                      size="xs"
                      @click="toggleActive(s)"
                    />
                  </UTooltip>
                  <UTooltip text="Editar Vendedor">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="xs"
                      @click="openEdit(s)"
                    />
                  </UTooltip>
                  <UTooltip text="Excluir">
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="xs"
                      @click="confirmDelete(s)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <template v-if="filteredSellers.length > pageSize" #footer>
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1"
        >
          <p class="text-xs text-zinc-400">
            {{ filteredSellers.length }} vendedores · página {{ page }} de
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
          <div class="space-y-4">
            <h4
              class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-user" class="w-4 h-4" />
              Identificação
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  class="w-full"
                />
              </UFormField>

              <UFormField label="CPF" :error="formErrors.document">
                <UInput
                  v-model="form.document"
                  placeholder="000.000.000-00"
                  icon="i-heroicons-identification"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Telefone" :error="formErrors.phone">
                <UInput
                  v-model="form.phone"
                  placeholder="(00) 00000-0000"
                  icon="i-heroicons-phone"
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
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <USeparator />

          <!-- ── Comissão ── -->
          <div class="space-y-4">
            <h4
              class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-percent-badge" class="w-4 h-4" />
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
                <span class="font-black"
                  >R$ {{ (form.commissionRate * 10).toFixed(2) }}</span
                >
                de comissão.
              </p>
            </div>
          </div>

          <USeparator />

          <!-- ── Status ── -->
          <div class="space-y-4">
            <h4
              class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
              Configurações
            </h4>
            <div
              class="flex items-center justify-between p-4 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
            >
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  Vendedor Ativo
                </p>
                <p class="text-xs text-zinc-400 mt-0.5">
                  Vendedores inativos não aparecem nas seleções de novas vendas
                  e orçamentos
                </p>
              </div>
              <button
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
                  form.active
                    ? 'bg-primary-500'
                    : 'bg-zinc-300 dark:bg-zinc-600',
                ]"
                @click="form.active = !form.active"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                    form.active ? 'translate-x-5' : 'translate-x-0',
                  ]"
                />
              </button>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div
          class="flex items-center gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800"
        >
          <div class="flex-1 min-w-0">
            <UButton
              color="neutral"
              variant="outline"
              class="w-full"
              @click="isDrawerOpen = false"
            >
              Cancelar
            </UButton>
          </div>
          <div class="flex-1 min-w-0">
            <UButton
              color="primary"
              class="w-full"
              :loading="loadingSave"
              icon="i-heroicons-check"
              @click="handleSave"
            >
              {{ isEditing ? "Salvar Alterações" : "Cadastrar" }}
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm
    ══════════════════════════════════════════ -->
    <UModal v-model:open="isDeleteModalOpen" title="Excluir Vendedor">
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
                Tem certeza que deseja excluir
                <strong class="text-zinc-700 dark:text-zinc-300"
                  >"{{ deleteTarget?.name }}"</strong
                >? O histórico de vendas associado será mantido, mas o vínculo
                com este vendedor será removido.
              </p>
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
