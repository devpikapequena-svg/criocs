'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePayment } from '@/context/PaymentContext'
import { FaCopy } from 'react-icons/fa'
import { FaPix } from 'react-icons/fa6' // se não tiver, troca por FaQrcode (react-icons/fa)

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatMMSS(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export default function PaymentPage() {
  const router = useRouter()
  const { pix, clearPix } = usePayment()

  const [copySuccess, setCopySuccess] = useState(false)

  // ===== Countdown / expiração =====
  const EXPIRY_MS = 10 * 60 * 1000 // 10 min fallback
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState<number>(0)

  const [pageMounted, setPageMounted] = useState(false)
  useEffect(() => setPageMounted(true), [])

  const orderId = useMemo(() => pix?.externalId || pix?.txid || '', [pix])

  const pixCode = useMemo(() => pix?.copyPaste || pix?.qrCode || '', [pix])

  const amount = useMemo(() => Number(pix?.amount || 0), [pix])

  const pixImageSrc = useMemo(() => {
    const base = pix?.qrCodeBase64
    if (!base) return ''
    if (base.startsWith('data:')) return base
    return `data:image/png;base64,${base}`
  }, [pix])

  const isExpired = !!expiresAtMs && remainingMs <= 0

  // Se entrar direto sem pix
  useEffect(() => {
    if (!pageMounted) return
    if (pix) return
    router.replace('/')
  }, [pageMounted, pix, router])

  // Define expiresAtMs (prioriza backend, senão fallback persistido)
  useEffect(() => {
    if (!pix) return

    if (pix.expiresAt) {
      const parsed = new Date(pix.expiresAt).getTime()
      if (!Number.isNaN(parsed)) {
        setExpiresAtMs(parsed)
        setRemainingMs(Math.max(0, parsed - Date.now()))
        return
      }
    }

    const storageKey = `pix_expiresAt_${orderId || 'no_order'}`
    const saved = sessionStorage.getItem(storageKey)

    let exp = saved ? Number(saved) : NaN
    if (!saved || Number.isNaN(exp)) {
      exp = Date.now() + EXPIRY_MS
      sessionStorage.setItem(storageKey, String(exp))
    }

    setExpiresAtMs(exp)
    setRemainingMs(Math.max(0, exp - Date.now()))
  }, [pix, orderId])

  // Countdown
  useEffect(() => {
    if (!expiresAtMs) return
    const tick = () => setRemainingMs(Math.max(0, expiresAtMs - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [expiresAtMs])

  // Expirou => limpa e volta
  useEffect(() => {
    if (!expiresAtMs) return
    if (Date.now() < expiresAtMs) return
    clearPix()
    router.replace('/')
  }, [expiresAtMs, clearPix, router])

  // Checar status e ir pra /sucesso
  useEffect(() => {
    if (!pageMounted) return
    if (!pix) return
    if (!orderId) return
    if (isExpired) return

    let alive = true
    let intervalId: number | null = null

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/create-payment?externalId=${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        const status = String(data?.status || '').toUpperCase()

        if (status === 'PAID' || status === 'APPROVED') {
          if (!alive) return

          try {
            sessionStorage.removeItem('checkout_pix_payload_v1')
            sessionStorage.removeItem(`pix_expiresAt_${orderId || 'no_order'}`)
          } catch {}

          clearPix()
          router.replace('/sucesso')
        }
      } catch {
        // ignora
      }
    }

    checkStatus()
    intervalId = window.setInterval(checkStatus, 3000)

    return () => {
      alive = false
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [pageMounted, pix, orderId, isExpired, clearPix, router])

  async function handleCopy() {
    if (!pixCode || isExpired) return
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1800)
    } catch {
      // fallback simples
      const ta = document.createElement('textarea')
      ta.value = pixCode
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1800)
    }
  }

  if (!pix) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[14px] font-semibold text-black/50">Carregando pagamento...</div>
      </main>
    )
  }

  if (!pixCode && !pixImageSrc) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="text-[14px] font-extrabold text-red-600">Dados do pagamento não encontrados.</div>
        <button
          onClick={() => {
            clearPix()
            router.push('/')
          }}
          className="mt-4 rounded-xl bg-black px-5 py-3 text-[13px] font-extrabold text-white"
        >
          Voltar ao início
        </button>
      </main>
    )
  }

  const progress = expiresAtMs ? Math.min(100, Math.max(0, (remainingMs / EXPIRY_MS) * 100)) : 100
  const timeLabel = expiresAtMs ? formatMMSS(remainingMs) : '10:00'

  return (
    <main className="min-h-screen bg-white">

      {/* conteúdo central */}
      <div className="mx-auto flex w-full max-w-[760px] flex-col items-center px-6 pb-12 pt-10">
        {/* ícone */}
        <div className="h-20 w-20 rounded-full border border-black/5 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center">
          {/* se FaPix não existir no seu projeto, troca por <FaQrcode className="text-[22px] text-[#009688]" /> */}
          <FaPix className="text-[22px] text-[#009688]" />
        </div>

        <h1 className="mt-6 text-[34px] font-medium text-[#3B5563]">Pagar com Pix</h1>
        <p className="mt-2 text-[14px] text-black/45">
          Escaneie o QR Code ou copie e cole o código Pix
        </p>

        {/* card do qr */}
        <div className="mt-10 w-full max-w-[520px] rounded-2xl bg-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold text-black/60">{formatBRL(amount)}</div>
            <div className="text-[14px] font-semibold text-black/50">Expira em {timeLabel}</div>
          </div>

          <div className="mt-6 flex justify-center">
            {pixImageSrc ? (
              <img
                src={pixImageSrc}
                alt="QR Code Pix"
                className="h-[210px] w-[210px] rounded-lg"
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div className="h-[210px] w-[210px] rounded-lg bg-black/5 flex items-center justify-center text-[12px] text-black/40">
                QR indisponível
              </div>
            )}
          </div>

          {/* progress */}
          <div className="mt-6 h-[4px] w-full rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full bg-[#35c24a]"
              style={{ width: `${progress}%`, transition: 'width 1s linear' }}
            />
          </div>
        </div>

        {/* botão copiar */}
        <button
          onClick={handleCopy}
          disabled={isExpired}
          className={[
            'mt-10 w-full max-w-[520px] rounded-xl px-6 py-4 text-[15px] font-extrabold text-white',
            'shadow-[0_14px_35px_rgba(0,0,0,0.12)] transition active:scale-[0.99]',
            isExpired ? 'bg-black/20 cursor-not-allowed' : 'bg-[#009688] hover:brightness-95',
          ].join(' ')}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <FaCopy className="text-[16px]" />
            {isExpired ? 'Pix expirado' : copySuccess ? 'Código copiado!' : 'Copiar código pix'}
          </span>
        </button>

        {/* código (opcional, escondido visualmente mas útil) */}
        <button
          type="button"
          onClick={handleCopy}
          disabled={isExpired}
          className="mt-4 text-[12px] text-black/35 hover:text-black/55 underline disabled:no-underline disabled:opacity-60"
          title={pixCode}
        >
          {isExpired ? 'Seu Pix expirou, volte e gere novamente.' : ''}
        </button>

        {/* input invisível só pra quem quiser ver o código (fica acessível) */}
        <input
          readOnly
          value={pixCode}
          className="sr-only"
          aria-label="Código Pix copia e cola"
        />
      </div>
    </main>
  )
}
