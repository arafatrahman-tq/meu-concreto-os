export type MaterialType
  = | 'cement'
    | 'sand'
    | 'stone'
    | 'additive'
    | 'water'
    | 'other'

export type MaterialUnit = 'kg' | 'ton' | 'l' | 'm3'

export interface Material {
  id: number
  companyId: number
  name: string
  type: MaterialType
  unit: MaterialUnit
  cost: number // cents
  stock: number
  active: boolean
  createdAt: string | number
  updatedAt: string | number
}

export const typeConfig: Record<
  MaterialType,
  {
    label: string
    color:
      | 'neutral'
      | 'warning'
      | 'info'
      | 'primary'
      | 'secondary'
      | 'success'
      | 'error'
    icon: string
  }
> = {
  cement: {
    label: 'Cimento',
    color: 'neutral',
    icon: 'i-heroicons-cube'
  },
  sand: {
    label: 'Areia',
    color: 'warning',
    icon: 'i-heroicons-square-3-stack-3d'
  },
  stone: {
    label: 'Brita',
    color: 'neutral',
    icon: 'i-heroicons-stop'
  },
  additive: {
    label: 'Aditivo',
    color: 'info',
    icon: 'i-heroicons-beaker'
  },
  water: {
    label: 'Água',
    color: 'primary',
    icon: 'i-heroicons-beaker'
  },
  other: {
    label: 'Outro',
    color: 'neutral',
    icon: 'i-heroicons-archive-box'
  }
}
