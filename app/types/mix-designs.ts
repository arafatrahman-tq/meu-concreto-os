import type { Material } from "./inventory";

export interface MixDesignItem {
    id?: number;
    mixDesignId?: number;
    materialId: number;
    quantity: number;
    material?: Material;
}

export interface MixDesign {
    id: number;
    companyId: number;
    name: string;
    description?: string | null;
    fck?: number | null;
    slump?: number | null;
    stoneSize?: string | null;
    items: MixDesignItem[];
    createdAt: string | number;
    updatedAt: string | number;
}
