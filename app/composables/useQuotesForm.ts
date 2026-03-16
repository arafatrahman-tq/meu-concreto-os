import { ref, reactive, computed, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";
import type {
  Sale,
  FormItem,
  SaleStatus,
  QuoteStatus,
  KnownCustomer,
  Product,
  Company,
  Quote,
  MixDesign,
} from "~/types/sales";
import { formatISO } from "date-fns";
import { maskDocument, maskPhone } from "~/utils/formatters";
import { getApiError } from "~/utils/errors";

// 1. Tipagem das "Options" em uma Interface Nativa (Boas Práticas VueUse)
export interface UseQuotesFormOptions {
  refreshQuotes: () => Promise<void>;
  products: MaybeRefOrGetter<Product[]>;
  companiesList: MaybeRefOrGetter<Company[]>;
  knownCustomers: MaybeRefOrGetter<KnownCustomer[]>;
  mixDesigns: MaybeRefOrGetter<MixDesign[]>;
  driverOptions: MaybeRefOrGetter<any[]>;
  pumperOptions: MaybeRefOrGetter<any[]>;
  onCreateDriver: (name: string) => void;
  onDeleteDriver: (d: any) => void;
  onCreatePumper: (name: string) => void;
  onDeletePumper: (p: any) => void;
  handleConfirmDelete: () => void;
  handleConfirmCreate: () => void;
  isConfirmDeleteModalOpen: MaybeRefOrGetter<boolean>;
  confirmDeleteData: MaybeRefOrGetter<any>;
  isDeleting: MaybeRefOrGetter<boolean>;
  isConfirmCreateModalOpen: MaybeRefOrGetter<boolean>;
  confirmCreateData: MaybeRefOrGetter<any>;
  isCreating: MaybeRefOrGetter<boolean>;
  paymentMethods?: MaybeRefOrGetter<any[]>;
}

export const useQuotesForm = (options: UseQuotesFormOptions) => {
  const { companyId, user } = useAuth();
  const toast = useToast();
  const isManagerOrAdmin = computed(
    () => user.value?.role === "admin" || user.value?.role === "manager",
  );
  const canEditSensitiveFields = computed(
    () =>
      isManagerOrAdmin.value ||
      restrictedEditBaseline.value?.status === "draft",
  );

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  const isDrawerOpen = ref(false);
  const isEditing = ref(false);
  const loadingSave = ref(false);
  const editingId = ref<number | null>(null);
  const linkedQuoteId = ref<number | null>(null);
  const isSendingPdf = ref<number | null>(null);
  const restrictedEditBaseline = ref<{
    status: QuoteStatus;
    discount: number;
    itemsSignature: string;
  } | null>(null);

  const buildItemsSignature = (items: FormItem[]) =>
    JSON.stringify(
      items.map((it) => ({
        productId: it.productId ?? null,
        productName: it.productName,
        description: it.description ?? "",
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        fck: it.fck ?? null,
        slump: it.slump ?? null,
        stoneSize: it.stoneSize ?? "",
        mixDesignId: it.mixDesignId ?? null,
      })),
    );

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
    status: "draft" as QuoteStatus,
    date: formatISO(new Date(), { representation: "date" }),
    validUntil: "",
    discount: 0, // BRL float
    paymentMethod: "",
    paymentMethod2: "",
    notes: "",
    items: [makeNewItem()] as FormItem[],
  });

  const customerSearchTerm = ref("");
  const selectedCustomer = ref<KnownCustomer | undefined>(undefined);
  const selectedDriver = computed({
    get: () => {
      const opts = toValue(options.driverOptions);
      return opts.filter((d) => form.driverIds.includes(d.value));
    },
    set: (val: any[]) => {
      form.driverIds = val.map((v) => v.value);
    },
  });
  const selectedPumper = ref<any>(null);
  const useDeliveryAddress = ref(false);
  const customerRegisteredAddress = ref("");

  // Validation State
  const formErrors = reactive<Record<string, string>>({});

  // ─────────────────────────────────────────────
  // Watchers
  // ─────────────────────────────────────────────
  watch(selectedCustomer, (newVal) => {
    if (newVal) {
      form.customerName = newVal.name;
      // Use unscope if the document has the @companyId suffix
      const doc = newVal.document ?? "";
      form.customerDocument = doc.includes("@") ? doc.split("@")[0]! : doc;
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
      formErrors.discount = "Desconto não pode ser negativo.";
      isValid = false;
    }

    return isValid;
  };

  // ─────────────────────────────────────────────
  // Computed (Calculated totals)
  // ─────────────────────────────────────────────
  const subtotalBRL = computed(() =>
    form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );

  const totalBRL = computed(() => {
    const t = subtotalBRL.value - form.discount;
    return t > 0 ? t : 0;
  });

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  // Handlers para Auto-preenchimento
  const onProductSelect = (index: number, productId: number | null) => {
    const item = form.items[index];
    if (!item) return;

    item.productId = productId;
    if (!productId) return;

    // Ler dinamicamente da dependência injetada
    const prdList = toValue(options.products) || [];
    const p = prdList.find((x) => x.id === productId);

    if (p) {
      item.productName = p.name;
      item.unitPrice = p.price / 100; // price is in cents
      item.unit = p.unit;
      item.description = p.description || "";
      item.fck = p.fck ?? null;
      item.slump = p.slump ?? null;
      item.stoneSize = p.stoneSize ?? "";
      item.mixDesignId = p.mixDesignId ?? null;
    }
  };

  const onMixDesignSelect = (index: number, mixDesignId: number | null) => {
    const item = form.items[index];
    if (!item) return;

    item.mixDesignId = mixDesignId;
    if (!mixDesignId) return;

    // Ler dinamicamente da dependência injetada
    const mixList = toValue(options.mixDesigns) || [];
    const m = mixList.find((x) => x.id === mixDesignId);

    if (m) {
      item.fck = m.fck ?? null;
      item.slump = m.slump ?? null;
      item.stoneSize = m.stoneSize ?? "";
      if (!item.productName) {
        item.productName = `Concreto Fck ${m.fck} ${m.slump} ${m.stoneSize}`;
      }
    }
  };

  const onCustomerSelect = (kc: KnownCustomer) => {
    selectedCustomer.value = kc;
    customerSearchTerm.value = kc.name;
  };

  const resetForm = () => {
    clearErrors();
    form.customerName = "";
    form.customerDocument = "";
    form.customerPhone = "";
    form.customerAddress = "";
    form.sellerId = null;
    form.driverIds = [];
    form.pumperId = null;
    form.status = "draft";
    form.date = formatISO(new Date(), { representation: "date" });
    form.validUntil = "";
    form.discount = 0;
    form.paymentMethod = "";
    form.paymentMethod2 = "";
    form.notes = "";
    form.items = [makeNewItem()];
    selectedCustomer.value = undefined;
    customerSearchTerm.value = "";
    customerRegisteredAddress.value = "";
    useDeliveryAddress.value = false;
    linkedQuoteId.value = null;
    restrictedEditBaseline.value = null;
  };

  const openCreate = () => {
    isEditing.value = false;
    editingId.value = null;
    resetForm();
    // Auto-fill default payment methods if configured
    const pmList = toValue(options.paymentMethods) || [];
    const def1 = pmList.find((m: any) => m.isDefault);
    const def2 = pmList.find((m: any) => m.isDefault2);
    if (def1) form.paymentMethod = def1.name;
    if (def2) form.paymentMethod2 = def2.name;
    restrictedEditBaseline.value = null;
    isDrawerOpen.value = true;
  };

  const openEdit = (s: Quote) => {
    isEditing.value = true;
    editingId.value = s.id;
    clearErrors();

    form.customerName = s.customerName;
    form.customerDocument = s.customerDocument ?? "";
    form.customerPhone = s.customerPhone ?? "";
    form.customerAddress = s.customerAddress ?? "";
    form.sellerId = s.sellerId ?? null;
    form.driverIds = s.drivers?.map((d: any) => d.driverId) ?? [];
    form.pumperId = s.pumperId ?? null;
    form.status = s.status;

    // Safety check for date strings
    const dateStr = s.date ? String(s.date) : "";
    form.date = dateStr.includes("T")
      ? (dateStr.split("T")[0] ?? dateStr)
      : dateStr;

    const validUntilStr = s.validUntil ? String(s.validUntil) : "";
    form.validUntil = validUntilStr.includes("T")
      ? (validUntilStr.split("T")[0] ?? validUntilStr)
      : validUntilStr;

    form.discount = (s.discount ?? 0) / 100; // Cents to Real
    form.paymentMethod = (s as any).paymentMethod ?? "";
    form.paymentMethod2 = (s as any).paymentMethod2 ?? "";
    form.notes = s.notes ?? "";
    linkedQuoteId.value = s.id;

    form.items = s.items.map((it: any) => ({
      _key: Date.now() + Math.random(),
      productId: it.productId ?? null,
      productName: it.productName,
      description: it.description ?? "",
      unit: it.unit ?? "m3",
      quantity: it.quantity,
      unitPrice: (it.unitPrice || 0) / 100, // Cents to Real
      fck: it.fck ?? null,
      slump: it.slump ?? null,
      stoneSize: it.stoneSize ?? "",
      mixDesignId: it.mixDesignId ?? null,
    }));

    restrictedEditBaseline.value = {
      status: s.status,
      discount: (s.discount ?? 0) / 100,
      itemsSignature: buildItemsSignature(form.items),
    };

    // Find known customer dynamically
    const kList = toValue(options.knownCustomers) || [];
    const match =
      kList.find(
        (kc) =>
          kc.document === s.customerDocument && kc.name === s.customerName,
      ) || kList.find((kc) => kc.name === s.customerName);

    if (match) {
      selectedCustomer.value = match;
      customerSearchTerm.value = match.name;
    } else {
      selectedCustomer.value = undefined;
      customerSearchTerm.value = s.customerName;
    }

    useDeliveryAddress.value = !!(
      s.customerAddress &&
      match &&
      s.customerAddress !== match.address
    );
    isDrawerOpen.value = true;
  };

  const addItem = () => {
    form.items.push(makeNewItem());
  };

  const removeItem = (idx: number) => {
    form.items.splice(idx, 1);
    if (form.items.length === 0) {
      form.items.push(makeNewItem());
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      const errorList = Object.values(formErrors).filter(Boolean);
      toast.add({
        title: "Campos obrigatórios",
        description:
          errorList.length > 0
            ? errorList.join(" | ")
            : "Verifique os erros em vermelho.",
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
        customerDocument: form.customerDocument
          ? form.customerDocument.replace(/\D/g, "")
          : null,
        customerPhone: form.customerPhone
          ? form.customerPhone.replace(/\D/g, "")
          : null,
        customerAddress: form.customerAddress || null,
        sellerId: form.sellerId || null,
        driverIds: form.driverIds,
        pumperId: form.pumperId || null,
        status: form.status,
        validUntil: form.validUntil || null,
        discount: (form.discount || 0) * 100, // Real to Cents
        paymentMethod: form.paymentMethod || null,
        paymentMethod2: form.paymentMethod2 || null,
        notes: form.notes || null,
        items: form.items.map((it) => ({
          productId: it.productId || null,
          productName: it.productName,
          description: it.description || null,
          unit: it.unit || null,
          quantity: it.quantity,
          unitPrice: (it.unitPrice || 0) * 100, // Real to Cents
          fck: it.fck || null,
          slump: it.slump || null,
          stoneSize: it.stoneSize || null,
          mixDesignId: it.mixDesignId || null,
        })),
      };

      const restrictedEditPayload = {
        customerName: payload.customerName,
        customerDocument: payload.customerDocument,
        customerPhone: payload.customerPhone,
        customerAddress: payload.customerAddress,
        sellerId: payload.sellerId,
        driverIds: payload.driverIds,
        pumperId: payload.pumperId,
        validUntil: payload.validUntil,
        paymentMethod: payload.paymentMethod,
        paymentMethod2: payload.paymentMethod2,
        notes: payload.notes,
      };

      if (isEditing.value && editingId.value) {
        if (!canEditSensitiveFields.value && restrictedEditBaseline.value) {
          const hasRestrictedChanges =
            form.status !== restrictedEditBaseline.value.status ||
            form.discount !== restrictedEditBaseline.value.discount ||
            buildItemsSignature(form.items) !==
              restrictedEditBaseline.value.itemsSignature;

          if (hasRestrictedChanges) {
            toast.add({
              title: "Alguns campos não foram aplicados",
              description:
                "Para orçamentos fora de rascunho, itens, desconto e status só podem ser alterados por gerente ou administrador.",
              color: "warning",
              icon: "i-heroicons-lock-closed",
            });
          }
        }

        await $fetch(`/api/quotes/${editingId.value}`, {
          method: "PUT",
          body: canEditSensitiveFields.value ? payload : restrictedEditPayload,
        });
        toast.add({
          title: "Orçamento Atualizado",
          description: "Os dados foram salvos.",
          color: "success",
        });
      } else {
        await $fetch("/api/quotes", {
          method: "POST",
          body: payload,
        });
        toast.add({
          title: "Orçamento Criado",
          description: "O orçamento foi cadastrado com sucesso.",
          color: "success",
        });
      }

      await options.refreshQuotes(); // Execute callback from options
      isDrawerOpen.value = false;
    } catch (e: any) {
      toast.add({
        title: "Erro ao salvar",
        description: getApiError(e, "Tente novamente."),
        color: "error",
      });
    } finally {
      loadingSave.value = false;
    }
  };

  const duplicateQuote = (q: Quote) => {
    resetForm();
    isEditing.value = false;
    editingId.value = null;

    form.customerName = q.customerName;
    form.customerDocument = q.customerDocument ?? "";
    form.customerPhone = q.customerPhone ?? "";
    form.customerAddress = q.customerAddress ?? "";
    form.sellerId = q.sellerId ?? null;
    form.notes = q.notes ?? "";
    form.discount = (q.discount ?? 0) / 100;

    form.items = q.items.map((it: any) => ({
      _key: Date.now() + Math.random(),
      productId: it.productId ?? null,
      productName: it.productName,
      description: it.description ?? "",
      unit: it.unit ?? "m3",
      quantity: it.quantity,
      unitPrice: (it.unitPrice || 0) / 100,
      fck: it.fck ?? null,
      slump: it.slump ?? null,
      stoneSize: it.stoneSize ?? "",
      mixDesignId: it.mixDesignId ?? null,
    }));

    isDrawerOpen.value = true;
  };

  const sendPdf = async (q: Quote) => {
    if (!q.customerPhone && !q.sellerId) {
      toast.add({
        title: "Dados incompletos",
        description: "Cliente ou vendedor sem telefone/contato para envio.",
        color: "error",
      });
      return;
    }

    isSendingPdf.value = q.id;
    try {
      const res = await $fetch<{ success: boolean; sent: string[] }>(
        `/api/quotes/${q.id}/send-pdf`,
        { method: "POST" },
      );
      toast.add({
        title: "PDF Enviado",
        description: `O documento foi enviado para ${res.sent.length} destinatário(s) via WhatsApp.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      await options.refreshQuotes();
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

  return {
    form,
    formErrors,
    isDrawerOpen,
    isEditing,
    loadingSave,
    editingId,
    customerSearchTerm,
    selectedCustomer,
    selectedDriver,
    selectedPumper,
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
    resetForm,
    duplicateQuote,
    sendPdf,
    isSendingPdf,
  };
};
