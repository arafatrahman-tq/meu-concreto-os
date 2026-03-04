import { computed, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";
import type { Company, Sale, Quote, KnownCustomer } from "~/types/sales";

export function useKnownCustomers(
  // Utilizamos MaybeRefOrGetter: Aceita Refs, Computed, ou Arrays puros
  companiesList: MaybeRefOrGetter<Company[]>,
  historyList: MaybeRefOrGetter<(Sale | Quote)[]>,
  sourceType: MaybeRefOrGetter<"sale" | "quote">
) {
  const knownCustomers = computed<KnownCustomer[]>(() => {
    const map = new Map<string, KnownCustomer>();

    // toValue() desempacota as variáveis reativas dinamicamente
    const companies = toValue(companiesList) || [];
    const history = toValue(historyList) || [];
    const source = toValue(sourceType);

    // Helper to generate a unique key for aggregation (aligned with backend)
    const getKey = (doc?: string | null, name?: string | null) => {
      const d = doc?.trim();

      // 1. Priority: Clean document (if valid and not internal placeholder)
      if (d && !d.startsWith("_cust_")) {
        const cleanDoc = d.replace(/[^a-zA-Z0-9]/g, "");
        if (cleanDoc.length > 0) return cleanDoc;
      }

      // 2. Fallback: Normalized name
      const n = name
        ?.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (n && n.length > 0) return n;

      // 3. If document is placeholder/invalid and no name, return unknown
      return "unknown";
    };

    // 1. Companies first (source of truth)
    for (const c of toValue(companies) || []) {
      const key = getKey(c.document, c.name);
      if (!key || key === "unknown") continue;

      const fullAddress = [c.address, c.city, c.state]
        .filter(Boolean)
        .join(", ");

      map.set(key, {
        id: `company-${c.id}`,
        label: c.name,
        name: c.name,
        document: c.document ?? "",
        phone: c.phone ?? "",
        address: fullAddress,
        suffix: c.document ? `CNPJ ${c.document}` : undefined,
        source: "company",
      });
    }

    // 2. History customers (skip if already registered as company)
    for (const item of toValue(history) || []) {
      const key = getKey(item.customerDocument, item.customerName);
      if (!key || key === "unknown") continue;

      if (!map.has(key)) {
        map.set(key, {
          id: `${source}-${item.id}`,
          label: item.customerName,
          name: item.customerName,
          document: item.customerDocument ?? "",
          phone: item.customerPhone ?? "",
          address: item.customerAddress ?? "",
          suffix: item.customerDocument
            ? `CPF/CNPJ ${item.customerDocument}`
            : "Cliente anterior",
          source: source,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  return {
    knownCustomers,
  };
}
