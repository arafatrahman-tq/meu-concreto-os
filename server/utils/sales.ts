import { eq, and, ne } from "drizzle-orm";
import { transactions, sales } from "../database/schema";
import { db } from "./db";

/**
 * Verifica o status de pagamento de uma venda e atualiza para "completed"
 * quando todas as transações relacionadas estiverem pagas.
 *
 * Regras:
 * - Se não houver transações vinculadas, não faz nada
 * - Se todas as transações (não canceladas) estiverem pagas → venda = completed
 * - Se houver alguma transação pendente → mantém status atual
 * - Transações canceladas são ignoradas na verificação
 *
 * @param saleId - ID da venda a verificar
 * @param tx - Transação do Drizzle (opcional, para operações atômicas)
 * @returns {Promise<boolean>} - True se a venda foi atualizada para completed
 */
export async function checkAndUpdateSaleStatus(
  saleId: number,
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<boolean> {
  const client = tx || db;

  // Busca todas as transações não canceladas da venda
  const saleTransactions = await client
    .select({
      id: transactions.id,
      status: transactions.status,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.saleId, saleId),
        ne(transactions.status, "cancelled"),
      ),
    )
    .all();

  // Se não há transações vinculadas, não altera o status da venda
  if (saleTransactions.length === 0) {
    return false;
  }

  // Verifica se todas as transações estão pagas
  const allPaid = saleTransactions.every((t) => t.status === "paid");

  if (allPaid) {
    // Busca o status atual da venda
    const currentSale = await client
      .select({ id: sales.id, status: sales.status })
      .from(sales)
      .where(eq(sales.id, saleId))
      .get();

    // Só atualiza se a venda não estiver já completed ou cancelled
    if (
      currentSale &&
      currentSale.status !== "completed" &&
      currentSale.status !== "cancelled"
    ) {
      await client
        .update(sales)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(sales.id, saleId));

      console.log(
        `[checkAndUpdateSaleStatus] Sale ${saleId} auto-completed. All ${saleTransactions.length} transactions paid.`,
      );
      return true;
    }
  }

  return false;
}

/**
 * Atualiza o status de uma venda para um valor específico.
 * Usado principalmente para casos especiais ou reversões.
 *
 * @param saleId - ID da venda
 * @param status - Novo status
 * @param tx - Transação do Drizzle (opcional)
 */
export async function updateSaleStatus(
  saleId: number,
  status:
    | "open"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "pending"
    | "confirmed",
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<void> {
  const client = tx || db;

  await client
    .update(sales)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(sales.id, saleId));
}
