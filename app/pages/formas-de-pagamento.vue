<script setup lang="ts">
import PaymentMethodDrawer from "~/components/payment-methods/PaymentMethodDrawer.vue";
import KpiCard from "~/components/dashboard/KpiCard.vue";
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
  <div class="p-8 space-y-8">
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
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        size="md"
        @click="openCreate"
      >
        Nova Forma
      </UButton>
    </div>

    <!-- -- KPI Cards -- -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <KpiCard
        label="Total de Métodos"
        :value="stats.total.toString()"
        icon="i-heroicons-credit-card"
        icon-color="text-primary-500"
      />
      <KpiCard
        label="Métodos Ativos"
        :value="stats.active.toString()"
        icon="i-heroicons-check-circle"
        icon-color="text-green-500"
      />
      <KpiCard
        label="Inativos"
        :value="stats.inactive.toString()"
        icon="i-heroicons-eye-slash"
        icon-color="text-zinc-400"
      />
      <KpiCard
        label="Tipos"
        :value="stats.uniqueTypes.toString()"
        icon="i-heroicons-squares-2x2"
        icon-color="text-blue-500"
      />
    </div>

    <!-- -- Main List -- -->
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-funnel" class="w-4 h-4 text-zinc-400" />
            <span
              class="text-sm font-black uppercase tracking-widest text-zinc-400"
            >
              Filtros de Busca
            </span>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="search"
              placeholder="Buscar..."
              icon="i-heroicons-magnifying-glass"
              class="w-64"
              size="sm"
            />
            <USelectMenu
              v-model="typeFilter"
              :items="ALL_TYPES_OPT"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-44"
              icon="i-heroicons-squares-plus"
            />
            <USelectMenu
              v-model="activeFilter"
              :items="STATUS_FILTER_OPTS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-36"
              icon="i-heroicons-bolt"
            />
          </div>
        </div>
      </template>

      <!-- Grid -->
      <div
        v-if="filteredMethods.length"
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 p-6"
      >
        <div
          v-for="m in filteredMethods"
          :key="m.id"
          :class="[
            'relative flex flex-col gap-4 rounded-xl ring-1 p-6 transition-all group',
            m.active
              ? 'bg-white dark:bg-zinc-900 ring-zinc-200 dark:ring-zinc-800 hover:ring-primary-300 dark:hover:ring-primary-700'
              : 'bg-zinc-50/60 dark:bg-zinc-900/40 ring-zinc-100 dark:ring-zinc-800/50 opacity-70',
          ]"
        >
          <div class="flex items-start gap-4">
            <div
              :class="[
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                TYPE_CONFIG_MAP[m.type].bg,
              ]"
            >
              <UIcon
                :name="TYPE_CONFIG_MAP[m.type].icon"
                :class="['w-6 h-6', TYPE_CONFIG_MAP[m.type].color]"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p
                  class="font-black text-zinc-900 dark:text-white leading-tight truncate"
                >
                  {{ m.name }}
                </p>
                <UTooltip text="1º Padrão" v-if="m.isDefault">
                  <UIcon
                    name="i-heroicons-star"
                    class="w-4 h-4 text-amber-500 shrink-0"
                  />
                </UTooltip>
                <UTooltip text="2º Padrão" v-if="m.isDefault2">
                  <UIcon
                    name="i-heroicons-star"
                    class="w-4 h-4 text-blue-500 shrink-0"
                  />
                </UTooltip>
              </div>
              <p
                class="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5"
              >
                {{ TYPE_CONFIG_MAP[m.type].label }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <UTooltip
                :text="
                  m.isDefault2 ? 'Remover 2º Padrão' : 'Definir como 2º Padrão'
                "
              >
                <UButton
                  :color="m.isDefault2 ? 'primary' : 'neutral'"
                  variant="ghost"
                  icon="i-heroicons-star"
                  size="sm"
                  square
                  @click="setDefault2(m)"
                />
              </UTooltip>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-pencil-square"
                size="sm"
                square
                @click="openEdit(m)"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                size="sm"
                square
                @click="confirmDelete(m)"
              />
            </div>
          </div>

          <!-- Quick Badges -->
          <div
            v-if="m.details && Object.keys(m.details).length > 0"
            class="flex flex-wrap gap-2"
          >
            <UBadge
              v-if="m.details.maxInstallments"
              color="neutral"
              variant="soft"
              size="sm"
              class="text-xs font-bold px-2"
            >
              {{ m.details.maxInstallments }}x sem juros
            </UBadge>
            <UBadge
              v-if="m.details.pixKey"
              color="primary"
              variant="soft"
              size="sm"
              class="text-xs font-bold px-2 max-w-30 truncate"
            >
              PIX: {{ m.details.pixKey }}
            </UBadge>
            <span
              v-if="m.details.bankName"
              class="text-xs text-zinc-400 font-medium truncate"
            >
              {{ m.details.bankName }}
            </span>
          </div>

          <div
            class="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800"
          >
            <UBadge
              :color="m.active ? 'success' : 'neutral'"
              variant="soft"
              size="sm"
              class="cursor-pointer"
              @click="toggleActive(m)"
            >
              {{ m.active ? "Ativo" : "Inativo" }}
            </UBadge>
            <span
              class="text-xs text-zinc-400 font-bold uppercase tracking-widest leading-none"
            >
              CRIADO EM {{ formatDate(m.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="flex flex-col items-center justify-center py-20 text-zinc-400"
      >
        <UIcon
          name="i-heroicons-credit-card"
          class="w-12 h-12 mb-4 opacity-20"
        />
        <p class="text-sm font-bold">Nenhuma forma de pagamento encontrada</p>
        <UButton
          v-if="!search && typeFilter === 'all' && activeFilter === 'all'"
          color="primary"
          variant="soft"
          size="sm"
          class="mt-4"
          @click="openCreate"
        >
          Cadastrar Primeira
        </UButton>
      </div>
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
