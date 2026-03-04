import { computed } from "vue";
import type { Ref } from "vue";
import { format, parseISO, startOfDay, addDays } from "date-fns";
import type { DashboardRanges } from "./useDashboardFilters";
import type { Sale, Transaction, Quote, Product } from "~/types/dashboard";

export const useDashboardMetrics = (
  data: {
    sales: Ref<Sale[]>;
    transactions: Ref<Transaction[]>;
    quotes: Ref<Quote[]>;
    products: Ref<Product[]>;
  },
  ranges: Ref<DashboardRanges>,
  selectedPeriod: Ref<string>,
  customStart: Ref<string>,
  customEnd: Ref<string>
) => {
  // ─── Helpers ──────────────────────────────────────────────────────
  const toMs = (v: string | number | Date | null | undefined): number => {
    if (!v) return 0;
    if (typeof v === "number") return v < 1e10 ? v * 1000 : v;
    if (typeof v === "string") return parseISO(v).getTime();
    if (v instanceof Date) return v.getTime();
    return 0;
  };

  // ─── Sales Filtering & Trends ───────────────────────────────────
  const salesFiltered = computed(() =>
    data.sales.value.filter(
      (s) =>
        toMs(s.date) >= ranges.value.start &&
        toMs(s.date) < ranges.value.end &&
        s.status !== "cancelled"
    )
  );
  const salesPrevious = computed(() =>
    data.sales.value.filter(
      (s) =>
        toMs(s.date) >= ranges.value.prevStart &&
        toMs(s.date) < ranges.value.prevEnd &&
        s.status !== "cancelled"
    )
  );

  const revenueFiltered = computed(() =>
    salesFiltered.value.reduce((acc, s) => acc + (s.total ?? 0), 0)
  );
  const revenuePrevious = computed(() =>
    salesPrevious.value.reduce((acc, s) => acc + (s.total ?? 0), 0)
  );
  const revenueTrend = computed(() => {
    if (selectedPeriod.value === "all" || !revenuePrevious.value) return null;
    return (
      ((revenueFiltered.value - revenuePrevious.value) /
        revenuePrevious.value) *
      100
    );
  });

  // ─── Quotes Filtering & Trends ───────────────────────────────────────
  const activeQuotes = computed(() =>
    data.quotes.value.filter((q) => ["draft", "sent"].includes(q.status))
  );
  const quotesFiltered = computed(() =>
    data.quotes.value.filter(
      (q) =>
        toMs(q.date) >= ranges.value.start && toMs(q.date) < ranges.value.end
    )
  );
  const quotesPrevious = computed(() =>
    data.quotes.value.filter(
      (q) =>
        toMs(q.date) >= ranges.value.prevStart &&
        toMs(q.date) < ranges.value.prevEnd
    )
  );
  const quotesTrend = computed(() => {
    if (selectedPeriod.value === "all" || !quotesPrevious.value.length)
      return null;
    return (
      ((quotesFiltered.value.length - quotesPrevious.value.length) /
        quotesPrevious.value.length) *
      100
    );
  });

  // ─── Sales Count Trend ───────────────────────────────────────
  const salesCountTrend = computed(() => {
    if (selectedPeriod.value === "all" || !salesPrevious.value.length)
      return null;
    return (
      ((salesFiltered.value.length - salesPrevious.value.length) /
        salesPrevious.value.length) *
      100
    );
  });

  const trendLabel = computed(() => {
    if (selectedPeriod.value === "all" || selectedPeriod.value === "custom")
      return "";
    const map: Record<string, string> = {
      today: "vs. ontem",
      week: "vs. sem. ant.",
      month: "vs. mês ant.",
      year: "vs. ano ant.",
    };
    return map[selectedPeriod.value] ?? "";
  });

  // ─── Transactions & Balance ──────────────────────────────────
  const txFiltered = computed(() =>
    data.transactions.value.filter(
      (t) =>
        toMs(t.date) >= ranges.value.start &&
        toMs(t.date) < ranges.value.end &&
        t.status !== "cancelled"
    )
  );
  const incomeFiltered = computed(() =>
    txFiltered.value
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0)
  );
  const expenseFiltered = computed(() =>
    txFiltered.value
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0)
  );
  const balanceFiltered = computed(
    () => incomeFiltered.value - expenseFiltered.value
  );

  // ─── Sparkline: Revenue ──────
  const sparklineRevenue = computed(() => {
    const now = new Date();

    if (selectedPeriod.value === "today") {
      const base = new Date(now);
      base.setHours(0, 0, 0, 0);
      return Array.from({ length: 24 }, (_, h) => {
        const start = base.getTime() + h * 3_600_000;
        const end = start + 3_600_000;
        return data.sales.value
          .filter(
            (s) =>
              toMs(s.date) >= start &&
              toMs(s.date) < end &&
              s.status !== "cancelled"
          )
          .reduce((a, s) => a + (s.total ?? 0), 0);
      });
    }

    if (selectedPeriod.value === "week" || selectedPeriod.value === "month") {
      const days = selectedPeriod.value === "week" ? 7 : 30;
      return Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (days - 1 - i));
        d.setHours(0, 0, 0, 0);
        const start = d.getTime();
        return data.sales.value
          .filter(
            (s) =>
              toMs(s.date) >= start &&
              toMs(s.date) < start + 86_400_000 &&
              s.status !== "cancelled"
          )
          .reduce((a, s) => a + (s.total ?? 0), 0);
      });
    }

    if (selectedPeriod.value === "year") {
      return Array.from({ length: 12 }, (_, i) => {
        const start = new Date(now.getFullYear(), i, 1).getTime();
        const end = new Date(now.getFullYear(), i + 1, 1).getTime();
        return data.sales.value
          .filter(
            (s) =>
              toMs(s.date) >= start &&
              toMs(s.date) < end &&
              s.status !== "cancelled"
          )
          .reduce((a, s) => a + (s.total ?? 0), 0);
      });
    }

    if (
      selectedPeriod.value === "custom" &&
      customStart.value &&
      customEnd.value
    ) {
      const startMs = new Date(`${customStart.value}T00:00:00`).getTime();
      const endMs =
        new Date(`${customEnd.value}T00:00:00`).getTime() + 86_400_000;
      const days = Math.ceil((endMs - startMs) / 86_400_000);
      const count = Math.min(days, 30);
      const bucketMs = (endMs - startMs) / count;
      return Array.from({ length: count }, (_, i) => {
        const bStart = startMs + i * bucketMs;
        const bEnd = bStart + bucketMs;
        return data.sales.value
          .filter(
            (s) =>
              toMs(s.date) >= bStart &&
              toMs(s.date) < bEnd &&
              s.status !== "cancelled"
          )
          .reduce((a, s) => a + (s.total ?? 0), 0);
      });
    }

    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - (11 - i),
        1
      ).getTime();
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - (10 - i),
        1
      ).getTime();
      return data.sales.value
        .filter(
          (s) =>
            toMs(s.date) >= start &&
            toMs(s.date) < end &&
            s.status !== "cancelled"
        )
        .reduce((a, s) => a + (s.total ?? 0), 0);
    });
  });

  // ─── Cash Flow & Revenue Chart Logic ──────────────────
  const cashFlowChartData = computed(() => {
    const now = new Date();
    type Bar = {
      label: string;
      income: number;
      expense: number;
      revenue: number;
    };

    const createBar = (start: number, end: number, label: string): Bar => ({
      label,
      income: data.transactions.value
        .filter(
          (t) =>
            t.type === "income" &&
            toMs(t.date) >= start &&
            toMs(t.date) < end &&
            t.status !== "cancelled"
        )
        .reduce((a, t) => a + t.amount, 0),
      expense: data.transactions.value
        .filter(
          (t) =>
            t.type === "expense" &&
            toMs(t.date) >= start &&
            toMs(t.date) < end &&
            t.status !== "cancelled"
        )
        .reduce((a, t) => a + t.amount, 0),
      revenue: data.sales.value
        .filter(
          (s) =>
            toMs(s.date) >= start &&
            toMs(s.date) < end &&
            s.status !== "cancelled"
        )
        .reduce((a, s) => a + (s.total ?? 0), 0),
    });

    // 1. TODAY -> Hourly buckets (24 bars)
    if (selectedPeriod.value === "today") {
      const base = new Date(now);
      base.setHours(0, 0, 0, 0);
      return Array.from({ length: 24 }, (_, h) => {
        const s = base.getTime() + h * 3_600_000;
        return createBar(s, s + 3_600_000, `${h}h`);
      });
    }

    // 2. WEEK -> Daily buckets (7 bars)
    if (selectedPeriod.value === "week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        return createBar(
          d.getTime(),
          d.getTime() + 86_400_000,
          d.toLocaleDateString("pt-BR", { weekday: "short" })
        );
      });
    }

    // 3. MONTH -> Daily buckets or grouped days (if month is long)
    if (selectedPeriod.value === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();

      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return createBar(d.getTime(), d.getTime() + 86_400_000, String(i + 1));
      });
    }

    // 4. YEAR -> Monthly buckets (12 bars)
    if (selectedPeriod.value === "year") {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), i, 1);
        return createBar(
          d.getTime(),
          new Date(now.getFullYear(), i + 1, 1).getTime(),
          d.toLocaleDateString("pt-BR", { month: "short" })
        );
      });
    }

    // 5. CUSTOM -> Smart bucketing based on duration
    if (
      selectedPeriod.value === "custom" &&
      customStart.value &&
      customEnd.value
    ) {
      const rangeStart = new Date(`${customStart.value}T00:00:00`);
      const rangeEndMs =
        new Date(`${customEnd.value}T00:00:00`).getTime() + 86_400_000;
      const dayDiff = Math.ceil(
        (rangeEndMs - rangeStart.getTime()) / 86_400_000
      );

      // If <= 45 days, show by day
      if (dayDiff <= 45) {
        return Array.from({ length: dayDiff }, (_, i) => {
          const d = new Date(rangeStart);
          d.setDate(d.getDate() + i);
          return createBar(
            d.getTime(),
            d.getTime() + 86_400_000,
            d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
          );
        });
      }

      // Otherwise show by month
      const bars: Bar[] = [];
      const cursor = new Date(
        rangeStart.getFullYear(),
        rangeStart.getMonth(),
        1
      );
      while (cursor.getTime() < rangeEndMs) {
        const mStart = cursor.getTime();
        const mEnd = new Date(
          cursor.getFullYear(),
          cursor.getMonth() + 1,
          1
        ).getTime();
        bars.push(
          createBar(
            mStart,
            mEnd,
            cursor.toLocaleDateString("pt-BR", {
              month: "short",
              year: "2-digit",
            })
          )
        );
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return bars;
    }

    // 6. ALL or DEFAULT -> Last 6 months (backward)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return createBar(
        d.getTime(),
        new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
        d.toLocaleDateString("pt-BR", { month: "short" })
      );
    });
  });

  const cashFlowSubtitle = computed(() => {
    const map: Record<string, string> = {
      today: "Faturamento e Fluxo por Hora",
      week: "Desempenho da Semana Atual",
      month: "Movimentação Diária deste Mês",
      year: `Janeiro a Dezembro ${new Date().getFullYear()}`,
      all: "Resumo Histórico (Últimos 6 meses)",
    };

    if (
      selectedPeriod.value === "custom" &&
      customStart.value &&
      customEnd.value
    ) {
      const fmt = (s: string) =>
        new Date(`${s}T00:00:00`).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        });
      return `Período: ${fmt(customStart.value)} → ${fmt(customEnd.value)}`;
    }

    return map[selectedPeriod.value] ?? "Receitas vs. Despesas";
  });

  const chartMax = computed(() =>
    Math.max(
      ...cashFlowChartData.value.flatMap((m) => [
        m.income,
        m.expense,
        m.revenue,
      ]),
      1
    )
  );

  // ─── Quick stats ──────────────────────────────────────────────────
  const pendingSales = computed(
    () => salesFiltered.value.filter((s) => s.status === "pending").length
  );
  const activeProductsCount = computed(
    () => data.products.value.filter((p) => p.active).length
  );

  // ─── Listas recentes ──────────────────────────────────────────────
  const recentTransactions = computed(() =>
    [...txFiltered.value]
      .sort((a, b) => toMs(b.date) - toMs(a.date))
      .slice(0, 6)
  );
  const recentSales = computed(() =>
    [...salesFiltered.value]
      .sort((a, b) => toMs(b.date) - toMs(a.date))
      .slice(0, 5)
  );

  // ─── Top Vendedores ───────────────────────────────────────────────
  const topSellers = computed(() => {
    const sellerMap = new Map<
      number,
      { name: string; total: number; count: number }
    >();
    salesFiltered.value.forEach((s) => {
      if (!s.seller) return;
      const current = sellerMap.get(s.seller.id) || {
        name: s.seller.name,
        total: 0,
        count: 0,
      };
      current.total += s.total ?? 0;
      current.count += 1;
      sellerMap.set(s.seller.id, current);
    });
    return Array.from(sellerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  });

  return {
    revenueFiltered,
    revenueTrend,
    activeQuotes,
    quotesTrend,
    salesFiltered,
    salesCountTrend,
    trendLabel,
    incomeFiltered,
    expenseFiltered,
    balanceFiltered,
    sparklineRevenue,
    cashFlowChartData,
    cashFlowSubtitle,
    chartMax,
    pendingSales,
    activeProductsCount,
    recentTransactions,
    recentSales,
    topSellers,
  };
};
