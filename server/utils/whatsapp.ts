import { db } from "./db";
import { whatsappSettings } from "../database/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface WhatsappConfig {
  apiUrl: string;
  apiKey?: string | null;
  phoneNumber?: string | null;
}

export interface BaileysResponse {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Formats a phone number into a valid WhatsApp JID.
 * Strips all non-digit characters and appends @s.whatsapp.net.
 */
export function formatJid(number: string): string {
  let digits = number.replace(/\D/g, "");

  // If the number doesn't have the Brazil country code (55).
  // If it has 10/11 digits, prepend 55.
  if (
    !digits.startsWith("55") &&
    (digits.length === 10 || digits.length === 11)
  ) {
    digits = "55" + digits;
  }

  // NOTE: Modern APIs usually handle the 9-digit resolution themselves.
  // Stripping the 9th digit (historically done for DDD 11-28) can actually
  // cause "number not found" errors on newer WhatsApp accounts.
  // I will now return the full 13-digit digits to be safe.

  return `${digits}@s.whatsapp.net`;
}

/** Fetch the WhatsApp settings for a company (returns null if not configured).
 * If a global setting exists in the system, its connection info (apiUrl, apiKey, phoneNumber)
 * will be used if the company-specific settings are incomplete.
 */
export async function getWhatsappConfig(companyId: number) {
  // Try to find if there is a global connection anywhere
  const globalSetting = await db
    .select()
    .from(whatsappSettings)
    .where(eq(whatsappSettings.isGlobal, true))
    .limit(1)
    .get();

  // Find company-specific record
  const companySetting = await db
    .select()
    .from(whatsappSettings)
    .where(eq(whatsappSettings.companyId, companyId))
    .limit(1)
    .get();

  if (!companySetting && !globalSetting) return null;

  // ─── Merge logic: Explicit Choice (Option B from Brainstorm) ───
  // If useGlobal is true, STRICTLY use the global connection credentials.
  // Otherwise, use company-specific ones if provided.
  // Also ensure a global instance doesn't try to use another global (it should use itself).
  const useGlobal =
    companySetting?.useGlobal && !!globalSetting && !companySetting?.isGlobal;

  const rawPhone =
    (useGlobal
      ? globalSetting?.phoneNumber || null
      : companySetting?.phoneNumber || null
    )?.replace(/\D/g, "") || null;

  // ── Instance Name Normalization ──
  // Based on your documentation, the instance name MUST have the '+' prefix.
  // Pattern: ^\+\d{5,15}$
  let instanceName = rawPhone;
  if (instanceName && !instanceName.startsWith("+")) {
    instanceName = "+" + instanceName;
  }

  return {
    ...(companySetting || {
      companyId,
      alertsEnabled: false,
      reportsEnabled: false,
      quotePdfToSeller: false,
      quotePdfToCustomer: false,
      schedulesReminderEnabled: false,
      alertRecipients: [],
      reportRecipients: [],
      schedulesReminderRecipients: [],
      reportSchedule: "daily",
      isGlobal: false,
      useGlobal: false,
    }),
    // If useGlobal is true, override connection fields with global values
    apiUrl: useGlobal
      ? globalSetting?.apiUrl || "http://localhost:3025"
      : companySetting?.apiUrl || "http://localhost:3025",
    apiKey: useGlobal
      ? globalSetting?.apiKey || null
      : companySetting?.apiKey || null,
    phoneNumber: instanceName,
    isConnected: useGlobal
      ? globalSetting?.isConnected || false
      : companySetting?.isConnected || false,
  };
}

/** Low-level call to the Baileys API. */
export async function baileysCall(
  config: WhatsappConfig,
  path: string,
  options: RequestInit = {}
): Promise<BaileysResponse> {
  if (!config.phoneNumber)
    return { ok: false, error: "phoneNumber not configured" };

  const url = `${config.apiUrl.replace(/\/$/, "")}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error(`[baileysCall] Error ${res.status}:`, JSON.stringify(data));
    } else {
      console.log(`[baileysCall] Success ${res.status}`);
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err: unknown) {
    console.error(`[baileysCall] Fetch Exception:`, err);
    return { ok: false, error: String(err) };
  }
}

/** Send a WhatsApp text message to one or more JIDs. */
export async function sendWhatsappMessage(
  config: WhatsappConfig,
  toNumbers: string[],
  text: string
): Promise<{ sent: string[]; failed: string[] }> {
  const sent: string[] = [];
  const failed: string[] = [];

  for (const number of toNumbers) {
    // Convert phone number to WhatsApp JID (clean digits)
    const jid = formatJid(number);
    const result = await baileysCall(
      config,
      `/connections/${encodeURIComponent(config.phoneNumber!)}/send-message`,
      {
        method: "POST",
        body: JSON.stringify({
          jid,
          messageContent: { text },
        }),
      }
    );
    if (result.ok) sent.push(number);
    else failed.push(number);
  }

  return { sent, failed };
}

/** Send a WhatsApp document (PDF) message. */
export async function sendWhatsappPDF(
  config: WhatsappConfig,
  toNumbers: string[],
  pdfBuffer: Buffer,
  fileName: string,
  caption?: string
): Promise<{ sent: string[]; failed: string[] }> {
  const sent: string[] = [];
  const failed: string[] = [];

  const base64 = pdfBuffer.toString("base64");

  for (const number of toNumbers) {
    const jid = formatJid(number);
    const result = await baileysCall(
      config,
      `/connections/${encodeURIComponent(config.phoneNumber!)}/send-message`,
      {
        method: "POST",
        body: JSON.stringify({
          jid,
          messageContent: {
            document: base64,
            fileName,
            mimetype: "application/pdf",
            caption,
          },
        }),
      }
    );
    if (result.ok) sent.push(number);
    else failed.push(number);
  }

  return { sent, failed };
}

/** Format a currency value (cents) to BRL string. */
const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100
  );

/** Build a formatted WhatsApp report message. */
export function buildReportMessage(params: {
  companyName: string;
  schedule: string;
  salesTotal: number;
  salesCount: number;
  pendingQuotes: number;
  pendingQuotesTotal: number;
  incomeTotal: number;
  expenseTotal: number;
}) {
  const scheduleLabel: Record<string, string> = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
  };

  const now = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });
  const label = scheduleLabel[params.schedule] ?? "Diário";
  const balance = params.incomeTotal - params.expenseTotal;

  return [
    `📊 *Relatório ${label} — ${params.companyName}*`,
    `📅 ${now}`,
    ``,
    `💰 *Vendas*`,
    `• Total: ${fmt(params.salesTotal)}`,
    `• Quantidade: ${params.salesCount} venda(s)`,
    ``,
    `📋 *Orçamentos Pendentes*`,
    `• Qtd: ${params.pendingQuotes} orçamento(s)`,
    `• Valor total: ${fmt(params.pendingQuotesTotal)}`,
    ``,
    `💳 *Financeiro*`,
    `• Receitas: ${fmt(params.incomeTotal)}`,
    `• Despesas: ${fmt(params.expenseTotal)}`,
    `• Saldo: ${balance >= 0 ? "▲" : "▼"} ${fmt(Math.abs(balance))}`,
    ``,
    `_Enviado por Meu Concreto_`,
  ].join("\n");
}

/** Build an alert message for a new event. */
export function buildAlertMessage(
  type: "sale" | "quote" | "transaction",
  params: {
    companyName: string;
    customerName?: string;
    total?: number;
    description?: string;
    id?: number;
  }
) {
  const icons: Record<string, string> = {
    sale: "🛒",
    quote: "📋",
    transaction: "💳",
  };
  const labels: Record<string, string> = {
    sale: "Nova Venda",
    quote: "Novo Orçamento",
    transaction: "Nova Transação",
  };

  return [
    `${icons[type]} *${labels[type]} — ${params.companyName}*`,
    params.customerName ? `👤 Cliente: ${params.customerName}` : null,
    params.total !== undefined ? `💰 Valor: ${fmt(params.total)}` : null,
    params.description ? `📝 ${params.description}` : null,
    params.id ? `🔑 ID: #${params.id}` : null,
    ``,
    `_Enviado por Meu Concreto_`,
  ]
    .filter(Boolean)
    .join("\n");
}
