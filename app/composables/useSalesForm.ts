import type {
  Sale,
  FormItem,
  SaleStatus,
  KnownCustomer,
  Product,
  Company,
  Quote,
  MixDesign,
} from "../types/sales";
import { formatISO } from "date-fns";
import { getApiError } from "~/utils/errors";

export const useSalesForm = (options: {
  refreshSales: () => Promise<void>;
  products: ComputedRef<Product[]>;
  companiesList: ComputedRef<Company[]>;
  knownCustomers: ComputedRef<KnownCustomer[]>;
  mixDesigns: ComputedRef<MixDesign[]>;
  driverOptions: ComputedRef<any[]>;
}) => {
  const {
    refreshSales,
    products,
    companiesList,
    knownCustomers,
    mixDesigns,
    driverOptions,
  } = options;
  const { companyId } = useAuth();
  const toast = useToast();

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  const isDrawerOpen = ref(false);
  const isEditing = ref(false);
  const loadingSave = ref(false);
  const editingId = ref<number | null>(null);
  const linkedQuoteId = ref<number | null>(null);
  const isSendingPdf = ref<number | null>(null);

  const makeNewItem = (): FormItem => ({
    _key: Date.now() + Math.random(),
    productId: null,
    productName: "",
    description: "",
    unit: "m3",
    quantity: 1,
    unitPrice: 0,
    fck: null,
    slump: null,
    stoneSize: "",
    mixDesignId: null,
  });

  const form = reactive({
    customerName: "",
    customerDocument: "",
    customerPhone: "",
    customerAddress: "",
    sellerId: null as number | null,
    driverIds: [] as number[],
    pumperId: null as number | null,
    status: "pending" as SaleStatus,
    date: formatISO(new Date(), { representation: "date" }),
    deliveryDate: "",
    discount: 0, // BRL float
    paymentMethod: "",
    notes: "",
    items: [makeNewItem()] as FormItem[],
  });

  const customerSearchTerm = ref("");
  const selectedCustomer = ref<KnownCustomer | undefined>(undefined);
  const customerRegisteredAddress = ref("");
  const useDeliveryAddress = ref(false);

  // Validation State
  const formErrors = reactive<Record<string, string>>({});

  // ─────────────────────────────────────────────
  // Watchers
  // ─────────────────────────────────────────────
  watch(selectedCustomer, (newVal) => {
    if (newVal) {
      form.customerName = newVal.name;
      form.customerDocument = newVal.document ?? "";
      form.customerPhone = newVal.phone ?? "";

      // Clear validation error for customer name
      if (formErrors.customerName) {
        delete formErrors.customerName;
      }

      // Update registered address info
      customerRegisteredAddress.value = newVal.address ?? "";

      // If we're not using a custom delivery address, sync the form address
      if (!useDeliveryAddress.value) {
        form.customerAddress = newVal.address ?? "";
      }
    }
  });

  watch(useDeliveryAddress, (val) => {
    if (!val && selectedCustomer.value) {
      // If turning off delivery address, revert to registered address
      form.customerAddress = selectedCustomer.value.address ?? "";
    }
  });

  const clearErrors = () => {
    for (const key in formErrors) {
      delete formErrors[key];
    }
  };

  const validateForm = (): boolean => {
    clearErrors();
    let isValid = true;

    // Client validation
    if (!form.customerName || form.customerName.trim().length < 3) {
      formErrors.customerName = "O nome deve ter pelo menos 3 caracteres.";
      isValid = false;
    }

    // Items validation
    form.items.forEach((it, index) => {
      if (!it.productName || !it.productName.trim()) {
        formErrors[`items_${index}_productName`] = "Produto é obrigatório.";
        isValid = false;
      }
      if (it.quantity <= 0) {
        formErrors[`items_${index}_quantity`] = "Qtd deve ser maior que zero.";
        isValid = false;
      }
      if (it.unitPrice < 0) {
        formErrors[`items_${index}_unitPrice`] = "Preço não pode ser negativo.";
        isValid = false;
      }
    });

    if (form.discount < 0) {
      formErrors.discount = "O desconto não pode ser negativo.";
      isValid = false;
    }

    return isValid;
  };

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const resetForm = () => {
    clearErrors();
    editingId.value = null;
    linkedQuoteId.value = null;
    isEditing.value = false;
    form.customerName = "";
    form.customerDocument = "";
    form.customerPhone = "";
    form.customerAddress = "";
    form.sellerId = null;
    form.driverIds = [];
    form.pumperId = null;
    form.status = "pending";
    form.date = formatISO(new Date(), { representation: "date" });
    form.deliveryDate = "";
    form.discount = 0;
    form.paymentMethod = "";
    form.notes = "";
    form.items = [makeNewItem()];
    customerSearchTerm.value = "";
    selectedCustomer.value = undefined;
    customerRegisteredAddress.value = "";
    useDeliveryAddress.value = false;
    isSendingPdf.value = null;
  };

  const mapApiItemsToForm = (items: any[]): FormItem[] => {
    if (!items?.length) return [makeNewItem()];
    return items.map((it) => ({
      _key: Date.now() + Math.random(),
      productId: it.productId ?? null,
      productName: it.productName,
      description: it.description ?? "",
      unit: it.unit ?? "m3",
      quantity: it.quantity,
      unitPrice: it.unitPrice / 100,
      fck: it.fck ?? null,
      slump: it.slump ?? null,
      stoneSize: it.stoneSize ?? "",
      mixDesignId: it.mixDesignId ?? null,
    }));
  };

  const openCreate = () => {
    resetForm();
    isDrawerOpen.value = true;
  };

  const openEdit = (s: Sale) => {
    resetForm();
    isEditing.value = true;
    editingId.value = s.id;
    linkedQuoteId.value = s.quoteId ?? null;

    form.customerName = s.customerName;
    form.customerDocument = s.customerDocument ?? "";
    form.customerPhone = s.customerPhone ?? "";
    form.customerAddress = s.customerAddress ?? "";
    form.sellerId = s.sellerId ?? null;
    form.driverIds = s.drivers?.map((d: any) => d.driverId) ?? [];
    form.pumperId = s.pumperId ?? null;

    const matchedCustomer = knownCustomers.value.find(
      (c) =>
        (s.customerDocument && c.document === s.customerDocument) ||
        c.name === s.customerName
    );
    selectedCustomer.value =
      matchedCustomer ??
      (s.customerName
        ? {
            id: `edit-${s.id}`,
            label: s.customerName,
            name: s.customerName,
            document: s.customerDocument ?? "",
            phone: s.customerPhone ?? "",
            address: s.customerAddress ?? "",
            source: "sale" as const,
          }
        : undefined);
    customerSearchTerm.value = "";

    const matchedCompany = companiesList.value.find(
      (c) => c.document === s.customerDocument || c.name === s.customerName
    );
    if (matchedCompany) {
      const fullAddr = [
        matchedCompany.address,
        matchedCompany.city,
        matchedCompany.state,
      ]
        .filter(Boolean)
        .join(", ");
      customerRegisteredAddress.value = fullAddr;
      useDeliveryAddress.value =
        !!s.customerAddress && s.customerAddress !== fullAddr;
    } else {
      customerRegisteredAddress.value = s.customerAddress ?? "";
      useDeliveryAddress.value = false;
    }
    form.status = s.status;
    form.date = s.date
      ? new Date(s.date).toLocaleDateString("sv")
      : new Date().toLocaleDateString("sv");
    form.deliveryDate = s.deliveryDate
      ? new Date(s.deliveryDate).toLocaleDateString("sv")
      : "";
    form.discount = s.discount / 100;
    form.paymentMethod = s.paymentMethod ?? "";
    form.notes = s.notes ?? "";
    form.items = mapApiItemsToForm(s.items);
    isDrawerOpen.value = true;
  };

  const prefillFromQuote = async (quoteId: number) => {
    try {
      const res = await $fetch<{ quote: Quote }>(`/api/quotes/${quoteId}`);
      const q = res?.quote;
      if (!q) return;
      linkedQuoteId.value = quoteId;
      form.customerName = q.customerName ?? "";
      form.customerDocument = q.customerDocument ?? "";
      form.customerPhone = q.customerPhone ?? "";
      form.customerAddress = q.customerAddress ?? "";
      form.sellerId = q.sellerId ?? 0;
      form.driverIds =
        q.drivers?.map((d: any) => d.driverId) ?? q.driverIds ?? [];
      form.pumperId = q.pumperId ?? null;
      customerSearchTerm.value = q.customerName ?? "";

      // Try to match with known customers
      const matchedCustomer = knownCustomers.value.find(
        (c) =>
          (q.customerDocument && c.document === q.customerDocument) ||
          c.name === q.customerName
      );
      if (matchedCustomer) {
        selectedCustomer.value = matchedCustomer;
      } else if (q.customerName) {
        selectedCustomer.value = {
          id: `quote-${quoteId}`,
          label: q.customerName,
          name: q.customerName,
          document: q.customerDocument ?? "",
          phone: q.customerPhone ?? "",
          address: q.customerAddress ?? "",
          source: "quote" as const,
        };
      }

      form.discount = (q.discount ?? 0) / 100;
      form.notes = q.notes ?? "";
      form.items = mapApiItemsToForm(q.items);
    } catch (e) {
      console.error("Failed to prefill from quote:", e);
    }
  };

  // ─────────────────────────────────────────────
  // Items management
  // ─────────────────────────────────────────────
  const addItem = () => {
    form.items.push(makeNewItem());
  };

  const removeItem = (idx: number) => {
    if (form.items.length > 1) form.items.splice(idx, 1);
  };

  const onProductSelect = (idx: number, productId: number | null) => {
    const item = form.items[idx];
    if (!item) return;

    item.productId = productId;
    if (!productId) return;

    const prod = products.value.find((p) => p.id === productId);
    if (!prod) return;

    item.productName = prod.name;
    item.description = prod.description ?? "";
    item.unit = prod.unit;
    item.unitPrice = prod.price / 100;
    item.fck = prod.fck ?? null;
    item.slump = prod.slump ?? null;
    item.stoneSize = prod.stoneSize ?? "";
    item.mixDesignId = prod.mixDesignId ?? null;
  };

  const onMixDesignSelect = (idx: number, mixDesignId: number | null) => {
    const item = form.items[idx];
    if (!item) return;

    item.mixDesignId = mixDesignId;
    if (!mixDesignId) return;

    const mix = mixDesigns.value.find((m) => m.id === mixDesignId);
    if (!mix) return;

    item.fck = mix.fck ?? item.fck;
    item.slump = mix.slump ?? item.slump;
    item.stoneSize = mix.stoneSize ?? item.stoneSize;
    if (!item.productName) {
      item.productName = `Concreto Fck ${mix.fck} ${mix.slump} ${mix.stoneSize}`;
    }
  };

  // ─────────────────────────────────────────────
  // Totals
  // ─────────────────────────────────────────────
  const subtotalBRL = computed(() => {
    return form.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0
    );
  });

  const totalBRL = computed(() => {
    return Math.max(0, subtotalBRL.value - (form.discount || 0));
  });

  // ─────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) {
      const errorList = Object.values(formErrors).filter(Boolean);
      toast.add({
        title: "Verifique os campos obrigatórios",
        description:
          errorList.length > 0
            ? errorList.join(" | ")
            : "Por favor, corrija os campos em destaque antes de salvar.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
      return;
    }

    loadingSave.value = true;
    try {
      const payload = {
        companyId: companyId.value,
        quoteId: linkedQuoteId.value || null,
        customerName: form.customerName,
        customerDocument: form.customerDocument || null,
        customerPhone: form.customerPhone || null,
        customerAddress: form.customerAddress || null,
        sellerId: form.sellerId || null,
        driverIds: form.driverIds,
        pumperId: form.pumperId || null,
        status: form.status,
        date: form.date || null,
        deliveryDate: form.deliveryDate || null,
        discount: Math.round(form.discount * 100),
        paymentMethod: form.paymentMethod || null,
        notes: form.notes || null,
        items: form.items.map((it) => ({
          productId: it.productId || null,
          productName: it.productName,
          description: it.description || null,
          unit: it.unit || null,
          quantity: it.quantity,
          unitPrice: Math.round(it.unitPrice * 100),
          fck: it.fck || null,
          slump: it.slump || null,
          stoneSize: it.stoneSize || null,
          mixDesignId: it.mixDesignId || null,
        })),
      };

      if (isEditing.value && editingId.value) {
        await $fetch(`/api/sales/${editingId.value}`, {
          method: "PUT",
          body: payload,
        });
        toast.add({ title: "Venda atualizada com sucesso", color: "success" });
      } else {
        await $fetch("/api/sales", {
          method: "POST",
          body: payload,
        });
        toast.add({ title: "Venda criada com sucesso", color: "success" });
      }

      await refreshSales();
      isDrawerOpen.value = false;
      resetForm();
    } catch (e) {
      toast.add({
        title: "Erro ao salvar venda",
        description: getApiError(e),
        color: "error",
      });
    } finally {
      loadingSave.value = false;
    }
  };

  const sendPdf = async (s: Sale) => {
    if (!s.customerPhone && !s.sellerId) {
      toast.add({
        title: "Dados incompletos",
        description: "Cliente ou vendedor sem telefone/contato para envio.",
        color: "error",
      });
      return;
    }

    isSendingPdf.value = s.id;
    try {
      const res = await $fetch<{ success: boolean; sent: string[] }>(
        `/api/sales/${s.id}/send-pdf`,
        { method: "POST" }
      );
      toast.add({
        title: "PDF Enviado",
        description: `O pedido foi enviado para ${res.sent.length} destinatário(s) via WhatsApp.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      await refreshSales();
    } catch (e: any) {
      toast.add({
        title: "Erro ao enviar",
        description: getApiError(e, "Verifique a integração do WhatsApp."),
        color: "error",
      });
    } finally {
      isSendingPdf.value = null;
    }
  };

  const selectedDriver = computed({
    get: () => {
      const opts = toValue(driverOptions);
      return opts.filter((d) => form.driverIds.includes(d.value));
    },
    set: (val: any[]) => {
      form.driverIds = val.map((v) => v.value);
    },
  });

  return {
    form,
    formErrors,
    isDrawerOpen,
    isEditing,
    loadingSave,
    editingId,
    linkedQuoteId,
    customerSearchTerm,
    selectedCustomer,
    customerRegisteredAddress,
    useDeliveryAddress,
    selectedDriver,
    subtotalBRL,
    totalBRL,

    // Methods
    resetForm,
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
  };
};
