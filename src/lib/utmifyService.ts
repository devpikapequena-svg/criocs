// src/lib/utmifyService.ts
import 'server-only' // garante que isso não vai parar no bundle do client
import axios from 'axios'
import { UtmifyOrderPayload } from '@/interfaces/utmify'

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`)
  return value
}

/**
 * Envia dados de pedido para a API da UTMify.
 */
export async function sendOrderToUtmify(
  payload: UtmifyOrderPayload
): Promise<any> {
  const UTMIFY_API_URL = getRequiredEnv('UTMIFY_API_URL')
  const UTMIFY_API_TOKEN = getRequiredEnv('UTMIFY_API_TOKEN')

  try {
    const response = await axios.post(UTMIFY_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': UTMIFY_API_TOKEN,
        'User-Agent': 'RecargaJogo/1.0',
      },
      timeout: 15000,
    })

    return response.data
  } catch (error: any) {
    // Mantive sua tratativa, só enxuguei um pouco
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `Erro da API Utmify: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        )
      }
      if (error.request) {
        throw new Error(
          'Nenhuma resposta recebida da Utmify. Verifique a conectividade.'
        )
      }
      throw new Error(`Erro ao configurar requisição para Utmify: ${error.message}`)
    }

    throw new Error(error?.message || 'Erro desconhecido ao comunicar com a Utmify.')
  }
}

/**
 * Formata Date para "YYYY-MM-DD HH:MM:SS" (UTC)
 */
export function formatToUtmifyDate(date: Date | null): string | null {
  if (!date) return null
  return date.toISOString().slice(0, 19).replace('T', ' ')
}