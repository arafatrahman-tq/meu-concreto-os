import { createClient } from "@libsql/client";

type CountRow = {
  status: string;
  count: number;
};

const QUOTE_STATUS_MAP: Record<string, string> = {
  sent: "negotiation",
  rejected: "closed",
  expired: "closed",
};

const SALE_STATUS_MAP: Record<string, string> = {
  pending: "open",
  confirmed: "in_progress",
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const companyArg = args.find((arg) => arg.startsWith("--companyId="));
  const companyId = companyArg ? Number(companyArg.split("=")[1]) : undefined;

  if (companyArg && (!companyId || Number.isNaN(companyId))) {
    throw new Error("companyId inválido. Use --companyId=<numero>");
  }

  return { apply, companyId };
};

const mapStatus = (status: string, map: Record<string, string>) =>
  map[status] ?? status;

const summarize = (rows: CountRow[], map: Record<string, string>) => {
  const target = new Map<string, number>();

  for (const row of rows) {
    const next = mapStatus(row.status, map);
    target.set(next, (target.get(next) ?? 0) + row.count);
  }

  return Array.from(target.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => a.status.localeCompare(b.status));
};

const printTable = (
  title: string,
  rows: Array<{ status: string; count: number }>,
) => {
  console.log(`\n${title}`);
  if (!rows.length) {
    console.log("  (sem registros)");
    return;
  }

  for (const row of rows) {
    console.log(`  - ${row.status}: ${row.count}`);
  }
};

async function run() {
  const { apply, companyId } = parseArgs();
  const client = createClient({
    url: process.env.DB_FILE_NAME || "file:local.db",
  });

  const whereClause = companyId ? "WHERE company_id = ?" : "";
  const whereArgs = companyId ? [companyId] : [];

  const quoteRowsResult = await client.execute({
    sql: `
      SELECT status, COUNT(*) AS count
      FROM quotes
      ${whereClause}
      GROUP BY status
      ORDER BY status
    `,
    args: whereArgs,
  });

  const saleRowsResult = await client.execute({
    sql: `
      SELECT status, COUNT(*) AS count
      FROM sales
      ${whereClause}
      GROUP BY status
      ORDER BY status
    `,
    args: whereArgs,
  });

  const quoteRows: CountRow[] = quoteRowsResult.rows.map((row: any) => ({
    status: String(row.status),
    count: Number(row.count),
  }));

  const saleRows: CountRow[] = saleRowsResult.rows.map((row: any) => ({
    status: String(row.status),
    count: Number(row.count),
  }));

  printTable("Quotes (antes)", quoteRows);
  printTable(
    "Quotes (após migração prevista)",
    summarize(quoteRows, QUOTE_STATUS_MAP),
  );

  printTable("Sales (antes)", saleRows);
  printTable(
    "Sales (após migração prevista)",
    summarize(saleRows, SALE_STATUS_MAP),
  );

  if (!apply) {
    console.log("\nDry-run concluído. Nenhuma alteração foi aplicada.");
    console.log("Para aplicar: bun run status:migrate --apply");
    if (companyId) {
      console.log(`Escopo: apenas companyId=${companyId}`);
    }
    return;
  }

  await client.execute("BEGIN");
  try {
    await client.execute({
      sql: `
        UPDATE quotes
        SET status = CASE
          WHEN status = 'sent' THEN 'negotiation'
          WHEN status = 'rejected' THEN 'closed'
          WHEN status = 'expired' THEN 'closed'
          ELSE status
        END
        ${whereClause}
      `,
      args: whereArgs,
    });

    await client.execute({
      sql: `
        UPDATE sales
        SET status = CASE
          WHEN status = 'pending' THEN 'open'
          WHEN status = 'confirmed' THEN 'in_progress'
          ELSE status
        END
        ${whereClause}
      `,
      args: whereArgs,
    });

    await client.execute("COMMIT");
    console.log("\nMigração aplicada com sucesso.");
    if (companyId) {
      console.log(`Escopo aplicado: companyId=${companyId}`);
    }
  } catch (error) {
    await client.execute("ROLLBACK");
    throw error;
  }
}

run().catch((error) => {
  console.error("Falha na migração de status:", error);
  process.exit(1);
});
