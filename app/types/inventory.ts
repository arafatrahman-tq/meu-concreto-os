export type MaterialType =
    | "cement"
    | "sand"
    | "stone"
    | "additive"
    | "water"
    | "other";

export type MaterialUnit = "kg" | "ton" | "l" | "m3";

export interface Material {
    id: number;
    companyId: number;
    name: string;
    type: MaterialType;
    unit: MaterialUnit;
    cost: number; // cents
    stock: number;
    active: boolean;
    createdAt: string | number;
    updatedAt: string | number;
}

export const typeConfig: Record<
    MaterialType,
    {
        label: string;
        color:
        | "neutral"
        | "warning"
        | "info"
        | "primary"
        | "secondary"
        | "success"
        | "error";
        icon: string;
    }
> = {
    cement: {
        label: "Cimento",
        color: "neutral",
        icon: "i-lucide-box",
    },
    sand: {
        label: "Areia",
        color: "warning",
        icon: "i-lucide-layers",
    },
    stone: {
        label: "Brita",
        color: "neutral",
        icon: "i-lucide-hexagon",
    },
    additive: {
        label: "Aditivo",
        color: "info",
        icon: "i-lucide-flask-conical",
    },
    water: {
        label: "Água",
        color: "primary",
        icon: "i-lucide-droplets",
    },
    other: {
        label: "Outro",
        color: "neutral",
        icon: "i-lucide-package",
    },
};
