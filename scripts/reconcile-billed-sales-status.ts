/// <reference types="node" />
import { createClient } from "@libsql/client";

type SaleBillingRow = {
  saleId: number;
  companyId: number;
  status: string;
  incomeNonCancelledCount: number;
  incomePaidCount: number;
};

type PlannedChange = {
  saleId: number;
  companyId: number;
  fromStatus: string;
  toStatus: "in_progress" | "completed" | "billed";
  incomeNonCancelledCount: number;
  incomePaidCount: number;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const companyArg = args.find((arg: string) => arg.startsWith("--companyId="));
  const companyId = companyArg ? Number(companyArg.split("=")[1]) : undefined;

  if (companyArg && (!companyId || Number.isNaN(companyId))) {
    throw new Error("companyId invalido. Use --companyId=<numero>");
  }

  return { apply, companyId };
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return Number(value ?? 0);
};

const decideTargetStatus = (
  row: SaleBillingRow,
): "in_progress" | "completed" | "billed" | null => {
  // Do not override cancelled sales.
  if (row.status === "cancelled") return null;

  const hasBilledIncome = row.incomeNonCancelledCount > 0;
  if (!hasBilledIncome) return null;

  const allPaid = row.incomePaidCount === row.incomeNonCancelledCount;

  // If all paid, it's 'billed' (more specific than 'completed')
  if (allPaid) return "billed";

  return "in_progress";
};

const printSummary = (
  totalSales: number,
  rowsWithBilling: number,
  planned: PlannedChange[],
  companyId?: number,
) => {
  console.log("\n=== Reconcilia Status de Vendas Faturadas ===");
  if (companyId) console.log(`Escopo: companyId=${companyId}`);
  console.log(`Vendas avaliadas: ${totalSales}`);
  console.log(`Vendas com faturamento ativo: ${rowsWithBilling}`);
  console.log(`Vendas com divergencia de status: ${planned.length}`);

  if (!planned.length) {
    console.log("Nenhuma alteracao necessaria.");
    return;
  }

  const byTarget = planned.reduce(
    (acc, item) => {
      acc[item.toStatus] = (acc[item.toStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log("\nMudancas planejadas por status destino:");
  for (const [status, count] of Object.entries(byTarget)) {
    console.log(`  - ${status}: ${count}`);
  }

  console.log("\nAmostra das divergencias (max 20):");
  for (const item of planned.slice(0, 20)) {
    console.log(
      `  - saleId=${item.saleId} companyId=${item.companyId} ${item.fromStatus} -> ${item.toStatus} | income=${item.incomePaidCount}/${item.incomeNonCancelledCount} paid`,
    );
  }
};

async function run() {
  const { apply, companyId } = parseArgs();

  const client = createClient({
    url: process.env.DB_FILE_NAME || "file:local.db",
  });

  const whereClause = companyId ? "WHERE s.company_id = ?" : "";
  const args = companyId ? [companyId] : [];

  const result = await client.execute({
    sql: `
      SELECT
        s.id AS sale_id,
        s.company_id,
        s.status,
        SUM(CASE WHEN t.id IS NOT NULL AND t.type = 'income' AND t.status != 'cancelled' THEN 1 ELSE 0 END) AS income_non_cancelled_count,
        SUM(CASE WHEN t.id IS NOT NULL AND t.type = 'income' AND t.status = 'paid' THEN 1 ELSE 0 END) AS income_paid_count
      FROM sales s
      LEFT JOIN transactions t ON t.sale_id = s.id
      ${whereClause}
      GROUP BY s.id, s.company_id, s.status
      ORDER BY s.id
    `,
    args,
  });

  const rows: SaleBillingRow[] = result.rows.map((row: any) => ({
    saleId: toNumber(row.sale_id),
    companyId: toNumber(row.company_id),
    status: String(row.status),
    incomeNonCancelledCount: toNumber(row.income_non_cancelled_count),
    incomePaidCount: toNumber(row.income_paid_count),
  }));

  const rowsWithBilling = rows.filter(
    (r) => r.incomeNonCancelledCount > 0,
  ).length;

  const planned: PlannedChange[] = rows
    .map((row) => {
      const target = decideTargetStatus(row);
      if (!target || target === row.status) return null;
      return {
        saleId: row.saleId,
        companyId: row.companyId,
        fromStatus: row.status,
        toStatus: target,
        incomeNonCancelledCount: row.incomeNonCancelledCount,
        incomePaidCount: row.incomePaidCount,
      };
    })
    .filter((item): item is PlannedChange => item !== null);

  printSummary(rows.length, rowsWithBilling, planned, companyId);

  if (!apply) {
    console.log("\nDry-run concluido. Nenhuma alteracao aplicada.");
    console.log("Para aplicar: bun run db:reconcile-billed-sales-status:apply");
    return;
  }

  if (!planned.length) {
    console.log("\nNada para aplicar.");
    return;
  }

  await client.execute("BEGIN");
  try {
    for (const change of planned) {
      await client.execute({
        sql: `
          UPDATE sales
          SET status = ?, updated_at = (unixepoch())
          WHERE id = ?
        `,
        args: [change.toStatus, change.saleId],
      });
    }

    await client.execute("COMMIT");
    console.log(
      `\nAplicado com sucesso. Vendas atualizadas: ${planned.length}`,
    );
  } catch (error) {
    await client.execute("ROLLBACK");
    throw error;
  }
}

run().catch((error) => {
  console.error("Falha ao reconciliar status de vendas faturadas:", error);
  process.exit(1);
});
