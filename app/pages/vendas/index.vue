<script setup lang="ts">
import { useSales } from "~/composables/useSales";
import { useSalesForm } from "~/composables/useSalesForm";
import { formatCurrency } from "~/utils/formatters";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Vendas | Meu Concreto" });

const route = useRoute();

// 1. Data and List Actions
const {
  products,
  companiesList,
  paymentMethods,
  sellersList,
  driversList,
  pumpersList,
  knownCustomers,
  loadingSales,
  refreshSales,
  search,
  statusFilter,
  page,
  pageSize,
  paginatedSales,
  totalPages,
  stats,
  // Actions State
  isDeleteModalOpen,
  deleteTarget,
  loadingDelete,
  billingDialog,
  billingSale,
  billingForm,
  isConfirmDeleteModalOpen,
  confirmDeleteData,
  isDeleting,
  isConfirmCreateModalOpen,
  confirmCreateData,
  isCreating,
  // Actions
  openDeleteConfirm,
  handleDelete,
  updateStatus,
  openBilling,
  handleBill,
  onDeleteDriver,
  onDeletePumper,
  handleConfirmDelete,
  onCreateDriver,
  onCreatePumper,
  handleConfirmCreate,
  mixDesigns,
  isCancelModalOpen,
  cancelTarget,
  cancelReason,
  loadingCancel,
  openCancelConfirm,
  handleCancel,
} = useSales();

const driverOptions = computed(() => [
  ...driversList.value.map((d) => ({ label: d.name, value: d.id })),
]);

// 2. Form logic
const {
  form,
  formErrors,
  isDrawerOpen,
  isEditing,
  loadingSave,
  customerSearchTerm,
  selectedCustomer,
  customerRegisteredAddress,
  useDeliveryAddress,
  subtotalBRL,
  totalBRL,
  linkedQuoteId,
  openCreate,
  openEdit,
  handleSave,
  addItem,
  removeItem,
  onProductSelect,
  onMixDesignSelect,
  sendPdf,
  isSendingPdf,
  selectedDriver,
} = useSalesForm({
  refreshSales,
  products,
  companiesList,
  knownCustomers,
  mixDesigns,
  driverOptions,
  paymentMethods,
});

const productOptions = computed(() => [
  { label: "Selecione um produto", value: null },
  ...products.value.map((p) => ({ label: p.name, value: p.id })),
]);

// Options for components
const sellerOptions = computed(() => [
  { label: "Nenhum selecionado", value: 0 },
  ...sellersList.value.map((s) => ({ label: s.name, value: s.id })),
]);

const pumperOptions = computed(() => [
  { label: "Nenhum selecionado", value: 0 },
  ...pumpersList.value.map((p) => ({ label: p.name, value: p.id })),
]);

const paymentMethodOptions = computed(() =>
  paymentMethods.value.map((pm) => ({ label: pm.name, value: pm.name })),
);

const kpiItems = computed(() => [
  {
    label: "Total de Vendas",
    value: stats.value.total,
    suffix: "vendas registradas",
    icon: "i-heroicons-shopping-cart",
    color: "text-primary-500",
    bg: "bg-primary-50 dark:bg-primary-500/10",
  },
  {
    label: "Em Andamento",
    value: stats.value.inProgress,
    suffix: "entregas em curso",
    icon: "i-heroicons-truck",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  {
    label: "Concluídas",
    value: stats.value.completed,
    suffix: "pedidos entregues",
    icon: "i-heroicons-check-circle",
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-500/10",
  },
  {
    label: "Faturamento Total",
    value: formatCurrency(stats.value.totalValue),
    suffix: "valor bruto",
    icon: "i-heroicons-banknotes",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
]);

// Handle incoming query parameters
onMounted(() => {
  const {
    status,
    customer,
    customerName,
    customerDocument,
    customerPhone,
    customerAddress,
  } = route.query;

  if (
    typeof status === "string" &&
    [
      "all",
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ].includes(status)
  ) {
    statusFilter.value = status as typeof statusFilter.value;
  }

  if (customer || customerName) {
    openCreate();
    form.customerName = String(customer || customerName);
    if (customerDocument) form.customerDocument = String(customerDocument);
    if (customerPhone) form.customerPhone = String(customerPhone);
    if (customerAddress) form.customerAddress = String(customerAddress);

    if (customerDocument) {
      const match = companiesList.value.find(
        (c) => c.document === String(customerDocument),
      );
      if (match) {
        selectedCustomer.value = {
          id: `company-${match.id}`,
          label: match.name,
          name: match.name,
          document: match.document,
          phone: match.phone ?? "",
          address: [match.address, match.city, match.state]
            .filter(Boolean)
            .join(", "),
          source: "company",
        };
      }
    }
  }
});
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Vendas
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie seus pedidos, acompanhe entregas e faturamento.
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Nova Venda
      </UButton>
    </div>

    <!-- ── KPI Strip (Design System compliant) ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <template v-if="loadingSales">
        <USkeleton v-for="i in 4" :key="i" class="h-28 rounded-3xl" />
      </template>
      <template v-else>
        <div
          v-for="(kpi, i) in kpiItems"
          :key="i"
          class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-tight"
            >
              {{ kpi.label }}
            </span>
            <div
              :class="[
                kpi.bg,
                'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
              ]"
            >
              <UIcon :name="kpi.icon" :class="['w-6 h-6', kpi.color]" />
            </div>
          </div>
          <p
            class="text-3xl font-black tabular-nums tracking-tighter"
            :class="kpi.color"
          >
            {{ kpi.value }}
          </p>
          <div class="flex items-center gap-1.5 -mt-2">
            <div
              :class="[kpi.color, 'w-1.5 h-1.5 rounded-full animate-pulse']"
            />
            <p
              class="text-[11px] text-zinc-400 font-bold uppercase tracking-wider"
            >
              {{ kpi.suffix }}
            </p>
          </div>
        </div>
      </template>
    </div>

    <!-- Main Table UI -->
    <SalesTable
      v-model:search="search"
      v-model:status-filter="statusFilter"
      v-model:page="page"
      :sales="paginatedSales"
      :loading="loadingSales"
      :page-size="pageSize"
      :total-pages="totalPages"
      :stats="stats"
      :is-sending-pdf="isSendingPdf"
      @edit="openEdit"
      @delete="openDeleteConfirm"
      @bill="openBilling"
      @cancel="openCancelConfirm"
      @update-status="updateStatus"
      @send-pdf="sendPdf"
    />

    <!-- Create/Edit Form UI -->
    <SalesDrawer
      v-model:open="isDrawerOpen"
      v-model:selected-customer="selectedCustomer"
      v-model:customer-search-term="customerSearchTerm"
      v-model:use-delivery-address="useDeliveryAddress"
      :is-editing="isEditing"
      :loading-save="loadingSave"
      :form="form"
      :form-errors="formErrors"
      :products="products"
      :companies-list="companiesList"
      :known-customers="knownCustomers"
      :seller-options="sellerOptions"
      :driver-options="driverOptions"
      :pumper-options="pumperOptions"
      :product-options="productOptions"
      :mix-designs="mixDesigns"
      :payment-method-options="paymentMethodOptions"
      :linked-quote-id="linkedQuoteId"
      :customer-registered-address="customerRegisteredAddress"
      :subtotal-b-r-l="subtotalBRL"
      :total-b-r-l="totalBRL"
      @save="handleSave"
      @add-item="addItem"
      @remove-item="removeItem"
      @product-select="onProductSelect"
      @mix-design-select="onMixDesignSelect"
      @create-driver="onCreateDriver"
      @create-pumper="onCreatePumper"
      @delete-driver="onDeleteDriver"
      @delete-pumper="onDeletePumper"
    />

    <!-- Modals (Delete, Bill, Confirmation) -->
    <SalesModals
      v-model:delete-modal-open="isDeleteModalOpen"
      v-model:billing-dialog="billingDialog"
      v-model:confirm-delete-modal-open="isConfirmDeleteModalOpen"
      v-model:confirm-create-modal-open="isConfirmCreateModalOpen"
      v-model:cancel-modal-open="isCancelModalOpen"
      v-model:cancel-reason="cancelReason"
      :delete-target="deleteTarget"
      :loading-delete="loadingDelete"
      :billing-sale="billingSale"
      :billing-form="billingForm"
      :payment-method-options="paymentMethodOptions"
      :confirm-delete-data="confirmDeleteData"
      :is-deleting="isDeleting"
      :confirm-create-data="confirmCreateData"
      :is-creating="isCreating"
      :cancel-target="cancelTarget"
      :loading-cancel="loadingCancel"
      @delete="handleDelete"
      @bill="handleBill"
      @confirm-delete="handleConfirmDelete(form)"
      @confirm-create="handleConfirmCreate(form)"
      @cancel="handleCancel"
    />
  </div>
</template>
