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

    // 1. Companies first (source of truth)
    for (const c of companies) {
      const key = c.document || c.name;
      if (!key) continue;

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
    for (const item of history) {
      const customerName = item.customerName;
      const customerDocument = item.customerDocument;
      const key = customerDocument || customerName;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          id: `${source}-${item.id}`,
          label: customerName,
          name: customerName,
          document: customerDocument ?? "",
          phone: item.customerPhone ?? "",
          address: item.customerAddress ?? "",
          suffix: customerDocument
            ? `CPF/CNPJ ${customerDocument}`
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
