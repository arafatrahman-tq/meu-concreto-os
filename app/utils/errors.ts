/**
 * Extrai a mensagem de erro de uma resposta da API (FetchError ou similar)
 * 
 * @param e - O objeto de erro capturado no catch
 * @param defaultMsg - Mensagem padrão caso nenhuma mensagem seja encontrada no erro
 * @returns A mensagem de erro extraída ou a mensagem padrão
 */
export const getApiError = (e: any, defaultMsg = "Ocorreu um erro") => {
  return e?.data?.message ?? e?.data?.statusMessage ?? e?.message ?? defaultMsg;
};
