import { addDays, startOfDay, subDays } from "date-fns";
import { and, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { companies, quotes, sales, transactions } from "../database/schema";
import { db } from "./db";
import { APP_TIMEZONE, fromAppTime, toAppTime } from "./timezone";

export const BRASILIA_TZ = APP_TIMEZONE;

export type ReportSchedule = "daily" | "weekly" | "monthly";

export interface ReportWindow {
  startDate: Date;
  endDateExclusive: Date;
}

export interface ReportMetrics {
  companyName: string;
  salesTotal: number;
  salesCount: number;
  pendingQuotes: number;
  pendingQuotesTotal: number;
  incomeTotal: number;
  expenseTotal: number;
}

export function getBrasiliaNow(now: Date = new Date()): Date {
  return toAppTime(now);
}

export function getReportWindow(
  schedule: ReportSchedule,
  now: Date = new Date(),
): ReportWindow {
  const brasiliaNow = getBrasiliaNow(now);
  let startBrasilia = startOfDay(brasiliaNow);

  if (schedule === "weekly") {
    startBrasilia = subDays(startBrasilia, 7);
  } else if (schedule === "monthly") {
    startBrasilia = subDays(startBrasilia, 30);
  }

  const endBrasiliaExclusive = addDays(startOfDay(brasiliaNow), 1);

  const startDate = fromAppTime(startBrasilia);
  const endDateExclusive = fromAppTime(endBrasiliaExclusive);

  return { startDate, endDateExclusive };
}

export async function loadReportMetrics(
  companyId: number,
  schedule: ReportSchedule,
  now: Date = new Date(),
): Promise<ReportMetrics> {
  const { startDate, endDateExclusive } = getReportWindow(schedule, now);

  // Match dashboard period logic: include all non-cancelled sales inside period.
  const salesRows = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.companyId, companyId),
        gte(sales.date, startDate),
        lt(sales.date, endDateExclusive),
        ne(sales.status, "cancelled"),
      ),
    );

  const salesTotal = salesRows.reduce((acc, s) => acc + s.total, 0);
  const salesCount = salesRows.length;

  // Match dashboard active quotes logic (draft + negotiation, including legacy sent).
  const quotesRows = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.companyId, companyId),
        inArray(quotes.status, ["draft", "negotiation", "sent"]),
      ),
    );

  const pendingQuotes = quotesRows.length;
  const pendingQuotesTotal = quotesRows.reduce((acc, q) => acc + q.total, 0);

  // Match dashboard balance logic: include all non-cancelled transactions in period.
  const txRows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.companyId, companyId),
        gte(transactions.date, startDate),
        lt(transactions.date, endDateExclusive),
        ne(transactions.status, "cancelled"),
      ),
    );

  const incomeTotal = txRows
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
  const expenseTotal = txRows
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const companyRow = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .get();

  return {
    companyName: companyRow?.name ?? "Meu Concreto",
    salesTotal,
    salesCount,
    pendingQuotes,
    pendingQuotesTotal,
    incomeTotal,
    expenseTotal,
  };
}
