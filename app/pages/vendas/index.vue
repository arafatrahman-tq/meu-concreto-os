<script setup lang="ts">
import { useSales } from "~/composables/useSales";
import { useSalesForm } from "~/composables/useSalesForm";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Vendas | Meu Concreto" });

const route = useRoute();

// 1. Data and List Actions
const {
  sales,
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
  prefillFromQuote,
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

const paymentMethodOptions = computed(() => [
  { label: "Não informado", value: undefined },
  ...paymentMethods.value.map((pm) => ({ label: pm.name, value: pm.name })),
]);

// Handle incoming query parameters
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

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        v-for="(kpi, i) in [
          {
            label: 'Total de Vendas',
            value: stats.total,
            suffix: 'vendas registradas',
            icon: 'i-heroicons-shopping-cart',
            color: 'text-primary-500',
            bg: 'bg-primary-50 dark:bg-primary-500/10',
          },
          {
            label: 'Em Andamento',
            value: stats.inProgress,
            suffix: 'entregas em curso',
            icon: 'i-heroicons-truck',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
          },
          {
            label: 'Concluídas',
            value: stats.completed,
            suffix: 'pedidos entregues',
            icon: 'i-heroicons-check-circle',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
          {
            label: 'Faturamento Total',
            value: formatCurrency(stats.totalValue),
            suffix: 'valor bruto',
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

    <!-- Main Table UI -->
    <SalesTable
      :sales="paginatedSales"
      :loading="loadingSales"
      v-model:search="search"
      v-model:statusFilter="statusFilter"
      v-model:page="page"
      :pageSize="pageSize"
      :totalPages="totalPages"
      :stats="stats"
      @edit="openEdit"
      @delete="openDeleteConfirm"
      @bill="openBilling"
      @cancel="openCancelConfirm"
      @updateStatus="updateStatus"
      :isSendingPdf="isSendingPdf"
      @sendPdf="sendPdf"
    />

    <!-- Create/Edit Form UI -->
    <SalesDrawer
      v-model:open="isDrawerOpen"
      :isEditing="isEditing"
      :loadingSave="loadingSave"
      :form="form"
      :formErrors="formErrors"
      :products="products"
      :companiesList="companiesList"
      :knownCustomers="knownCustomers"
      :sellerOptions="sellerOptions"
      :driverOptions="driverOptions"
      :pumperOptions="pumperOptions"
      :productOptions="productOptions"
      :mixDesigns="mixDesigns"
      :paymentMethodOptions="paymentMethodOptions"
      :linkedQuoteId="linkedQuoteId"
      v-model:selectedCustomer="selectedCustomer"
      v-model:customerSearchTerm="customerSearchTerm"
      :customerRegisteredAddress="customerRegisteredAddress"
      v-model:useDeliveryAddress="useDeliveryAddress"
      :subtotalBRL="subtotalBRL"
      :totalBRL="totalBRL"
      @save="handleSave"
      @addItem="addItem"
      @removeItem="removeItem"
      @productSelect="onProductSelect"
      @mixDesignSelect="onMixDesignSelect"
      @createDriver="onCreateDriver"
      @createPumper="onCreatePumper"
      @deleteDriver="onDeleteDriver"
      @deletePumper="onDeletePumper"
    />

    <!-- Modals (Delete, Bill, Confirmation) -->
    <SalesModals
      v-model:deleteModalOpen="isDeleteModalOpen"
      :deleteTarget="deleteTarget"
      :loadingDelete="loadingDelete"
      v-model:billingDialog="billingDialog"
      :billingSale="billingSale"
      :billingForm="billingForm"
      :paymentMethodOptions="paymentMethodOptions"
      v-model:confirmDeleteModalOpen="isConfirmDeleteModalOpen"
      :confirmDeleteData="confirmDeleteData"
      :isDeleting="isDeleting"
      v-model:confirmCreateModalOpen="isConfirmCreateModalOpen"
      :confirmCreateData="confirmCreateData"
      :isCreating="isCreating"
      @delete="handleDelete"
      @bill="handleBill"
      @confirmDelete="handleConfirmDelete(form)"
      @confirmCreate="handleConfirmCreate(form)"
      v-model:cancelModalOpen="isCancelModalOpen"
      :cancelTarget="cancelTarget"
      :loadingCancel="loadingCancel"
      v-model:cancelReason="cancelReason"
      @cancel="handleCancel"
    />
  </div>
</template>
