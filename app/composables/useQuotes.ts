import { ref, computed, watch } from "vue";
import { parseDateInputLocal, formatDateInputPtBR } from "~/utils/date-input";
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
import { normalizeQuoteStatus } from "~/utils/status";

// Constantes estáticas fora do escopo do Composable para não alocar memória repetida
export const STATUS_OPTS = [
  { label: "Todos", value: "all" },
  { label: "Rascunho", value: "draft" },
  { label: "Em negociação", value: "negotiation" },
  { label: "Aprovado", value: "approved" },
  { label: "Encerrado", value: "closed" },
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
  negotiation: {
    label: "Em negociação",
    color: "info",
    icon: "i-heroicons-paper-airplane",
  },
  sent: {
    label: "Em negociação",
    color: "info",
    icon: "i-heroicons-paper-airplane",
  },
  approved: {
    label: "Aprovado",
    color: "success",
    icon: "i-heroicons-check-circle",
  },
  closed: {
    label: "Encerrado",
    color: "warning",
    icon: "i-heroicons-no-symbol",
  },
  rejected: {
    label: "Encerrado",
    color: "warning",
    icon: "i-heroicons-no-symbol",
  },
  expired: {
    label: "Encerrado",
    color: "warning",
    icon: "i-heroicons-no-symbol",
  },
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
  const dateStart = ref("");
  const dateEnd = ref("");
  const page = ref(1);
  const pageSize = ref(10);

  const clearFilters = () => {
    search.value = "";
    statusFilter.value = "all";
    dateStart.value = "";
    dateEnd.value = "";
  };

  const getRangeLabel = () => {
    const startLabel = dateStart.value
      ? formatDateInputPtBR(dateStart.value)
      : "início";
    const endLabel = dateEnd.value
      ? formatDateInputPtBR(dateEnd.value)
      : "hoje";
    if (!dateStart.value && !dateEnd.value) return "Todo o período";
    return `Período: ${startLabel} a ${endLabel}`;
  };

  const getRangeSlug = () => {
    if (!dateStart.value && !dateEnd.value) return "todo-periodo";
    const startSlug = dateStart.value || "inicio";
    const endSlug = dateEnd.value || "hoje";
    return `${startSlug}_a_${endSlug}`;
  };

  const filteredQuotes = computed(() => {
    return quotes.value
      .filter((q) => {
        const matchState =
          statusFilter.value === "all" ||
          normalizeQuoteStatus(q.status) ===
            normalizeQuoteStatus(statusFilter.value);
        const searchLower = search.value.toLowerCase();

        const matchSearch =
          !search.value ||
          q.customerName.toLowerCase().includes(searchLower) ||
          String(q.id).includes(search.value) ||
          (q.customerDocument ?? "").includes(search.value);

        const txDate = new Date((q.date ?? q.createdAt) as string | number);
        const startDate = dateStart.value
          ? parseDateInputLocal(dateStart.value)
          : null;
        const endDate = dateEnd.value
          ? parseDateInputLocal(dateEnd.value, { endOfDay: true })
          : null;
        const matchStart = !startDate || txDate >= startDate;
        const matchEnd = !endDate || txDate <= endDate;

        return matchState && matchSearch && matchStart && matchEnd;
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

  watch([search, statusFilter, dateStart, dateEnd], () => {
    page.value = 1;
  });

  const stats = computed(() => {
    const all = quotes.value;
    return {
      total: all.length,
      approved: all.filter((q) => normalizeQuoteStatus(q.status) === "approved")
        .length,
      pending: all.filter((q) => {
        const status = normalizeQuoteStatus(q.status);
        return status === "draft" || status === "negotiation";
      }).length,
      totalValue: all
        .filter((q) => normalizeQuoteStatus(q.status) === "approved")
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
          status: "closed",
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

  // ─────────────────────────────────────────────
  // CSV Export for filtered items
  // ─────────────────────────────────────────────
  const exportFilteredCsv = () => {
    if (typeof window === "undefined" || filteredQuotes.value.length === 0)
      return;

    const escape = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = ["id", "cliente", "data", "status", "total_centavos"];
    const lines = filteredQuotes.value.map((q) => {
      const normalizedStatus = normalizeQuoteStatus(q.status);
      const statusLabel =
        statusConfig[q.status as keyof typeof statusConfig]?.label ||
        statusConfig[normalizedStatus as keyof typeof statusConfig]?.label ||
        normalizedStatus;
      return [
        q.id,
        q.id,
        q.customerName,
        formatDateNumeric(q.date),
        statusLabel,
        q.total ?? 0,
      ]
        .map(escape)
        .join(",");
    });

    const csv = [`"${getRangeLabel()}"`, header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orcamentos-${getRangeSlug()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFilteredExcel = async () => {
    if (filteredQuotes.value.length === 0) {
      toast.add({
        title: "Sem dados",
        description: "Não há registros para exportar.",
        color: "warning",
      });
      return;
    }

    const { utils, writeFile } = await import("xlsx");

    const rows = filteredQuotes.value.map((q) => ({
      ID: q.id,
      Data: formatDateNumeric(q.date),
      Cliente: q.customerName,
      "Documento/Contato": q.customerDocument || q.customerPhone || "",
      Status:
        statusConfig[q.status as keyof typeof statusConfig]?.label || q.status,
      "Total (R$)": q.total / 100,
      Vendedor: (q as any).seller?.name || "",
      "Validade (dias)": (q as any).validityDays || 0,
    }));

    const worksheet = utils.aoa_to_sheet([["Período", getRangeLabel()], []]);
    utils.sheet_add_json(worksheet, rows, { origin: "A3" });
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Orçamentos");

    writeFile(
      workbook,
      `orcamentos-${getRangeSlug()}-${formatISODate(new Date())}.xlsx`,
    );
  };

  const exportFilteredPdf = async () => {
    if (filteredQuotes.value.length === 0) {
      toast.add({
        title: "Sem dados",
        description: "Não há registros para exportar.",
        color: "warning",
      });
      return;
    }

    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF() as any;
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;

    const fmtCurrency = (cents: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(cents / 100);

    const rows = filteredQuotes.value;

    // Watermark
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(60);
    doc.setFont("helvetica", "bold");
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
    doc.text("MEU CONCRETO", pw / 2, ph / 2, { align: "center", angle: 45 });
    doc.restoreGraphicsState();

    // Header brand block
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(15, 15, 10, 10, 2, 2, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.line(17.5, 20.5, 22.5, 20.5);
    doc.line(19.5, 18.5, 20.5, 18.5);
    doc.line(19, 18, 21, 18);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("MEU", 28, 20.5);
    doc.setTextColor(34, 197, 94);
    doc.text("CONCRETO", 40.5, 20.5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(161, 161, 170);
    doc.text("OPERATIONAL SYSTEM", 28, 24.5, { charSpace: 0.5 });

    // Report title
    doc.setTextColor(24, 24, 27);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE ORÇAMENTOS", pw - 15, 20.5, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text(`Gerado em: ${formatISODate(new Date())}`, pw - 15, 25.5, {
      align: "right",
    });
    doc.text(getRangeLabel(), pw - 15, 29.5, { align: "right" });

    // Divider
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.1);
    doc.line(15, 32, pw - 15, 32);

    // Table
    autoTable(doc, {
      startY: 37,
      head: [["ID", "DATA", "CLIENTE", "STATUS", "VENDEDOR", "TOTAL"]],
      body: rows.map((q) => [
        `#${q.id}`,
        formatDateNumeric(q.date),
        q.customerName.toUpperCase(),
        (
          statusConfig[q.status as keyof typeof statusConfig]?.label || q.status
        ).toUpperCase(),
        ((q as any).seller?.name || "—").toUpperCase(),
        fmtCurrency(q.total),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 4,
      },
      styles: {
        fontSize: 7,
        cellPadding: 3.5,
        font: "helvetica",
        textColor: [63, 63, 70],
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text(`Total de registros: ${rows.length}`, 15, finalY + 8);

    doc.save(`orcamentos-${getRangeSlug()}-${formatISODate(new Date())}.pdf`);
    toast.add({
      title: "PDF gerado",
      description: "Relatório baixado com sucesso.",
      color: "success",
      icon: "i-heroicons-arrow-down-tray",
    });
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
    dateStart,
    dateEnd,
    clearFilters,
    exportFilteredCsv,
    exportFilteredExcel,
    exportFilteredPdf,
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
