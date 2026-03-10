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
