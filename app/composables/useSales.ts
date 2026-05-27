import type {
  Sale,
  Product,
  Company,
  PaymentMethod,
  Seller,
  Driver,
  Pumper,
  SaleStatus,
  SaleStatusFilter,
  MixDesign,
} from "../types/sales";
import { normalizeSaleStatus } from "~/utils/status";
import {
  parseDateInputLocal,
  parseItemDate,
  formatDateInputPtBR,
} from "~/utils/date-input";
import { isBefore, isAfter, startOfDay, endOfDay } from "date-fns";

export const useSales = () => {
  const { companyId } = useAuth();

  // ─────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────
  const {
    data: dashboardPayload,
    refresh: refreshSales,
    pending: loadingSales,
  } = useAsyncData(
    `sales-dashboard-${companyId.value}`,
    async () => {
      if (!companyId.value) {
        return {
          sales: [],
          products: [],
          companies: [],
          paymentMethods: [],
          sellers: [],
          mixDesigns: [],
        };
      }

      const [
        salesRes,
        productsRes,
        companiesRes,
        paymentMethodsRes,
        sellersRes,
        mixRes,
      ] = await Promise.all([
        $fetch<{ sales: Sale[] }>("/api/sales", {
          query: { companyId: companyId.value },
        }),
        $fetch<{ products: Product[] }>("/api/products", {
          query: { companyId: companyId.value },
        }),
        $fetch<{ companies: Company[] }>("/api/companies", {
          query: { companyId: companyId.value },
        }),
        $fetch<{ paymentMethods: PaymentMethod[] }>("/api/payment-methods", {
          query: { companyId: companyId.value, active: true },
        }),
        $fetch<{ sellers: Seller[] }>("/api/sellers", {
          query: { companyId: companyId.value, active: true },
        }),
        $fetch<{ mixDesigns: MixDesign[] }>("/api/mix-designs", {
          query: { companyId: companyId.value },
        }),
      ]);

      return {
        sales: salesRes.sales || [],
        products: productsRes.products || [],
        companies: companiesRes.companies || [],
        paymentMethods: paymentMethodsRes.paymentMethods || [],
        sellers: sellersRes.sellers || [],
        mixDesigns: mixRes.mixDesigns || [],
      };
    },
    { watch: [companyId] },
  );

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

  // ─────────────────────────────────────────────
  // Computed Lists
  // ─────────────────────────────────────────────
  const sales = computed(() => dashboardPayload.value?.sales ?? []);
  const products = computed(() => dashboardPayload.value?.products ?? []);
  const companiesList = computed(() => dashboardPayload.value?.companies ?? []);
  const paymentMethods = computed(
    () => dashboardPayload.value?.paymentMethods ?? [],
  );
  const sellersList = computed(() => dashboardPayload.value?.sellers ?? []);
  const mixDesigns = computed(() => dashboardPayload.value?.mixDesigns ?? []);

  // ─────────────────────────────────────────────
  // Known Customers (from companies + past sales)
  // ─────────────────────────────────────────────
  const { knownCustomers } = useKnownCustomers(companiesList, sales, "sale");

  // ─────────────────────────────────────────────
  // Filters & Search
  // ─────────────────────────────────────────────
  const search = ref("");
  const statusFilter = ref<SaleStatusFilter>("all");
  const dateStart = ref<string>("");
  const dateEnd = ref<string>("");
  const page = ref(1);
  const pageSize = ref(10);

  const filteredSales = computed(() => {
    return sales.value
      .filter((s) => {
        const canonicalStatus = normalizeSaleStatus(s.status);
        const matchState =
          statusFilter.value === "all" ||
          canonicalStatus === normalizeSaleStatus(statusFilter.value);
        const matchSearch =
          !search.value ||
          s.customerName.toLowerCase().includes(search.value.toLowerCase()) ||
          String(s.id).includes(search.value) ||
          (s.customerDocument ?? "").includes(search.value);

        // Filtro de data (usa a data da venda s.date, fallback para s.createdAt)
        let matchDate = true;
        const targetDate = s.date || s.createdAt;
        const itemDate = parseItemDate(targetDate);
        if (itemDate) {
          if (dateStart.value) {
            const startLimit = parseDateInputLocal(dateStart.value);
            if (startLimit)
              matchDate = matchDate && !isBefore(itemDate, startLimit);
          }
          if (dateEnd.value) {
            const endLimit = parseDateInputLocal(dateEnd.value, {
              endOfDay: true,
            });
            if (endLimit) matchDate = matchDate && !isAfter(itemDate, endLimit);
          }
        }

        return matchState && matchSearch && matchDate;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  });

  const paginatedSales = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filteredSales.value.slice(start, start + pageSize.value);
  });

  const totalPages = computed(() =>
    Math.ceil(filteredSales.value.length / pageSize.value),
  );

  watch([search, statusFilter, dateStart, dateEnd], () => {
    page.value = 1;
  });

  const clearFilters = () => {
    search.value = "";
    statusFilter.value = "all";
    dateStart.value = "";
    dateEnd.value = "";
    page.value = 1;
  };

  const exportFilteredCsv = () => {
    if (typeof window === "undefined" || filteredSales.value.length === 0)
      return;

    const escape = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = ["id", "cliente", "data", "status", "total_centavos"];
    const lines = filteredSales.value.map((s) =>
      [
        s.id,
        s.customerName,
        formatDateNumeric(s.date),
        normalizeSaleStatus(s.status),
        s.total ?? 0,
      ]
        .map(escape)
        .join(","),
    );

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas-filtradas-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────
  // Summary Stats
  // ─────────────────────────────────────────────
  const stats = computed(() => {
    const all = sales.value;
    return {
      total: all.length,
      inProgress: all.filter((s) => {
        const status = normalizeSaleStatus(s.status);
        return status === "open" || status === "in_progress";
      }).length,
      completed: all.filter(
        (s) => normalizeSaleStatus(s.status) === "completed",
      ).length,
      totalValue: all
        .filter((s) => normalizeSaleStatus(s.status) !== "cancelled")
        .reduce((sum, s) => sum + s.total, 0),
    };
  });

  // ─────────────────────────────────────────────
  // Actions State
  // ─────────────────────────────────────────────
  const isDeleteModalOpen = ref(false);
  const deleteTarget = ref<Sale | null>(null);
  const loadingDelete = ref(false);

  const billingDialog = ref(false);
  const billingSale = ref<Sale | null>(null);
  const billingForm = reactive({
    paymentMethod: undefined as string | undefined,
    status: "paid" as "paid" | "pending",
  });

  const toast = useToast();

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────
  const openDeleteConfirm = (s: Sale) => {
    deleteTarget.value = s;
    isDeleteModalOpen.value = true;
  };

  const handleDelete = async () => {
    if (!deleteTarget.value) return;
    loadingDelete.value = true;
    try {
      await $fetch(`/api/sales/${deleteTarget.value.id}`, { method: "DELETE" });
      toast.add({ title: "Venda excluída com sucesso", color: "success" });
      isDeleteModalOpen.value = false;
      await refreshSales();
    } catch (e) {
      toast.add({
        title: "Erro ao excluir venda",
        description: getApiError(e),
        color: "error",
      });
    } finally {
      loadingDelete.value = false;
    }
  };

  const updateStatus = async (s: Sale, next: SaleStatus) => {
    try {
      await $fetch(`/api/sales/${s.id}`, {
        method: "PUT",
        body: { status: next },
      });
      toast.add({
        title: "Status atualizado",
        description: `Venda #${String(s.id).padStart(
          4,
          "0",
        )} agora está ${next}`,
        color: "success",
      });
      await refreshSales();
    } catch (e) {
      toast.add({
        title: "Erro ao atualizar status",
        description: getApiError(e),
        color: "error",
      });
    }
  };

  const openBilling = (s: Sale) => {
    billingSale.value = s;
    billingForm.paymentMethod = s.paymentMethod || undefined;
    billingForm.status = "paid";
    billingDialog.value = true;
  };

  // ─────────────────────────────────────────────
  // Cancel
  // ─────────────────────────────────────────────
  const isCancelModalOpen = ref(false);
  const cancelTarget = ref<Sale | null>(null);
  const cancelReason = ref("");
  const loadingCancel = ref(false);

  const openCancelConfirm = (s: Sale) => {
    cancelTarget.value = s;
    cancelReason.value = "";
    isCancelModalOpen.value = true;
  };

  const handleCancel = async () => {
    if (!cancelTarget.value) return;
    loadingCancel.value = true;
    try {
      await $fetch(`/api/sales/${cancelTarget.value.id}`, {
        method: "PUT",
        body: {
          status: "cancelled",
          ...(cancelReason.value.trim()
            ? { notes: cancelReason.value.trim() }
            : {}),
        },
      });
      toast.add({
        title: "Venda cancelada",
        description: `Venda #${String(cancelTarget.value.id).padStart(4, "0")} foi cancelada.`,
        color: "warning",
        icon: "i-heroicons-no-symbol",
      });
      isCancelModalOpen.value = false;
      await refreshSales();
    } catch (e) {
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

  const handleBill = async () => {
    if (!billingSale.value) return;
    try {
      await $fetch(`/api/sales/${billingSale.value.id}/bill`, {
        method: "POST",
        body: {
          paymentMethod: billingForm.paymentMethod,
          status: billingForm.status,
        },
      });
      toast.add({ title: "Venda faturada com sucesso", color: "success" });
      billingDialog.value = false;
      await refreshSales();
    } catch (e) {
      toast.add({
        title: "Erro ao faturar venda",
        description: getApiError(e),
        color: "error",
      });
    }
  };

  // ─────────────────────────────────────────────
  // Delivery Date
  // ─────────────────────────────────────────────
  const isDeliveryModalOpen = ref(false);
  const deliveryTarget = ref<Sale | null>(null);
  const deliveryDateInput = ref("");
  const loadingDelivery = ref(false);

  const openDeliveryChange = (s: Sale) => {
    deliveryTarget.value = s;
    deliveryDateInput.value = formatISODate(
      s.deliveryDate || s.date || new Date(),
    );
    isDeliveryModalOpen.value = true;
  };

  const handleUpdateDelivery = async () => {
    if (!deliveryTarget.value || !deliveryDateInput.value) return;
    loadingDelivery.value = true;
    try {
      await $fetch(`/api/sales/${deliveryTarget.value.id}`, {
        method: "PUT",
        body: {
          deliveryDate: deliveryDateInput.value,
        },
      });
      toast.add({
        title: "Data de entrega atualizada",
        description: `Nova data: ${formatDateInputPtBR(deliveryDateInput.value)}`,
        color: "success",
        icon: "i-heroicons-calendar-days",
      });
      isDeliveryModalOpen.value = false;
      await refreshSales();
    } catch (e) {
      toast.add({
        title: "Erro ao atualizar data",
        description: getApiError(e),
        color: "error",
      });
    } finally {
      loadingDelivery.value = false;
    }
  };

  const exportFilteredExcel = async () => {
    if (filteredSales.value.length === 0) {
      toast.add({
        title: "Sem dados",
        description: "Não há registros para exportar.",
        color: "warning",
      });
      return;
    }

    const { utils, writeFile } = await import("xlsx");

    const rows = filteredSales.value.map((s) => ({
      ID: s.id,
      Data: formatDateNumeric(s.date),
      Entrega: formatDateNumeric(s.deliveryDate),
      Cliente: (s as any).customerName || "",
      Status:
        statusConfig[s.status as keyof typeof statusConfig]?.label || s.status,
      "Total (R$)": s.total / 100,
      Vendedor: (s as any).seller?.name || "",
      "ID Orçamento": s.quoteId || "",
    }));

    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Vendas");

    writeFile(workbook, `vendas-${formatISODate(new Date())}.xlsx`);
  };

  const exportFilteredPdf = async () => {
    if (filteredSales.value.length === 0) {
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

    const rows = filteredSales.value;

    const periodLabel = (() => {
      const start = dateStart.value;
      const end = dateEnd.value;
      if (start && end) {
        if (start === end) return `Data: ${formatDateInputPtBR(start)}`;
        return `Período: ${formatDateInputPtBR(start)} — ${formatDateInputPtBR(end)}`;
      }
      if (start) return `A partir de: ${formatDateInputPtBR(start)}`;
      if (end) return `Até: ${formatDateInputPtBR(end)}`;

      if (rows.length > 0) {
        const dates = rows
          .map((s) => parseItemDate(s.date || s.createdAt)?.getTime())
          .filter(Boolean) as number[];
        if (dates.length > 0) {
          const min = new Date(Math.min(...dates));
          const max = new Date(Math.max(...dates));
          if (min.toDateString() === max.toDateString())
            return `Data: ${formatDateNumeric(min)}`;
          return `Período: ${formatDateNumeric(min)} — ${formatDateNumeric(max)}`;
        }
      }
      return "Período: Integral";
    })();

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
    doc.text("RELATÓRIO DE VENDAS", pw - 15, 20.5, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text(periodLabel, pw - 15, 25.5, { align: "right" });
    doc.text(
      `Gerado em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`,
      pw - 15,
      30,
      {
        align: "right",
      },
    );

    // Divider
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.1);
    doc.line(15, 38, pw - 15, 38);

    // Table
    autoTable(doc, {
      startY: 42,
      head: [
        [
          "ID",
          "Data",
          "Entrega",
          "Cliente",
          "M³",
          "Pagamento",
          "Status",
          "Total",
        ],
      ],
      body: rows.map((s) => {
        const volumeM3 = s.items
          ? s.items
              .filter((i) => i.countAsConcreteVolume)
              .reduce((sum, i) => sum + i.quantity, 0)
          : 0;

        return [
          `#${s.id}`,
          formatDateNumeric(s.date),
          formatDateNumeric(s.deliveryDate),
          (s as any).customerName || "",
          volumeM3 > 0 ? volumeM3.toFixed(2) : "-",
          s.paymentMethod || "-",
          (
            statusConfig[s.status as keyof typeof statusConfig]?.label ||
            s.status
          ).toUpperCase(),
          fmtCurrency(s.total),
        ];
      }),
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
      columnStyles: {
        4: { halign: "center" },
        7: { halign: "right" },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text(`Total de registros: ${rows.length}`, 15, finalY + 8);

    doc.save(`vendas-${formatISODate(new Date())}.pdf`);
    toast.add({
      title: "PDF gerado",
      description: "Relatório baixado com sucesso.",
      color: "success",
      icon: "i-heroicons-arrow-down-tray",
    });
  };

  return {
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
    filteredSales,
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
    // Cancel
    isCancelModalOpen,
    cancelTarget,
    cancelReason,
    loadingCancel,
    openCancelConfirm,
    handleCancel,
    // Delivery
    isDeliveryModalOpen,
    deliveryTarget,
    deliveryDateInput,
    loadingDelivery,
    openDeliveryChange,
    handleUpdateDelivery,
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
  };
};
