export type ProductType = "concrete" | "pump" | "additive" | "rental" | "other";
export type ProductUnit = "m3" | "un" | "hr" | "kg" | "ton";

export type { MixDesign } from "./mix-designs";

export interface Product {
  id: number;
  companyId: number;
  name: string;
  description?: string | null;
  type: ProductType;
  unit: ProductUnit;
  price: number; // cents
  sku?: string | null;
  fck?: number | null;
  slump?: number | null;
  stoneSize?: string | null;
  mixDesignId?: number | null;
  active: boolean;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface ProductForm {
  name: string;
  description: string;
  type: ProductType;
  unit: ProductUnit;
  price: number;
  sku: string;
  fck?: number;
  slump?: number;
  stoneSize: string;
  mixDesignId?: number;
  active: boolean;
}

export const typeConfig: Record<
  ProductType,
  { label: string; color: string; icon: string }
> = {
  concrete: {
    label: "Concreto",
    color: "success",
    icon: "i-heroicons-cube",
  },
  pump: {
    label: "Bombeamento",
    color: "info",
    icon: "i-heroicons-truck",
  },
  additive: {
    label: "Aditivo",
    color: "warning",
    icon: "i-heroicons-beaker",
  },
  rental: {
    label: "Locação",
    color: "neutral",
    icon: "i-heroicons-wrench-screwdriver",
  },
  other: {
    label: "Outro",
    color: "neutral",
    icon: "i-heroicons-archive-box",
  },
};

export const UNIT_LABELS: Record<ProductUnit, string> = {
  m3: "m³",
  un: "un",
  hr: "hr",
  kg: "kg",
  ton: "ton",
};
