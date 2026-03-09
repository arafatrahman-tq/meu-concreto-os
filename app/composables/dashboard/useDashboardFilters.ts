import { ref, computed } from "vue";
import {
  startOfDay,
  addDays,
  startOfMonth,
  addMonths,
  startOfYear,
  addYears,
  subMonths,
  subYears,
  format,
  parseISO,
} from "date-fns";

export type DashboardPeriod =
  | "today"
  | "week"
  | "month"
  | "year"
  | "all"
  | "custom";

export interface DashboardRanges {
  start: number;
  end: number;
  prevStart: number;
  prevEnd: number;
}

export const useDashboardFilters = () => {
  const selectedPeriod = ref<DashboardPeriod>("month");

  const customStart = ref(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const customEnd = ref(format(new Date(), "yyyy-MM-dd"));

  const periodOptions = [
    { label: "Hoje", value: "today", icon: "i-heroicons-clock" },
    { label: "Esta Semana", value: "week", icon: "i-heroicons-calendar-days" },
    { label: "Este Mês", value: "month", icon: "i-heroicons-calendar" },
    { label: "Este Ano", value: "year", icon: "i-heroicons-rectangle-stack" },
    { label: "Tudo", value: "all", icon: "i-heroicons-globe-alt" },
    {
      label: "Personalizado",
      value: "custom",
      icon: "i-heroicons-adjustments-horizontal",
    },
  ];

  const ranges = computed<DashboardRanges>(() => {
    const now = new Date();
    const today = startOfDay(now).getTime();
    const tomorrow = addDays(startOfDay(now), 1).getTime();
    const yesterday = addDays(startOfDay(now), -1).getTime();

    if (selectedPeriod.value === "today") {
      return {
        start: today,
        end: tomorrow,
        prevStart: yesterday,
        prevEnd: today,
      };
    }

    if (selectedPeriod.value === "week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = startOfDay(new Date(now));
      monday.setDate(diff);
      const start = monday.getTime();
      const prevStart = addDays(monday, -7).getTime();
      return {
        start,
        end: addDays(monday, 7).getTime(),
        prevStart,
        prevEnd: start,
      };
    }

    if (selectedPeriod.value === "month") {
      const start = startOfMonth(now).getTime();
      const end = addMonths(startOfMonth(now), 1).getTime();
      const prevStart = subMonths(startOfMonth(now), 1).getTime();
      return { start, end, prevStart, prevEnd: start };
    }

    if (selectedPeriod.value === "year") {
      const start = startOfYear(now).getTime();
      const end = addYears(startOfYear(now), 1).getTime();
      const prevStart = addYears(startOfYear(now), -1).getTime();
      return { start, end, prevStart, prevEnd: start };
    }

    if (selectedPeriod.value === "custom") {
      const start = customStart.value
        ? startOfDay(new Date(`${customStart.value}T00:00:00`)).getTime()
        : 0;
      const end = customEnd.value
        ? addDays(
            startOfDay(new Date(`${customEnd.value}T00:00:00`)),
            1
          ).getTime()
        : tomorrow;
      return { start, end, prevStart: 0, prevEnd: 0 };
    }

    return { start: 0, end: tomorrow, prevStart: 0, prevEnd: 0 };
  });

  const fetchWindowStart = computed<string | null>(() => {
    if (selectedPeriod.value === "all") return null;
    const now = new Date();

    // Ensure we have enough data for Year-over-Year comparison
    if (selectedPeriod.value === "year") {
      return format(startOfYear(subYears(now, 1)), "yyyy-MM-dd");
    }

    const thirteenMonthsAgo = subMonths(startOfMonth(now), 13);

    if (selectedPeriod.value === "custom" && customStart.value) {
      const customDate = parseISO(customStart.value);
      const customMs = startOfDay(customDate).getTime();
      const windowMs = thirteenMonthsAgo.getTime();
      return format(new Date(Math.min(customMs, windowMs)), "yyyy-MM-dd");
    }

    return format(thirteenMonthsAgo, "yyyy-MM-dd");
  });

  return {
    selectedPeriod,
    customStart,
    customEnd,
    periodOptions,
    ranges,
    fetchWindowStart,
  };
};
