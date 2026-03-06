import { ref, computed, watch } from "vue";
import type {
  Quote,
  Product,
  Company,
  Seller,
  QuoteStatus,
  MixDesign,
  PaymentMethod,
} from "~/types/sales";
import { getApiError } from "~/utils/errors";

// Constantes estáticas fora do escopo do Composable para não alocar memória repetida
export const STATUS_OPTS = [
  { label: "Todos", value: "all" },
  { label: "Rascunho", value: "draft" },
  { label: "Enviado", value: "sent" },
  { label: "Aprovado", value: "approved" },
  { label: "Rejeitado", value: "rejected" },
  { label: "Expirado", value: "expired" },
];

export const statusConfig: Record<
  QuoteStatus,
  { label: string; color: string; icon: string }
> = {
  draft: {
    label: "Rascunho",
    color: "neutral",
    icon: "i-heroicons-pencil-square",
  },
  sent: {
    label: "Enviado",
    color: "info",
    icon: "i-heroicons-paper-airplane",
  },
  approved: {
    label: "Aprovado",
    color: "success",
    icon: "i-heroicons-check-circle",
  },
  rejected: {
    label: "Rejeitado",
    color: "error",
    icon: "i-heroicons-x-circle",
  },
  expired: { label: "Expirado", color: "warning", icon: "i-heroicons-clock" },
};

export const useQuotes = () => {
  const { companyId } = useAuth();
  const toast = useToast();

  // 1. Melhor Prática Nuxt: Empacotar fetches simultâneos não-dependentes
  const {
    data: dashboardPayload,
    pending: loadingQuotes,
    refresh: refreshQuotes,
  } = useAsyncData(
    `quotes-dashboard-${companyId.value}`, // Unique cache key
    async () => {
      // Se não houver empresa selecionada, não faz requisições inúteis
      if (!companyId.value) {
        return {
          quotes: [],
          products: [],
          companies: [],
          sellers: [],
          mixDesigns: [],
          paymentMethods: [],
        };
      }

      // $fetch não é reativo, por isso é o correto para usar dentro do useAsyncData
      const [
        quotesRes,
        productsRes,
        companiesRes,
        sellersRes,
        mixRes,
        paymentMethodsRes,
      ] = await Promise.all([
        $fetch<{ quotes: Quote[] }>("/api/quotes", {
          query: { companyId: companyId.value },
        }),
        $fetch<{ products: Product[] }>("/api/products", {
          query: { companyId: companyId.value },
        }),
        $fetch<{ companies: Company[] }>("/api/companies", {
          query: { companyId: companyId.value },
        }),
        $fetch<{ sellers: Seller[] }>("/api/sellers", {
          query: { companyId: companyId.value, active: "true" },
        }),
        $fetch<{ mixDesigns: MixDesign[] }>("/api/mix-designs", {
          query: { companyId: companyId.value },
        }),
        $fetch<{ paymentMethods: PaymentMethod[] }>("/api/payment-methods", {
          query: { companyId: companyId.value, active: "true" },
        }),
      ]);

      return {
        quotes: quotesRes.quotes || [],
        products: productsRes.products || [],
        companies: companiesRes.companies || [],
        sellers: sellersRes.sellers || [],
        mixDesigns: mixRes.mixDesigns || [],
        paymentMethods: paymentMethodsRes.paymentMethods || [],
      };
    },
    { watch: [companyId] }, // Refaz o fetch universal se a empresa logada mudar!
  );

  // Computed views em cima do cache mestre
  const quotes = computed(() => dashboardPayload.value?.quotes ?? []);
  const products = computed(() => dashboardPayload.value?.products ?? []);
  const companiesList = computed(() => dashboardPayload.value?.companies ?? []);
  const sellersList = computed(() => dashboardPayload.value?.sellers ?? []);
  const mixDesigns = computed(() => dashboardPayload.value?.mixDesigns ?? []);
  const paymentMethodsList = computed(
    () => dashboardPayload.value?.paymentMethods ?? [],
  );

  // Integração com composables vizinhos
  const {
    driversList,
    pumpersList,
    driverOptions,
    pumperOptions,
    refreshDrivers,
    refreshPumpers,
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
  } = useLogistics();

  // O nosso useKnownCustomers agora aceita Refs graças a nossa refatoração MaybeRefOrGetter
  const { knownCustomers } = useKnownCustomers(companiesList, quotes, "quote");

  // Filtros de Tabela
  const search = ref("");
  const statusFilter = ref<QuoteStatus | "all">("all");
  const page = ref(1);
  const pageSize = ref(10);

  const filteredQuotes = computed(() => {
    return quotes.value
      .filter((q) => {
        const matchState =
          statusFilter.value === "all" || q.status === statusFilter.value;
        const searchLower = search.value.toLowerCase();

        const matchSearch =
          !search.value ||
          q.customerName.toLowerCase().includes(searchLower) ||
          String(q.id).includes(search.value) ||
          (q.customerDocument ?? "").includes(search.value);

        return matchState && matchSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt as string).getTime() -
          new Date(a.createdAt as string).getTime(),
      );
  });

  const paginatedQuotes = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filteredQuotes.value.slice(start, start + pageSize.value);
  });

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredQuotes.value.length / pageSize.value)),
  );

  watch([search, statusFilter], () => {
    page.value = 1;
  });

  const stats = computed(() => {
    const all = quotes.value;
    return {
      total: all.length,
      approved: all.filter((q) => q.status === "approved").length,
      pending: all.filter((q) => q.status === "sent" || q.status === "draft")
        .length,
      totalValue: all
        .filter((q) => q.status === "approved")
        .reduce((s, q) => s + q.total, 0),
    };
  });

  // Gestão de Exclusão
  const deleteTarget = ref<Quote | null>(null);
  const loadingDelete = ref(false);
  const isDeleteModalOpen = ref(false);
  const isUpdatingStatus = ref<number | null>(null);

  const confirmDelete = (q: Quote) => {
    deleteTarget.value = q;
    isDeleteModalOpen.value = true;
  };

  const handleDelete = async () => {
    if (!deleteTarget.value) return;
    loadingDelete.value = true;
    const name = deleteTarget.value.customerName;
    try {
      await $fetch(`/api/quotes/${deleteTarget.value.id}`, {
        method: "DELETE",
      });
      isDeleteModalOpen.value = false;
      toast.add({
        title: "Orçamento excluído",
        description: `O orçamento de ${name} foi excluído.`,
        color: "neutral",
        icon: "i-heroicons-trash",
      });
      await refreshQuotes();
    } catch (e: any) {
      toast.add({
        title: "Erro ao excluir",
        description: getApiError(e),
        color: "error",
        icon: "i-heroicons-exclamation-circle",
      });
    } finally {
      loadingDelete.value = false;
      deleteTarget.value = null; // Libera referência em memória
    }
  };

  // Status Updater
  const updateStatus = async (q: Quote, status: QuoteStatus) => {
    isUpdatingStatus.value = q.id;
    try {
      await $fetch(`/api/quotes/${q.id}`, { method: "PUT", body: { status } });
      toast.add({
        title: "Status atualizado",
        description: `Orçamento #${String(q.id).padStart(
          4,
          "0",
        )} agora é ${status}`,
        color: "success",
      });
      await refreshQuotes();
      return true;
    } catch (e: any) {
      toast.add({
        title: "Erro ao atualizar status",
        description: getApiError(e),
        color: "error",
      });
      return false;
    } finally {
      isUpdatingStatus.value = null;
    }
  };

  // ─────────────────────────────────────────────
  // Cancel
  // ─────────────────────────────────────────────
  const isCancelModalOpen = ref(false);
  const cancelTarget = ref<Quote | null>(null);
  const cancelReason = ref("");
  const loadingCancel = ref(false);

  const openCancelConfirm = (q: Quote) => {
    cancelTarget.value = q;
    cancelReason.value = "";
    isCancelModalOpen.value = true;
  };

  const handleCancel = async () => {
    if (!cancelTarget.value) return;
    loadingCancel.value = true;
    try {
      await $fetch(`/api/quotes/${cancelTarget.value.id}`, {
        method: "PUT",
        body: {
          status: "rejected",
          ...(cancelReason.value.trim()
            ? { notes: cancelReason.value.trim() }
            : {}),
        },
      });
      toast.add({
        title: "Orçamento cancelado",
        description: `Orçamento #${String(cancelTarget.value.id).padStart(4, "0")} foi cancelado.`,
        color: "warning",
        icon: "i-heroicons-no-symbol",
      });
      isCancelModalOpen.value = false;
      await refreshQuotes();
    } catch (e: any) {
      toast.add({
        title: "Erro ao cancelar",
        description: getApiError(e),
        color: "error",
      });
    } finally {
      loadingCancel.value = false;
      cancelTarget.value = null;
      cancelReason.value = "";
    }
  };

  return {
    quotes,
    products,
    companiesList,
    sellersList,
    mixDesigns,
    paymentMethodsList,
    driversList,
    pumpersList,
    knownCustomers,
    loadingQuotes,
    refreshQuotes,
    refreshDrivers,
    refreshPumpers,
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
    isUpdatingStatus,
    confirmDelete,
    handleDelete,
    updateStatus,
    // Cancel
    isCancelModalOpen,
    cancelTarget,
    cancelReason,
    loadingCancel,
    openCancelConfirm,
    handleCancel,
    // Logistics Repass
    driverOptions,
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

    STATUS_OPTS,
    statusConfig,
  };
};
