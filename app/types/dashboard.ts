export interface Sale {
  id: number;
  customerName: string;
  total: number;
  status:
    | "open"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "pending"
    | "confirmed";
  date: string | number | Date;
  paymentMethod?: string | null;
  seller?: { id: number; name: string } | null;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  countAsConcreteVolume?: boolean;
}

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: "income" | "expense";
  status: "pending" | "paid" | "cancelled";
  date: string | number | Date;
  paymentMethod?: string | null;
}

export interface Quote {
  id: number;
  status: string;
  date: string | number | Date;
  createdAt: string | number | Date;
}

export interface Product {
  id: number;
  active: boolean;
}
