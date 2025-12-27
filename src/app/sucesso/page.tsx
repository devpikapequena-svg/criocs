'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePayment } from '@/context/PaymentContext'
import {
  FaCheckCircle,
  FaLock,
  FaWhatsapp,
  FaDownload,
  FaHome,
  FaReceipt,
} from 'react-icons/fa'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function maskEmail(email: string) {
  const e = email.trim()
  const at = e.indexOf('@')
  if (at <= 1) return e
  const name = e.slice(0, at)
  const domain = e.slice(at)
  return `${name[0]}***${name[name.length - 1]}${domain}`
}

export default function SuccessPage() {
  const router = useRouter()
  const { pix, clearPix } = usePayment()

  // se você salva nome/email no pix payload, ele aparece; senão mostra fallback elegante
  const buyerName = useMemo(() => (pix as any)?.buyerName || (pix as any)?.name || '', [pix])
  const buyerEmail = useMemo(() => (pix as any)?.buyerEmail || (pix as any)?.email || '', [pix])

  const orderId = useMemo(() => pix?.externalId || pix?.txid || '', [pix])
  const amount = useMemo(() => Number(pix?.amount || 0), [pix])

  // confete simples (CSS) sem lib
  const [showConfetti, setShowConfetti] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2500)
    return () => clearTimeout(t)
  }, [])

  // se cair aqui sem contexto, manda pra home
  useEffect(() => {
    if (!pix) router.replace('/')
  }, [pix, router])

  function handleGoHome() {
    try {
      sessionStorage.removeItem('checkout_pix_payload_v1')
      if (orderId) sessionStorage.removeItem(`pix_expiresAt_${orderId}`)
    } catch {}
    clearPix()
    router.push('/')
  }

  // links (ajusta)
  const WHATSAPP_LINK = 'https://wa.me/55XXXXXXXXXXX' // <-- troca
  const DOWNLOAD_LINK = '/arquivo' // <-- troca: ex /downloads/criocaseira.pdf

  if (!pix) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[14px] font-semibold text-black/50">Carregando...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {/* topo minimal (lastlink style) */}
      <div className="h-14 px-6 flex items-center">
        <div className="flex items-center gap-2 select-none">
          <div className="h-8 w-8 rounded-full bg-[#2bd673]/15 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-[#2bd673]" />
          </div>
          <span className="text-[18px] font-extrabold text-black">lastlink</span>
        </div>
      </div>

      {/* confetti */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {Array.from({ length: 26 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-[-10px] h-[8px] w-[14px] rounded-sm opacity-80"
              style={{
                left: `${(i * 3.7) % 100}%`,
                animation: `fall ${1600 + (i % 7) * 220}ms linear ${i * 35}ms forwards`,
                background:
                  i % 5 === 0
                    ? '#009688'
                    : i % 5 === 1
                    ? '#35c24a'
                    : i % 5 === 2
                    ? '#f59e0b'
                    : i % 5 === 3
                    ? '#60a5fa'
                    : '#a78bfa',
              }}
            />
          ))}
          <style jsx>{`
            @keyframes fall {
              to {
                transform: translateY(110vh) rotate(240deg);
                opacity: 0.2;
              }
            }
          `}</style>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[760px] flex-col items-center px-6 pb-14 pt-10">
        {/* ícone */}
        <div className="h-20 w-20 rounded-full border border-black/5 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center">
          <FaCheckCircle className="text-[30px] text-[#35c24a]" />
        </div>

        <h1 className="mt-6 text-center text-[34px] font-medium text-[#3B5563]">
          Pagamento aprovado!
        </h1>
        <p className="mt-2 text-center text-[14px] text-black/45">
          Seu acesso foi liberado. Você já pode começar agora.
        </p>

        {/* card resumo */}
        <div className="mt-10 w-full max-w-[520px] rounded-2xl border border-black/10 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)] px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-black/60">
              <FaReceipt className="text-[14px]" />
              <span className="text-[13px] font-semibold">Comprovante</span>
            </div>
            <div className="text-[13px] font-semibold text-black/45">{orderId ? `Pedido ${orderId}` : ''}</div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[12px] font-bold text-black/50">Valor</div>
              <div className="mt-1 text-[18px] font-extrabold text-black">
                {formatBRL(amount || 0)}
              </div>
            </div>

            <div>
              <div className="text-[12px] font-bold text-black/50">Status</div>
              <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#35c24a]/10 px-3 py-1.5 text-[12px] font-extrabold text-[#2f9e44]">
                <span className="h-2 w-2 rounded-full bg-[#35c24a]" />
                Aprovado
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-[12px] font-bold text-black/50">Enviado para</div>
              <div className="mt-1 text-[13px] font-semibold text-black/70">
                {buyerEmail ? maskEmail(buyerEmail) : 'Seu e-mail cadastrado'}
                {buyerName ? <span className="text-black/40"> • {buyerName}</span> : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-black/45">
            <FaLock className="text-[12px]" />
            Compra segura — seus dados estão protegidos
          </div>
        </div>

        {/* ações */}
        <div className="mt-10 w-full max-w-[520px] space-y-3">
          <a
            href={DOWNLOAD_LINK}
            className="w-full rounded-xl bg-[#009688] px-6 py-4 text-center text-[15px] font-extrabold text-white shadow-[0_14px_35px_rgba(0,0,0,0.12)] hover:brightness-95 active:scale-[0.99] transition inline-flex items-center justify-center gap-2"
          >
            <FaDownload className="text-[16px]" />
            Acessar / Baixar agora
          </a>

          <button
            onClick={handleGoHome}
            className="w-full rounded-xl border border-black/10 bg-white px-6 py-4 text-center text-[14px] font-extrabold text-black/60 hover:bg-black/[0.03] active:scale-[0.99] transition inline-flex items-center justify-center gap-2"
          >
            <FaHome className="text-[16px]" />
            Voltar ao início
          </button>
        </div>

        <p className="mt-8 max-w-[520px] text-center text-[12px] text-black/35">
          Se você não encontrar o e-mail na caixa de entrada, verifique também <b>Spam</b> ou <b>Promoções</b>.
        </p>
      </div>
    </main>
  )
}
