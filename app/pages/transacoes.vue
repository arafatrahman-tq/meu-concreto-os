<script setup lang="ts">
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "~/types/transactions";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Transações | Meu Concreto" });

const { user, companyId } = useAuth();
const toast = useToast();

interface Company {
  id: number;
  name: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const {
  data: txData,
  refresh: refreshTransactions,
  pending: loadingTx,
} = await useFetch("/api/transactions", {
  query: { companyId },
});

const { data: companyData } = await useFetch<{ company: Company }>(
  () => `/api/companies/${companyId.value}`,
);
const company = computed(() => companyData.value?.company ?? null);

const transactions = computed<Transaction[]>(
  () =>
    (txData.value as { transactions: Transaction[] } | null)?.transactions ??
    [],
);

// Logic moved to useFormatters

// ─────────────────────────────────────────────
// Filters & Search
// ─────────────────────────────────────────────
const search = ref("");
const typeFilter = ref<TransactionType | "all">("all");
const statusFilter = ref<TransactionStatus | "all">("all");
const dateStart = ref("");
const dateEnd = ref("");

const TYPE_OPTS = [
  { label: "Todos os tipos", value: "all" },
  { label: "Receita", value: "income" },
  { label: "Despesa", value: "expense" },
];

const STATUS_OPTS = [
  { label: "Todos os status", value: "all" },
  { label: "Pendente", value: "pending" },
  { label: "Pago", value: "paid" },
  { label: "Cancelado", value: "cancelled" },
];

const filteredTransactions = computed(() => {
  return transactions.value
    .filter((t) => {
      const matchType =
        typeFilter.value === "all" || t.type === typeFilter.value;
      const matchStatus =
        statusFilter.value === "all" || t.status === statusFilter.value;
      const q = search.value.toLowerCase();
      const matchSearch =
        !q ||
        t.description.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        (t.paymentMethod ?? "").toLowerCase().includes(q) ||
        (t.sale?.customerName ?? "").toLowerCase().includes(q);
      const txDate = new Date(t.date as string | number);
      const matchStart =
        !dateStart.value || txDate >= new Date(dateStart.value);
      const matchEnd =
        !dateEnd.value || txDate <= new Date(dateEnd.value + "T23:59:59");
      return matchType && matchStatus && matchSearch && matchStart && matchEnd;
    })
    .sort(
      (a, b) =>
        new Date(b.date as string | number).getTime() -
        new Date(a.date as string | number).getTime(),
    );
});

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
const page = ref(1);
const pageSize = ref(12);

const paginatedTransactions = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredTransactions.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredTransactions.value.length / pageSize.value),
);

watch([search, typeFilter, statusFilter, dateStart, dateEnd], () => {
  page.value = 1;
});

// ─────────────────────────────────────────────
// Status / Type config
// ─────────────────────────────────────────────
const statusConfig: Record<
  TransactionStatus,
  { label: string; color: string; icon: string }
> = {
  pending: {
    label: "Pendente",
    color: "warning",
    icon: "i-heroicons-clock",
  },
  paid: {
    label: "Pago",
    color: "success",
    icon: "i-heroicons-check-circle",
  },
  cancelled: {
    label: "Cancelado",
    color: "error",
    icon: "i-heroicons-x-circle",
  },
};

const typeConfig: Record<
  TransactionType,
  { label: string; color: string; icon: string; sign: string }
> = {
  income: {
    label: "Receita",
    color: "success",
    icon: "i-heroicons-arrow-trending-up",
    sign: "+",
  },
  expense: {
    label: "Despesa",
    color: "error",
    icon: "i-heroicons-arrow-trending-down",
    sign: "-",
  },
};

// ─────────────────────────────────────────────
// KPI Summaries
// ─────────────────────────────────────────────
const kpis = computed(() => {
  const all = transactions.value;
  const paid = all.filter((t) => t.status === "paid");
  const income = paid
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = paid
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const pending = all
    .filter((t) => t.status === "pending")
    .reduce((s, t) => s + t.amount, 0);
  const pendingCount = all.filter((t) => t.status === "pending").length;
  const totalCount = all.length;
  return { income, expense, balance, pending, pendingCount, totalCount };
});

// Drawer state
const isDrawerOpen = ref(false);
const editingTransaction = ref<Transaction | null>(null);

const openCreate = () => {
  editingTransaction.value = null;
  isDrawerOpen.value = true;
};

const openEdit = (t: Transaction) => {
  editingTransaction.value = t;
  isDrawerOpen.value = true;
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
const deleteTarget = ref<Transaction | null>(null);
const loadingDelete = ref(false);
const isDeleteModalOpen = ref(false);

const confirmDelete = (t: Transaction) => {
  deleteTarget.value = t;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  loadingDelete.value = true;
  const desc = deleteTarget.value.description;
  try {
    await $fetch(`/api/transactions/${deleteTarget.value.id}`, {
      method: "DELETE",
    });
    isDeleteModalOpen.value = false;
    toast.add({
      title: "Transação excluída",
      description: `"${desc}" foi excluída.`,
      color: "neutral",
      icon: "i-heroicons-trash",
    });
    await refreshTransactions();
  } catch (e: unknown) {
    const err = e as {
      data?: { message?: string; statusMessage?: string };
      message?: string;
    };
    toast.add({
      title: "Erro ao excluir",
      description:
        err?.data?.message ??
        err?.data?.statusMessage ??
        err?.message ??
        "Tente novamente.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingDelete.value = false;
    deleteTarget.value = null;
  }
};

// ─────────────────────────────────────────────
// Quick status update
// ─────────────────────────────────────────────
const updateStatus = async (t: Transaction, status: TransactionStatus) => {
  try {
    await $fetch(`/api/transactions/${t.id}`, {
      method: "PUT",
      body: { status },
    });
    toast.add({
      title: "Status atualizado",
      description: `Transação agora está como "${statusConfig[status].label}".`,
      color: "success",
      icon: statusConfig[status].icon,
    });
    await refreshTransactions();
  } catch (e) {
    console.error(e);
  }
};

const STATUS_ACTIONS: Record<
  TransactionStatus,
  { next: TransactionStatus; label: string }[]
> = {
  pending: [
    { next: "paid", label: "Marcar como Pago" },
    { next: "cancelled", label: "Cancelar" },
  ],
  paid: [],
  cancelled: [{ next: "pending", label: "Reabrir como Pendente" }],
};

// ─────────────────────────────────────────────
// PDF Report Download
// ─────────────────────────────────────────────
const loadingPDF = ref(false);

const downloadReport = async () => {
  loadingPDF.value = true;
  try {
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
    const fmtDate = (v: string | number | null | undefined) =>
      v
        ? new Intl.DateTimeFormat("pt-BR").format(
            new Date(v as string | number),
          )
        : "—";

    const rows = filteredTransactions.value;
    const periodLabel = (() => {
      const start = dateStart.value;
      const end = dateEnd.value;
      if (start && end) {
        if (start === end) return `Data: ${fmtDate(start)}`;
        return `Período: ${fmtDate(start)} — ${fmtDate(end)}`;
      }
      if (start) return `A partir de: ${fmtDate(start)}`;
      if (end) return `Até: ${fmtDate(end)}`;

      // Caso não haja filtros de data, encontrar o range nos registros
      if (rows.length > 0) {
        const dates = rows.map((r) => new Date(r.date).getTime());
        const min = new Date(Math.min(...dates));
        const max = new Date(Math.max(...dates));
        if (min.toDateString() === max.toDateString())
          return `Data: ${fmtDate(min.toISOString())}`;
        return `Período: ${fmtDate(min.toISOString())} — ${fmtDate(max.toISOString())}`;
      }
      return "Período: Integral";
    })();

    // ── Watermark
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(60);
    doc.setFont("helvetica", "bold");
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
    doc.text("MEU CONCRETO", pw / 2, ph / 2, { align: "center", angle: 45 });
    doc.restoreGraphicsState();

    // ── Header brand block
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

    // ── Report title (right side)
    doc.setTextColor(24, 24, 27);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE TRANSAÇÕES", pw - 15, 20.5, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text(periodLabel, pw - 15, 25.5, { align: "right" });
    const generatedAt = `Gerado em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`;
    doc.text(generatedAt, pw - 15, 30, { align: "right" });

    // ── Divider
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.1);
    doc.line(15, 38, pw - 15, 38);

    // ── Company info block
    const co = company.value;
    if (co) {
      const colW = (pw - 30) / 2;

      // Left: identity
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(113, 113, 122);
      doc.text("EMPRESA EMISSORA", 15, 44, { charSpace: 0.3 });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text(co.name, 15, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      let cy = 55;
      if (co.document) {
        doc.text(`CNPJ: ${co.document}`, 15, cy);
        cy += 4.5;
      }
      if (co.phone) {
        doc.text(`Tel: ${co.phone}`, 15, cy);
        cy += 4.5;
      }
      if (co.email) {
        doc.text(`E-mail: ${co.email}`, 15, cy);
      }

      // Right: address
      const addrParts = [
        co.address,
        [co.city, co.state].filter(Boolean).join(" / "),
        co.zip ? `CEP: ${co.zip}` : "",
      ].filter(Boolean);
      if (addrParts.length) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(113, 113, 122);
        doc.text("ENDEREÇO", 15 + colW, 44, { charSpace: 0.3 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(113, 113, 122);
        let ay = 50;
        addrParts.forEach((line) => {
          const split = doc.splitTextToSize(line, colW - 5);
          doc.text(split, 15 + colW, ay);
          ay += split.length * 4.5;
        });
      }
    }

    // ── Divider (after company block)
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.1);
    doc.line(15, 73, pw - 15, 73);

    // ── KPI summary boxes
    const paid = rows.filter((t) => t.status === "paid");
    const income = paid
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = paid
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    const pending = rows
      .filter((t) => t.status === "pending")
      .reduce((s, t) => s + t.amount, 0);

    const kpiCols = [
      {
        label: "RECEITAS (PAGAS)",
        value: fmtCurrency(income),
        color: [22, 163, 74] as [number, number, number],
      },
      {
        label: "DESPESAS (PAGAS)",
        value: fmtCurrency(expense),
        color: [220, 38, 38] as [number, number, number],
      },
      {
        label: "SALDO LÍQUIDO",
        value: fmtCurrency(Math.abs(balance)),
        color:
          balance >= 0
            ? ([34, 197, 94] as [number, number, number])
            : ([220, 38, 38] as [number, number, number]),
      },
      {
        label: "A RECEBER/PAGAR",
        value: fmtCurrency(pending),
        color: [245, 158, 11] as [number, number, number],
      },
    ];
    const kpiW = (pw - 30) / 4;
    kpiCols.forEach((k, i) => {
      const x = 15 + i * kpiW;
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(113, 113, 122);
      doc.text(k.label, x + kpiW / 2, 80, { align: "center", charSpace: 0.3 });
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...k.color);
      doc.text(k.value, x + kpiW / 2, 87, { align: "center" });
    });

    // ── Divider (after KPIs)
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.1);
    doc.line(15, 93, pw - 15, 93);

    // ── Table
    const statusLabels: Record<string, string> = {
      pending: "Pendente",
      paid: "Pago",
      cancelled: "Cancelado",
    };
    const typeLabels: Record<string, string> = {
      income: "Receita",
      expense: "Despesa",
    };

    autoTable(doc, {
      startY: 99,
      head: [
        [
          "DESCRIÇÃO",
          "TIPO",
          "CATEGORIA",
          "STATUS",
          "DATA",
          "PAGAMENTO",
          "VALOR",
        ],
      ],
      body: rows.map((t) => {
        const saleInfo = t.sale
          ? `\nVenda: ${t.sale.customerName}` +
            (t.sale.items?.length
              ? ` (${t.sale.items.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0)} m³)`
              : "")
          : "";

        return [
          t.description.toUpperCase() + saleInfo,
          (typeLabels[t.type] || "—").toUpperCase(),
          (t.category ?? "—").toUpperCase(),
          (statusLabels[t.status] || "—").toUpperCase(),
          fmtDate(t.date),
          (t.paymentMethod ?? "—").toUpperCase(),
          (t.type === "income" ? "+" : "-") + fmtCurrency(t.amount),
        ];
      }),
      theme: "grid",
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 4,
        halign: "left",
      },
      styles: {
        fontSize: 7,
        cellPadding: 3.5,
        font: "helvetica",
        textColor: [63, 63, 70],
      },
      columnStyles: {
        0: { cellWidth: "auto", fontStyle: "bold", textColor: [24, 24, 27] },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 22 },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 22, halign: "center" },
        6: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data: any) => {
        if (data.section === "body") {
          if (data.column.index === 6) {
            const val = data.cell.raw as string;
            data.cell.styles.textColor = val.startsWith("+")
              ? [22, 163, 74]
              : [220, 38, 38];
          }
          if (data.column.index === 3) {
            const val = data.cell.raw as string;
            if (val === "PAGO") data.cell.styles.textColor = [22, 163, 74];
            if (val === "PENDENTE") data.cell.styles.textColor = [245, 158, 11];
            if (val === "CANCELADO") data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });

    // ── Footer
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text(`Total de registros: ${rows.length}`, 15, finalY + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text(
      "Meu Concreto OS — Relatório gerado automaticamente.",
      pw / 2,
      ph - 12,
      { align: "center" },
    );

    const filename = `transacoes-${new Date().toLocaleDateString("sv")}.pdf`;
    doc.save(filename);
    toast.add({
      title: "PDF gerado",
      description: `"${filename}" baixado com sucesso.`,
      color: "success",
      icon: "i-heroicons-arrow-down-tray",
    });
  } catch (e) {
    console.error(e);
    toast.add({
      title: "Erro ao gerar PDF",
      description: "Não foi possível gerar o relatório.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingPDF.value = false;
  }
};
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Transações
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Controle de receitas e despesas da empresa
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-down-tray"
          size="md"
          :loading="loadingPDF"
          @click="downloadReport"
        >
          Relatório PDF
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          size="md"
          @click="openCreate"
        >
          Nova Transação
        </UButton>
      </div>
    </div>

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        v-for="(kpi, i) in [
          {
            label: 'Receitas (Pagas)',
            value: formatCurrency(kpis.income),
            suffix: 'entradas confirmadas',
            icon: 'i-heroicons-arrow-trending-up',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
          {
            label: 'Despesas (Pagas)',
            value: formatCurrency(kpis.expense),
            suffix: 'saídas do caixa',
            icon: 'i-heroicons-arrow-trending-down',
            color: 'text-red-500',
            bg: 'bg-red-50 dark:bg-red-500/10',
          },
          {
            label: 'Saldo Líquido',
            value: formatCurrency(kpis.balance),
            suffix:
              kpis.balance >= 0 ? 'em conta (positivo)' : 'em conta (negativo)',
            icon: 'i-heroicons-banknotes',
            color: kpis.balance >= 0 ? 'text-primary-500' : 'text-red-500',
            bg:
              kpis.balance >= 0
                ? 'bg-primary-50 dark:bg-primary-500/10'
                : 'bg-red-50 dark:bg-red-500/10',
          },
          {
            label: 'A Receber/Pagar',
            value: formatCurrency(kpis.pending),
            suffix: `${kpis.pendingCount} pendências`,
            icon: 'i-heroicons-clock',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
          },
        ]"
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
              'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs',
            ]"
          >
            <UIcon :name="kpi.icon" :class="['w-6 h-6', kpi.color]" />
          </div>
        </div>
        <p
          class="text-3xl font-black tabular-nums tracking-tighter"
          :class="
            kpi.color.includes('primary') ? 'text-primary-500' : kpi.color
          "
        >
          {{ kpi.value }}
        </p>
        <div class="flex items-center gap-1.5 -mt-2">
          <div :class="[kpi.color, 'w-1.5 h-1.5 rounded-full animate-pulse']" />
          <p
            class="text-[11px] text-zinc-400 font-bold uppercase tracking-wider"
          >
            {{ kpi.suffix }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── Filter & Search Bar ── -->
    <UCard
      :ui="{
        body: 'p-4 sm:p-6',
        header: 'hidden',
        footer: 'hidden',
      }"
      class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
    >
      <div class="flex flex-col gap-6">
        <!-- Top Row: Search & Principal Filters -->
        <div class="flex flex-col lg:flex-row gap-4 items-end">
          <div class="flex-1 w-full">
            <UFormField label="Pesquisar">
              <UInput
                v-model="search"
                icon="i-heroicons-magnifying-glass"
                placeholder="Descrição, categoria, forma de pagamento..."
                class="w-full"
                size="lg"
              />
            </UFormField>
          </div>

          <div class="w-full lg:w-48">
            <UFormField label="Tipo">
              <USelect
                v-model="typeFilter"
                :items="TYPE_OPTS"
                value-attribute="value"
                class="w-full"
                size="lg"
              />
            </UFormField>
          </div>

          <div class="w-full lg:w-48">
            <UFormField label="Status">
              <USelect
                v-model="statusFilter"
                :items="STATUS_OPTS"
                value-attribute="value"
                class="w-full"
                size="lg"
              />
            </UFormField>
          </div>

          <div class="flex gap-2 w-full lg:w-auto">
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-heroicons-funnel"
              size="lg"
              class="flex-1 lg:flex-none justify-center"
              :active="!!dateStart || !!dateEnd"
            >
              Filtros
            </UButton>
            <UButton
              v-if="
                search ||
                typeFilter !== 'all' ||
                statusFilter !== 'all' ||
                dateStart ||
                dateEnd
              "
              color="error"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="lg"
              @click="
                search = '';
                typeFilter = 'all';
                statusFilter = 'all';
                dateStart = '';
                dateEnd = '';
              "
            >
              Limpar
            </UButton>
          </div>
        </div>

        <!-- Collapsible / Advanced Row: Dates -->
        <div
          class="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-6 pt-2 border-t border-zinc-100 dark:border-zinc-800/50"
        >
          <div
            class="flex flex-col sm:flex-row items-end gap-4 w-full sm:w-auto"
          >
            <div class="w-full sm:w-40">
              <UFormField label="De:">
                <UInput
                  v-model="dateStart"
                  type="date"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>
            <div class="w-full sm:w-40">
              <UFormField label="Até:">
                <UInput
                  v-model="dateEnd"
                  type="date"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <div class="flex items-center gap-4 ml-auto pt-4 sm:pt-0">
            <p
              class="text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              Exportar
            </p>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-down-tray"
              size="sm"
              :loading="loadingPDF"
              :disabled="filteredTransactions.length === 0"
              @click="downloadReport"
            >
              PDF
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- ── Table Card ── -->
    <UCard
      :ui="{
        body: 'p-0 sm:p-0',
        header:
          'p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
        footer: 'p-4 border-t border-zinc-100 dark:border-zinc-800',
      }"
      class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden"
    >
      <!-- Table Header -->
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-2 h-6 bg-primary-500 rounded-full" />
            <h3
              class="font-black text-zinc-900 dark:text-white uppercase tracking-tight"
            >
              Registros do Período
            </h3>
          </div>
          <p
            class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400"
          >
            {{ filteredTransactions.length }} entradas
          </p>
        </div>
      </template>

      <!-- Table Content -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
              <th
                class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Lançamento
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Tipo
              </th>
              <th
                class="text-right px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Valor
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Status
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell"
              >
                Data
              </th>
              <th
                class="text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell"
              >
                Pagamento
              </th>
              <th class="px-6 py-4" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            <tr
              v-for="t in paginatedTransactions"
              :key="t.id"
              class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
            >
              <!-- Launch Info -->
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <span
                    class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors"
                  >
                    {{ t.description }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="t.category"
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    >
                      {{ t.category }}
                    </span>
                    <span
                      v-if="t.sale"
                      class="text-[11px] font-bold text-zinc-400"
                    >
                      <UIcon
                        name="i-heroicons-shopping-bag"
                        class="w-3.5 h-3.5 inline mr-1"
                      />
                      {{ t.sale.customerName }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Type -->
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <div
                    :class="[
                      typeConfig[t.type].color === 'success'
                        ? 'bg-green-500'
                        : 'bg-red-500',
                      'w-1.5 h-1.5 rounded-full',
                    ]"
                  />
                  <span
                    class="text-xs font-bold text-zinc-600 dark:text-zinc-400"
                  >
                    {{ typeConfig[t.type].label }}
                  </span>
                </div>
              </td>

              <!-- Amount -->
              <td class="px-4 py-4 text-right">
                <div class="flex flex-col items-end">
                  <span
                    class="font-black tabular-nums text-base tracking-tighter"
                    :class="
                      t.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    "
                  >
                    {{ typeConfig[t.type].sign }}{{ formatCurrency(t.amount) }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-4">
                <UBadge
                  :color="statusConfig[t.status].color as any"
                  variant="subtle"
                  class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
                >
                  {{ statusConfig[t.status].label }}
                </UBadge>
              </td>

              <!-- Date -->
              <td class="px-4 py-4 hidden lg:table-cell">
                <div class="flex flex-col">
                  <span
                    class="text-xs font-bold text-zinc-600 dark:text-zinc-300"
                  >
                    {{ formatDate(t.date) }}
                  </span>
                  <span
                    v-if="t.dueDate"
                    class="text-[10px] text-zinc-400 font-medium"
                  >
                    Ven: {{ formatDate(t.dueDate) }}
                  </span>
                </div>
              </td>

              <!-- Payment Method -->
              <td class="px-4 py-4 hidden xl:table-cell">
                <div v-if="t.paymentMethod" class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-credit-card"
                    class="w-3.5 h-3.5 text-zinc-400"
                  />
                  <span
                    class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight"
                  >
                    {{ t.paymentMethod }}
                  </span>
                </div>
                <span v-else class="text-zinc-300 dark:text-zinc-700">—</span>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div
                  class="flex items-center justify-end gap-1 group-hover:opacity-100 transition-all"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="md"
                    class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    @click="openEdit(t)"
                  />
                  <UDropdownMenu
                    :items="[
                      STATUS_ACTIONS[t.status].map((a) => ({
                        label: a.label,
                        icon: statusConfig[a.next].icon,
                        onSelect: () => updateStatus(t, a.next),
                      })),
                      [
                        {
                          label: 'Excluir Lançamento',
                          icon: 'i-heroicons-trash',
                          color: 'error' as const,
                          onSelect: () => confirmDelete(t),
                        },
                      ],
                    ]"
                  >
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-ellipsis-vertical"
                      size="md"
                      class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
                    />
                  </UDropdownMenu>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Table -->
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

    <!-- Transaction Drawer -->
    <TransactionsTransactionDrawer
      v-model:open="isDrawerOpen"
      :transaction="editingTransaction"
      @saved="refreshTransactions"
    />

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm
    ══════════════════════════════════════════ -->
    <UModal v-model:open="isDeleteModalOpen" title="Excluir Transação">
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir a transação
            <span class="font-bold text-zinc-900 dark:text-white">
              "{{ deleteTarget?.description }}" </span
            >?
          </p>
          <div
            v-if="deleteTarget"
            class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center"
                :class="
                  deleteTarget.type === 'income'
                    ? 'bg-green-100 dark:bg-green-500/20'
                    : 'bg-red-100 dark:bg-red-500/20'
                "
              >
                <UIcon
                  :name="typeConfig[deleteTarget.type].icon"
                  class="w-4 h-4"
                  :class="
                    deleteTarget.type === 'income'
                      ? 'text-green-500'
                      : 'text-red-500'
                  "
                />
              </div>
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  {{ deleteTarget.description }}
                </p>
                <p class="text-xs text-zinc-400">
                  {{ formatDate(deleteTarget.date) }}
                </p>
              </div>
            </div>
            <span
              class="font-black text-sm"
              :class="
                deleteTarget.type === 'income'
                  ? 'text-green-600'
                  : 'text-red-600'
              "
            >
              {{ typeConfig[deleteTarget.type].sign
              }}{{ formatCurrency(deleteTarget.amount) }}
            </span>
          </div>
          <p class="text-xs text-zinc-400">Esta ação é irreversível.</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="loadingDelete"
            @click="isDeleteModalOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            :loading="loadingDelete"
            @click="handleDelete"
          >
            Excluir
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
