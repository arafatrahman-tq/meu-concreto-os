
export interface ViaCepResult {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  gia: string
  ddd: string
  siafi: string
  erro?: boolean
}

export const fetchAddressByCep = async (cep: string): Promise<ViaCepResult | null> => {
  const cleanCep = cep.replace(/\D/g, '')
  if (cleanCep.length !== 8) return null

  try {
    const data = await $fetch<ViaCepResult>(`https://viacep.com.br/ws/${cleanCep}/json/`)
    if (data.erro) return null
    return data
  } catch (e) {
    console.error('Erro ao buscar CEP:', e)
    return null
  }
}
