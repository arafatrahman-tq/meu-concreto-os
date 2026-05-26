import type { Locale } from "date-fns";
import { startOfDay, endOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

// Priority:
// 1) APP_TIMEZONE (recommended for app-level consistency)
// 2) REPORT_TIMEZONE (legacy compatibility)
// 3) TZ (system-style fallback)
// 4) America/Sao_Paulo (safe default)
export const APP_TIMEZONE =
  process.env.APP_TIMEZONE ||
  process.env.REPORT_TIMEZONE ||
  process.env.TZ ||
  "America/Sao_Paulo";

export function toAppTime(date: Date = new Date()): Date {
  return toZonedTime(date, APP_TIMEZONE);
}

export function fromAppTime(date: Date): Date {
  return fromZonedTime(date, APP_TIMEZONE);
}

export function startOfAppDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  const zoned = toZonedTime(d, APP_TIMEZONE);
  return fromZonedTime(startOfDay(zoned), APP_TIMEZONE);
}

export function endOfAppDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  const zoned = toZonedTime(d, APP_TIMEZONE);
  return fromZonedTime(endOfDay(zoned), APP_TIMEZONE);
}

export function formatInAppTime(
  date: Date,
  pattern: string,
  locale?: Locale,
): string {
  return formatInTimeZone(
    date,
    APP_TIMEZONE,
    pattern,
    locale ? { locale } : undefined,
  );
}
