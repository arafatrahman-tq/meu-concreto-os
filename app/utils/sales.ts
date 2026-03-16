import type { FormItem } from '~/types/sales'

export const makeNewItem = (): FormItem => ({
  _key: Date.now() + Math.random(),
  productId: null,
  productName: '',
  description: '',
  unit: 'm3',
  quantity: 1,
  unitPrice: 0,
  fck: null,
  slump: null,
  stoneSize: '',
  mixDesignId: null
})
