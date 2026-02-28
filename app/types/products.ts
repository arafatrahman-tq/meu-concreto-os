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

export const typeConfig: Record<
    ProductType,
    { label: string; color: string; icon: string }
> = {
    concrete: {
        label: "Concreto",
        color: "success",
        icon: "i-lucide-layers",
    },
    pump: {
        label: "Bombeamento",
        color: "info",
        icon: "i-lucide-waypoints",
    },
    additive: {
        label: "Aditivo",
        color: "warning",
        icon: "i-lucide-flask-conical",
    },
    rental: {
        label: "Locação",
        color: "neutral",
        icon: "i-lucide-wrench",
    },
    other: {
        label: "Outro",
        color: "neutral",
        icon: "i-lucide-package",
    },
};

export const UNIT_LABELS: Record<ProductUnit, string> = {
    m3: "m³",
    un: "un",
    hr: "hr",
    kg: "kg",
    ton: "ton",
};
