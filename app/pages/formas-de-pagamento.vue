<script setup lang="ts">
import PaymentMethodDrawer from "~/components/payment-methods/PaymentMethodDrawer.vue";
import type { PaymentMethod, MethodType } from "~/types/payment-methods";
import { TYPE_CONFIG as TYPE_CONFIG_MAP } from "~/types/payment-methods";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Formas de Pagamento | Meu Concreto" });

const { companyId } = useAuth();
const toast = useToast();

// ---------------------------------------------
// Data
// ---------------------------------------------
const {
  data: pmData,
  refresh,
  pending: _loadingList,
} = await useFetch<{ paymentMethods: PaymentMethod[] }>(
  "/api/payment-methods",
  {
    query: { companyId },
  },
);

const methodsList = computed<PaymentMethod[]>(
  () => pmData.value?.paymentMethods ?? [],
);

// ---------------------------------------------
// Type config
// ---------------------------------------------
const TYPE_OPTS = Object.entries(TYPE_CONFIG_MAP).map(([value, cfg]) => ({
  value: value as MethodType,
  label: cfg.label,
}));

// ---------------------------------------------
// KPIs
// ---------------------------------------------
const stats = computed(() => {
  const list = methodsList.value;
  const uniqueTypes = new Set(list.map((m) => m.type)).size;
  return {
    total: list.length,
    active: list.filter((m) => m.active).length,
    inactive: list.filter((m) => !m.active).length,
    uniqueTypes,
  };
});

// ---------------------------------------------
// Filter & Search
// ---------------------------------------------
const search = ref("");
const typeFilter = ref<MethodType | "all">("all");
const activeFilter = ref<"all" | "active" | "inactive">("all");

const filteredMethods = computed(() => {
  return methodsList.value.filter((m) => {
    const matchType = typeFilter.value === "all" || m.type === typeFilter.value;
    const matchActive =
      activeFilter.value === "all" ||
      (activeFilter.value === "active" && m.active) ||
      (activeFilter.value === "inactive" && !m.active);
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      TYPE_CONFIG_MAP[m.type].label.toLowerCase().includes(q);
    return matchType && matchActive && matchSearch;
  });
});

// ---------------------------------------------
// Pagination
// ---------------------------------------------
const page = ref(1);
const pageSize = ref(12);

const paginatedMethods = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredMethods.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredMethods.value.length / pageSize.value),
);

watch([search, typeFilter, activeFilter], () => {
  page.value = 1;
});

// ---------------------------------------------
// Drawer management
// ---------------------------------------------
const isDrawerOpen = ref(false);
const selectedPaymentMethod = ref<PaymentMethod | null>(null);

function openCreate() {
  selectedPaymentMethod.value = null;
  isDrawerOpen.value = true;
}

function openEdit(m: PaymentMethod) {
  selectedPaymentMethod.value = { ...m };
  isDrawerOpen.value = true;
}

// ---------------------------------------------
// Delete logic
// ---------------------------------------------
const deleteTarget = ref<PaymentMethod | null>(null);
const loadingDelete = ref(false);
const isDeleteModalOpen = ref(false);

function confirmDelete(m: PaymentMethod) {
  deleteTarget.value = m;
  isDeleteModalOpen.value = true;
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  loadingDelete.value = true;
  const name = deleteTarget.value.name;
  try {
    await $fetch(`/api/payment-methods/${deleteTarget.value.id}`, {
      method: "DELETE",
    });
    isDeleteModalOpen.value = false;
    toast.add({
      title: "Removida com sucesso",
      description: `"${name}" foi excluída.`,
      color: "success",
      icon: "i-heroicons-trash",
    });
    await refresh();
  } catch (e: any) {
    const err =
      (e as any).data?.statusMessage || e.message || "Erro ao excluir";
    toast.add({
      title: "Erro ao excluir",
      description: err,
      color: "error",
    });
  } finally {
    loadingDelete.value = false;
    deleteTarget.value = null;
  }
}

// ---------------------------------------------
// Actions
// ---------------------------------------------
async function toggleActive(m: PaymentMethod) {
  try {
    await $fetch(`/api/payment-methods/${m.id}`, {
      method: "PUT",
      body: { active: !m.active },
    });
    toast.add({
      title: m.active ? "Desativada" : "Ativada",
      description: `"${m.name}" foi ${m.active ? "desativada" : "ativada"}.`,
      color: m.active ? "warning" : "success",
      icon: m.active ? "i-heroicons-eye-slash" : "i-heroicons-check-circle",
    });
    await refresh();
  } catch (e: any) {
    const err = (e as any).data?.statusMessage || "Tente novamente.";
    toast.add({ title: "Erro", description: err, color: "error" });
  }
}

async function setDefault2(m: PaymentMethod) {
  try {
    await $fetch(`/api/payment-methods/${m.id}`, {
      method: "PUT",
      body: { isDefault2: !m.isDefault2 },
    });
    toast.add({
      title: m.isDefault2
        ? `"${m.name}" removida como 2º padrão`
        : `"${m.name}" definida como 2º padrão`,
      color: m.isDefault2 ? "neutral" : "success",
      icon: m.isDefault2 ? "i-heroicons-star" : "i-heroicons-star",
    });
    await refresh();
  } catch (e: any) {
    const err = (e as any).data?.statusMessage || "Tente novamente.";
    toast.add({ title: "Erro", description: err, color: "error" });
  }
}

const STATUS_FILTER_OPTS = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" },
];

const ALL_TYPES_OPT = [{ value: "all", label: "Todos os tipos" }, ...TYPE_OPTS];

const formatDate = (date: string | number | Date | null | undefined) => {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy", { locale: ptBR });
};
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- -- Header -- -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Formas de Pagamento
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie os métodos de pagamento aceitos pela empresa
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-path"
          label="Atualizar"
          size="md"
          :loading="_loadingList"
          @click="refresh"
        />
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          size="md"
          @click="openCreate"
        >
          Nova Forma
        </UButton>
      </div>
    </div>

    <!-- -- KPI Cards -- -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
          >
            Total de Métodos
          </span>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
          >
            <UIcon
              name="i-heroicons-credit-card"
              class="h-5 w-5 text-primary-500"
            />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.total }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          formas cadastradas
        </p>
      </div>

      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
          >
            Métodos Ativos
          </span>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10"
          >
            <UIcon
              name="i-heroicons-check-circle"
              class="h-5 w-5 text-green-500"
            />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.active }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          disponíveis no sistema
        </p>
      </div>

      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
          >
            Inativos
          </span>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800"
          >
            <UIcon name="i-heroicons-eye-slash" class="h-5 w-5 text-zinc-500" />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.inactive }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">
          temporariamente ocultos
        </p>
      </div>

      <div
        class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[10px] font-black uppercase tracking-widest leading-tight text-zinc-400"
          >
            Tipos
          </span>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10"
          >
            <UIcon
              name="i-heroicons-squares-2x2"
              class="h-5 w-5 text-blue-500"
            />
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-black text-zinc-900 tabular-nums dark:text-white"
            >{{ stats.uniqueTypes }}</span
          >
        </div>
        <p class="text-xs font-medium text-zinc-400 -mt-2">categorias em uso</p>
      </div>
    </div>

    <!-- -- Main List -- -->
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
              Registros do Período
            </h3>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <UInput
              v-model="search"
              placeholder="Buscar forma..."
              icon="i-heroicons-magnifying-glass"
              class="w-full sm:w-64"
              size="sm"
            />
            <USelectMenu
              v-model="typeFilter"
              :items="ALL_TYPES_OPT"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-full sm:w-44"
              icon="i-heroicons-squares-plus"
            />
            <USelectMenu
              v-model="activeFilter"
              :items="STATUS_FILTER_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-full sm:w-36"
              icon="i-heroicons-bolt"
            />
          </div>
        </div>
      </template>

      <!-- Table -->
      <div v-if="filteredMethods.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
              <th
                class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Forma
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Tipo
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Detalhes
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Status
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Criado em
              </th>
              <th class="px-6 py-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            <tr
              v-for="m in paginatedMethods"
              :key="m.id"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700',
                      TYPE_CONFIG_MAP[m.type].bg,
                    ]"
                  >
                    <UIcon
                      :name="TYPE_CONFIG_MAP[m.type].icon"
                      :class="['h-5 w-5', TYPE_CONFIG_MAP[m.type].color]"
                    />
                  </div>
                  <div class="flex flex-col gap-1 min-w-0">
                    <span
                      class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors truncate"
                    >
                      {{ m.name }}
                    </span>
                    <div class="flex items-center gap-2">
                      <span
                        v-if="m.isDefault"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      >
                        1º padrão
                      </span>
                      <span
                        v-if="m.isDefault2"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      >
                        2º padrão
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4">
                <span
                  class="text-xs font-bold text-zinc-600 dark:text-zinc-400"
                >
                  {{ TYPE_CONFIG_MAP[m.type].label }}
                </span>
              </td>
              <td class="px-4 py-4">
                <div class="flex flex-wrap gap-1.5">
                  <UBadge
                    v-if="m.details?.maxInstallments"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="font-black uppercase tracking-wider"
                  >
                    {{ m.details.maxInstallments }}x
                  </UBadge>
                  <UBadge
                    v-if="m.details?.pixKey"
                    color="primary"
                    variant="soft"
                    size="xs"
                    class="font-black uppercase tracking-wider"
                  >
                    PIX
                  </UBadge>
                  <span
                    v-if="m.details?.bankName"
                    class="text-[11px] font-bold text-zinc-400"
                  >
                    {{ m.details.bankName }}
                  </span>
                  <span
                    v-if="!m.details || Object.keys(m.details).length === 0"
                    class="text-[11px] font-bold text-zinc-400"
                  >
                    Sem detalhes
                  </span>
                </div>
              </td>
              <td class="px-4 py-4">
                <UBadge
                  :color="m.active ? 'success' : 'neutral'"
                  variant="subtle"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
                >
                  {{ m.active ? "Ativo" : "Inativo" }}
                </UBadge>
              </td>
              <td class="px-4 py-4 hidden lg:table-cell">
                <span
                  class="text-xs font-bold text-zinc-600 dark:text-zinc-400"
                >
                  {{ formatDate(m.createdAt) }}
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
                    @click="openEdit(m)"
                  />
                  <UDropdownMenu
                    :items="[
                      [
                        {
                          label: m.active ? 'Desativar forma' : 'Ativar forma',
                          icon: m.active
                            ? 'i-heroicons-eye-slash'
                            : 'i-heroicons-check-circle',
                          onSelect: () => toggleActive(m),
                        },
                        {
                          label: m.isDefault2
                            ? 'Remover 2º padrão'
                            : 'Definir como 2º padrão',
                          icon: 'i-heroicons-star',
                          onSelect: () => setDefault2(m),
                        },
                      ],
                      [
                        {
                          label: 'Excluir',
                          icon: 'i-heroicons-trash',
                          color: 'error',
                          onSelect: () => confirmDelete(m),
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

      <!-- Empty State -->
      <div
        v-else
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon
          name="i-heroicons-credit-card"
          class="w-12 h-12 mb-4 text-zinc-300"
        />
        <p class="text-sm font-bold text-zinc-900 dark:text-white">
          Nenhuma forma de pagamento encontrada
        </p>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          class="mt-4 h-11 px-4"
          @click="openCreate"
        >
          Criar nova forma
        </UButton>
      </div>

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

    <!-- -- Drawer -- -->
    <PaymentMethodDrawer
      v-model:open="isDrawerOpen"
      :payment-method="selectedPaymentMethod"
      @saved="refresh"
    />

    <!-- -- Delete Modal -- -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Confirmar Exclusão"
      :description="`Esta ação removerá permanentemente esta forma de pagamento (${deleteTarget?.name}).`"
    >
      <template #body>
        <div class="p-6 space-y-6">
          <div
            class="flex items-center gap-4 text-red-600 bg-red-50 dark:bg-red-500/10 p-4 rounded-xl"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-6 h-6 shrink-0"
            />
            <p class="text-sm font-bold">
              Confirmar exclusão? Esta ação não pode ser desfeita.
            </p>
          </div>
          <div class="flex justify-end gap-3">
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
              @click="handleDelete"
            >
              Confirmar Exclusão
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
