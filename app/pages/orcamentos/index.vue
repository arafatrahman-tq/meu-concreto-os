<script setup lang="ts">
import type { Quote, QuoteStatus } from "~/types/sales";
import { formatCurrency } from "~/utils/formatters";
import { useQuotes, statusConfig } from "~/composables/useQuotes";
import { useQuotesForm } from "~/composables/useQuotesForm";
import { usePromoteQuote } from "~/composables/usePromoteQuote";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Orçamentos | Meu Concreto" });

const route = useRoute();

// 1. Data and shared logic from useQuotes
const {
  products,
  companiesList,
  sellersList,
  knownCustomers,
  loadingQuotes,
  refreshQuotes,
  search,
  statusFilter,
  page,
  pageSize,
  filteredQuotes,
  paginatedQuotes,
  totalPages,
  stats,
  deleteTarget,
  loadingDelete,
  isDeleteModalOpen,
  confirmDelete,
  handleDelete,
  updateStatus: apiUpdateStatus,
  isUpdatingStatus,
  driversList,
  // driverOptions, // We'll create a local one for multi-select
  pumperOptions,
  isConfirmDeleteModalOpen,
  confirmDeleteData,
  isDeleting,
  isConfirmCreateModalOpen,
  confirmCreateData,
  isCreating,
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
} = useQuotes();

const driverOptions = computed(() => [
  ...driversList.value.map((d) => ({ label: d.name, value: d.id })),
]);

// 2. Form logic from useQuotesForm
const {
  form,
  formErrors,
  isDrawerOpen,
  isEditing,
  loadingSave,
  selectedCustomer,
  selectedDriver,
  selectedPumper,
  customerSearchTerm,
  customerRegisteredAddress,
  useDeliveryAddress,
  subtotalBRL,
  totalBRL,
  openCreate,
  openEdit,
  handleSave,
  addItem,
  removeItem,
  onProductSelect,
  onMixDesignSelect,
  onCustomerSelect,
  duplicateQuote,
  sendPdf,
  isSendingPdf,
} = useQuotesForm({
  refreshQuotes,
  products,
  companiesList,
  knownCustomers,
  driverOptions,
  pumperOptions,
  onCreateDriver,
  onDeleteDriver,
  onCreatePumper,
  onDeletePumper,
  handleConfirmDelete,
  handleConfirmCreate,
  isConfirmDeleteModalOpen,
  confirmDeleteData,
  isDeleting,
  isConfirmCreateModalOpen,
  confirmCreateData,
  isCreating,
  mixDesigns,
});

// 3. Promotion logic from usePromoteQuote
const {
  isPromoteModalOpen,
  promoteTarget,
  isPromoting,
  promoteToSale,
  openPromoteModal,
} = usePromoteQuote({
  onSuccess: refreshQuotes,
});

// 4. Local helpers
const sellerOptions = computed(() => [
  { label: "Nenhum selecionado", value: null },
  ...sellersList.value.map((s) => ({ label: s.name, value: s.id })),
]);

const paymentMethodOptions = computed(() => [
  { label: "Nenhum selecionado", value: "" },
  ...(stats.value.paymentMethods?.map((m: any) => ({
    label: m.name,
    value: m.name,
  })) || []),
]);

// Handle external calls (e.g. from table actions)
const handleStatusUpdate = async (q: Quote, next: QuoteStatus) => {
  if (next === "approved") {
    openPromoteModal(q);
  } else {
    await apiUpdateStatus(q, next);
  }
};

// Process incoming query parameters
onMounted(() => {
  const {
    customer,
    customerName,
    customerDocument,
    customerPhone,
    customerAddress,
  } = route.query;

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
  <div class="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Orçamentos
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie suas propostas comerciais e converta-as em vendas.
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Novo Orçamento
      </UButton>
    </div>

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="(kpi, i) in [
          {
            label: 'Total de Orçamentos',
            value: stats.total,
            suffix: 'propostas',
            icon: 'i-heroicons-document-text',
            color: 'text-primary-500',
            bg: 'bg-primary-50 dark:bg-primary-500/10',
          },
          {
            label: 'Em Negociação',
            value: stats.pending,
            suffix: 'pendentes/enviados',
            icon: 'i-heroicons-clock',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
          },
          {
            label: 'Aprovados',
            value: stats.approved,
            suffix: 'orçamentos aceitos',
            icon: 'i-heroicons-check-circle',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
          {
            label: 'Conversão Potencial',
            value: formatCurrency(stats.totalValue),
            suffix: 'dos aprovados',
            icon: 'i-heroicons-banknotes',
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

    <!-- Main Table Component -->
    <QuotesTable
      v-model:search="search"
      v-model:status-filter="statusFilter"
      v-model:page="page"
      :paginated-quotes="paginatedQuotes"
      :loading-quotes="loadingQuotes"
      :filtered-quotes="filteredQuotes"
      :page-size="pageSize"
      :total-pages="totalPages"
      :status-config="statusConfig"
      :is-sending-pdf="isSendingPdf"
      :is-updating-status="isUpdatingStatus"
      @edit="openEdit"
      @delete="confirmDelete"
      @duplicate="duplicateQuote"
      @cancel="openCancelConfirm"
      @send-pdf="sendPdf"
      @update-status="handleStatusUpdate"
    />

    <!-- Drawer Component -->
    <QuotesDrawer
      v-model:is-drawer-open="isDrawerOpen"
      v-model:customer-search-term="customerSearchTerm"
      v-model:selected-customer="selectedCustomer"
      v-model:selected-driver="selectedDriver"
      v-model:selected-pumper="selectedPumper"
      v-model:use-delivery-address="useDeliveryAddress"
      :is-editing="isEditing"
      :known-customers="knownCustomers"
      :product-options="
        products.map((p) => ({ label: p.name, value: p.id, price: p.price }))
      "
      :seller-options="sellerOptions"
      :driver-options="driverOptions"
      :pumper-options="pumperOptions"
      :mix-designs="mixDesigns"
      :payment-method-options="paymentMethodOptions"
      :form="form"
      :form-errors="formErrors"
      :loading-save="loadingSave"
      :subtotal-b-r-l="subtotalBRL"
      :total-b-r-l="totalBRL"
      :customer-registered-address="customerRegisteredAddress"
      :on-customer-select="onCustomerSelect"
      :on-product-select="onProductSelect"
      :on-mix-design-select="onMixDesignSelect"
      :add-item="addItem"
      :remove-item="removeItem"
      :handle-save="handleSave"
      :on-create-driver="onCreateDriver"
      :on-delete-driver="onDeleteDriver"
      :on-create-pumper="onCreatePumper"
      :on-delete-pumper="onDeletePumper"
    />

    <!-- Modals Component -->
    <QuotesModals
      v-model:is-delete-modal-open="isDeleteModalOpen"
      v-model:is-confirm-delete-modal-open="isConfirmDeleteModalOpen"
      v-model:is-confirm-create-modal-open="isConfirmCreateModalOpen"
      v-model:is-promote-modal-open="isPromoteModalOpen"
      :delete-target="deleteTarget"
      :loading-delete="loadingDelete"
      :handle-delete="handleDelete"
      :confirm-delete-data="confirmDeleteData"
      :is-deleting-meta="isDeleting"
      :handle-confirm-delete="handleConfirmDelete"
      :confirm-create-data="confirmCreateData"
      :is-creating-meta="isCreating"
      :handle-confirm-create="handleConfirmCreate"
      :promote-target="promoteTarget"
      :is-promoting="isPromoting"
      :promote-to-sale="promoteToSale"
      v-model:is-cancel-modal-open="isCancelModalOpen"
      :cancel-target="cancelTarget"
      :loading-cancel="loadingCancel"
      v-model:cancel-reason="cancelReason"
      @cancel="handleCancel"
    />
  </div>
</template>
