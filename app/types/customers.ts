export interface Customer {
  id?: number;
  key: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  quotesCount: number;
  salesCount: number;
  totalSpent: number;
  totalQuoted: number;
  lastActivityAt: number;
  createdAt: number;
  pendingQuotes: number;
  approvedQuotes: number;
  completedSales: number;
  cancelledSales: number;
}

export interface CustomerQuote {
  id: number;
  customerName: string;
  customerDocument?: string | null;
  date: string | number;
  status: string;
  total: number;
}

export interface CustomerSale {
  id: number;
  customerName: string;
  customerDocument?: string | null;
  date: string | number;
  status: string;
  total: number;
}

export type ActivityFilter = "all" | "buyers" | "prospects" | "inactive";

export const CUSTOMER_ACTIVITY_OPTS = [
  { label: "Todos", value: "all" },
  { label: "Com compras", value: "buyers" },
  { label: "Apenas orçamentos", value: "prospects" },
  { label: "Sem interação recente", value: "inactive" },
];
