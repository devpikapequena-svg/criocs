// src/app/api/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { gerarCPFValido } from '@/lib/utils'
import { sendOrderToUtmify, formatToUtmifyDate } from '@/lib/utmifyService'
import { UtmifyOrderPayload } from '@/interfaces/utmify'
import { PaymentPayload } from '@/interfaces/types'

// Route Handler já é servidor por padrão (não use next/config aqui)
export const runtime = 'nodejs'

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`)
  return value
}

function getBuckpayToken() {
  // coloque isso no seu .env.local como BUCKPAY_API_TOKEN=...
  return getRequiredEnv('BUCKPAY_API_TOKEN')
}

export async function POST(request: NextRequest) {
  let requestBody: PaymentPayload

  try {
    requestBody = await request.json()

    const { name, email, phone, amount, items, externalId, utmQuery } =
      requestBody

    const apiToken = getBuckpayToken()

    const parsedAmount = parseFloat(String(amount))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Valor do pagamento inválido.' },
        { status: 400 }
      )
    }
    const amountInCents = Math.round(parsedAmount * 100)

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Itens do pedido inválidos.' },
        { status: 400 }
      )
    }

    const finalCpf = (requestBody.cpf || gerarCPFValido()).replace(/\D/g, '')
    const utmParams = utmQuery || {}

    // x-forwarded-for pode vir como "ip1, ip2"
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'

    const payloadForBuckPay = {
      external_id: externalId,
      payment_method: 'pix',
      amount: amountInCents,
      buyer: {
        name,
        email,
        document: finalCpf,
        phone: `55${phone.replace(/\D/g, '')}`,
        ip,
      },
      items: items.map((item: any) => ({
        id: item.id || `prod_${Date.now()}`,
        name: item.title,
        amount: Math.round(item.unitPrice * 100),
        quantity: item.quantity,
      })),
      tracking: {
        ref: utmParams['ref'] || null,
        src: utmParams['src'] || utmParams['utm_source'] || null,
        sck: utmParams['sck'] || null,
        utm_source: utmParams['utm_source'] || null,
        utm_medium: utmParams['utm_medium'] || null,
        utm_campaign: utmParams['utm_campaign'] || null,
        utm_id: utmParams['utm_id'] || null,
        utm_term: utmParams['utm_term'] || null,
        utm_content: utmParams['utm_content'] || null,
      },
    }

    const buckpayResponse = await fetch(
      'https://api.realtechdev.com.br/v1/transactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
          'User-Agent': 'Buckpay API',
        },
        body: JSON.stringify(payloadForBuckPay),
      }
    )

    const responseData = await buckpayResponse.json()

    if (!buckpayResponse.ok) {
      return NextResponse.json(
        {
          error: responseData.error?.message || 'Falha na BuckPay.',
          details: responseData.error?.detail,
        },
        { status: buckpayResponse.status }
      )
    }

    const buckpayData = responseData.data
    if (buckpayData?.id) {
      const utmifyPayload: UtmifyOrderPayload = {
        orderId: buckpayData.id,
        platform: 'Gordao',
        paymentMethod: 'pix',
        status: 'waiting_payment',
        createdAt: formatToUtmifyDate(new Date()),
        approvedDate: null,
        refundedAt: null,
        customer: {
          name,
          email,
          phone: phone.replace(/\D/g, ''),
          document: finalCpf,
          country: 'BR',
          ip,
        },
        products: items.map((item: any) => ({
          id: item.id || `prod_${Date.now()}`,
          name: item.title,
          planId: null,
          planName: null,
          quantity: item.quantity,
          priceInCents: Math.round(item.unitPrice * 100),
        })),
        trackingParameters: {
          src: utmParams['src'] || utmParams['utm_source'] || null,
          sck: utmParams['sck'] || null,
          utm_source: utmParams['utm_source'] || null,
          utm_campaign: utmParams['utm_campaign'] || null,
          utm_medium: utmParams['utm_medium'] || null,
          utm_content: utmParams['utm_content'] || null,
          utm_term: utmParams['utm_term'] || null,
        },
        commission: {
          totalPriceInCents: amountInCents,
          gatewayFeeInCents: 0,
          userCommissionInCents: amountInCents,
          currency: 'BRL',
        },
        isTest: false,
      }

      try {
        await sendOrderToUtmify(utmifyPayload)
      } catch (utmifyError: any) {
        console.error(
          `Erro ao enviar pedido pendente ${buckpayData.id} para Utmify:`,
          utmifyError
        )
      }
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error: any) {
    console.error('[create-payment POST] Erro fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const externalId = searchParams.get('externalId')

  if (!externalId) {
    return NextResponse.json({ error: 'externalId é obrigatório.' }, { status: 400 })
  }

  try {
    const apiToken = getBuckpayToken()

    const buckpayStatusResponse = await fetch(
      `https://api.realtechdev.com.br/v1/transactions/external_id/${externalId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Buckpay API',
        },
      }
    )

    if (buckpayStatusResponse.status === 404) {
      return NextResponse.json({ status: 'PENDING' }, { status: 200 })
    }

    const statusData = await buckpayStatusResponse.json()

    if (!buckpayStatusResponse.ok) {
      return NextResponse.json(
        {
          error: statusData.error?.message || 'Falha ao consultar status.',
          details: statusData.error?.detail,
        },
        { status: buckpayStatusResponse.status }
      )
    }

    const paymentStatus = statusData.data?.status?.toUpperCase() || 'UNKNOWN'
    return NextResponse.json({ status: paymentStatus }, { status: 200 })
  } catch (error: any) {
    console.error('[create-payment GET] Erro interno:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}