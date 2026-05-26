import { endOfDay, format, isValid, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const DATE_INPUT_FORMAT = "yyyy-MM-dd";

export const parseDateInputLocal = (
  value: string,
  options?: { endOfDay?: boolean },
): Date | null => {
  if (!value) return null;

  const parsed = parse(value, DATE_INPUT_FORMAT, new Date());
  if (!isValid(parsed)) return null;

  return options?.endOfDay ? endOfDay(parsed) : startOfDay(parsed);
};

export const formatDateInputPtBR = (value: string): string => {
  const parsed = parseDateInputLocal(value);
  if (!parsed) return value;
  return format(parsed, "dd/MM/yyyy", { locale: ptBR });
};

/**
 * Parses a date string or number safely for comparisons.
 * If strictly a date (YYYY-MM-DD), forces to T12:00:00 to avoid timezone shifts.
 */
export const parseItemDate = (
  d: string | number | Date | null | undefined,
): Date | null => {
  if (!d) return null;
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T12:00:00.000Z`);
  }
  return new Date(d);
};
