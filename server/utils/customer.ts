/**
 * Customer document scoping utilities.
 *
 * The `companies` table carries a global UNIQUE constraint on the `document`
 * column. Customer records (isCustomer=true) share that table, which would
 * normally prevent the same CPF/CNPJ from being registered in two different
 * tenant companies.
 *
 * To allow the same document to exist across companies while keeping
 * uniqueness *within* a company — and without touching the production DB
 * schema — we scope the stored value for customer rows using the pattern:
 *
 *     "{digits}@{ownerCompanyId}"   e.g. "12345678901@5"
 *
 * Legacy records (created before this change) keep the raw CPF/CNPJ.
 * Both formats are handled transparently by `unscopeCustomerDocument`.
 *
 * Rules:
 *  - Scope on INSERT / UPDATE (customers.post.ts, [id].put.ts)
 *  - Unscope on READ before returning to the client or using as a key
 *  - Synthetic placeholders (_cust_*) are never scoped or unscoped
 */

/**
 * Returns the scoped document value to be persisted in the DB for a customer
 * that belongs to a known ownerCompanyId.
 *
 * @example scopeCustomerDocument("12345678901", 5) // "12345678901@5"
 */
export function scopeCustomerDocument(
  document: string,
  ownerCompanyId: number,
): string {
  return `${document}@${ownerCompanyId}`;
}

/**
 * Strips the "@ownerCompanyId" scope suffix so the caller always receives the
 * clean CPF/CNPJ regardless of whether the record is legacy (unscoped) or new
 * (scoped).
 *
 * Synthetic placeholder values (_cust_*) pass through unchanged.
 *
 * @example unscopeCustomerDocument("12345678901@5") // "12345678901"
 * @example unscopeCustomerDocument("12345678901")   // "12345678901"
 * @example unscopeCustomerDocument("_cust_171234")  // "_cust_171234"
 */
export function unscopeCustomerDocument(
  document: string | null | undefined,
): string {
  if (!document || document.startsWith("_cust_")) return document ?? "";

  const atIdx = document.lastIndexOf("@");
  if (atIdx !== -1 && /^\d+$/.test(document.slice(atIdx + 1))) {
    return document.slice(0, atIdx);
  }

  return document;
}

/**
 * Returns true when the stored value represents a real CPF/CNPJ (scoped or
 * legacy) rather than an internal synthetic placeholder.
 */
export function isRealCustomerDocument(
  document: string | null | undefined,
): boolean {
  if (!document) return false;
  if (document.startsWith("_cust_")) return false;
  return true;
}
