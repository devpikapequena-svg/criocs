'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePayment } from '@/context/PaymentContext'
import { FaLock, FaClock } from 'react-icons/fa'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-[14px] text-yellow-500">
          ★
        </span>
      ))}
    </div>
  )
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, '')
}

function formatBRPhone(digits: string) {
  // (11) 99999-9999 / (11) 9999-9999
  const d = onlyDigits(digits).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

type Errors = {
  name?: string
  email?: string
  phone?: string
  general?: string
}

function LoadingModal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-10 w-10 animate-spin text-[#0EA5A5]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 010 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
            />
          </svg>

          <p className="text-center text-[15px] font-extrabold text-black/90">Processando seu pedido...</p>
          <p className="text-center text-[12px] text-black/50">Por favor, aguarde...</p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { setPix } = usePayment()

  // ====== CONTADOR ======
  const [secondsLeft, setSecondsLeft] = useState(7 * 60 + 16)

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const hh = Math.floor(secondsLeft / 3600)
  const mm = Math.floor((secondsLeft % 3600) / 60)
  const ss = secondsLeft % 60

  // ====== FORM ======
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('+55')
  const [phone, setPhone] = useState('')

  // ====== ORDER BUMPS ======
  const basePrice = 39.9
  const [vip, setVip] = useState(false) // 14,90
  const [lifetime, setLifetime] = useState(false) // 9,90
  const vipPrice = 14.9
  const lifetimePrice = 9.9

  const total = useMemo(() => {
    let t = basePrice
    if (vip) t += vipPrice
    if (lifetime) t += lifetimePrice
    return t
  }, [vip, lifetime])

  // ====== UI state ======
  const [loading, setLoading] = useState(false)
  const [showLoadingModal, setShowLoadingModal] = useState(false)

  const [touched, setTouched] = useState({ name: false, email: false, phone: false })
  const [errors, setErrors] = useState<Errors>({})

  // refs pra scroll/focus
  const nameWrapRef = useRef<HTMLDivElement | null>(null)
  const emailWrapRef = useRef<HTMLDivElement | null>(null)
  const phoneWrapRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const phoneInputRef = useRef<HTMLInputElement | null>(null)

  const validate = () => {
    const next: Errors = {}

    const n = name.trim()
    if (!n) next.name = 'Informe seu nome.'
    else if (n.split(' ').filter(Boolean).length < 2) next.name = 'Digite seu nome e sobrenome.'

    const e = email.trim()
    if (!e) next.email = 'Informe seu e-mail.'
    else if (!isValidEmail(e)) next.email = 'E-mail inválido.'

    const digits = onlyDigits(phone)
    if (!digits) next.phone = 'Informe seu celular.'
    else if (countryCode === '+55' && digits.length < 10) next.phone = 'Celular inválido (DDD + número).'
    else if (countryCode !== '+55' && digits.length < 6) next.phone = 'Celular inválido.'

    setErrors((prev) => ({ ...prev, ...next, general: prev.general }))
    return next
  }

  const scrollToField = (field: 'name' | 'email' | 'phone') => {
    const map = {
      name: { wrap: nameWrapRef.current, input: nameInputRef.current },
      email: { wrap: emailWrapRef.current, input: emailInputRef.current },
      phone: { wrap: phoneWrapRef.current, input: phoneInputRef.current },
    }[field]

    if (map.wrap) {
      map.wrap.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => map.input?.focus(), 250)
    } else {
      map.input?.focus()
    }
  }

  function getUtmQuery() {
    if (typeof window === 'undefined') return {}
    const p = new URLSearchParams(window.location.search)
    const out: Record<string, string> = {}
    ;[
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'src',
      'sck',
      'fbclid',
      'gclid',
      'ttclid',
    ].forEach((k) => {
      const v = p.get(k)
      if (v) out[k] = v
    })
    return out
  }

  const handlePay = async () => {
    setTouched({ name: true, email: true, phone: true })
    setErrors((prev) => ({ ...prev, general: undefined }))

    const e = validate()
    const order: Array<'name' | 'email' | 'phone'> = ['name', 'email', 'phone']
    const first = order.find((k) => (e as any)[k])
    if (first) return scrollToField(first)

    setLoading(true)
    setShowLoadingModal(true)

    try {
      // monta itens (igual sua lógica do outro checkout)
      const checkoutItems = [
        {
          id: 'criocaseira',
          title: 'CrioCaseira',
          unitPrice: basePrice,
          quantity: 1,
          slug: 'criocaseira',
        },
        ...(vip
          ? [
              {
                id: 'vip',
                title: 'Suporte VIP: Contato Direto com Dra Dani',
                unitPrice: vipPrice,
                quantity: 1,
                slug: 'vip',
              },
            ]
          : []),
        ...(lifetime
          ? [
              {
                id: 'lifetime',
                title: 'Acesso Vitalício',
                unitPrice: lifetimePrice,
                quantity: 1,
                slug: 'acesso-vitalicio',
              },
            ]
          : []),
      ]

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: countryCode === '+55' ? onlyDigits(phone) : phone.trim(),
        cpf: '',
        cep: '',
        address: '',
        number: '',
        neighborhood: '',
        reference: '',
        amount: total,
        items: checkoutItems,
        externalId: `order_${Date.now()}`,
        utmQuery: getUtmQuery(),
        deliveryOption: 'PIX',
      }

      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // tenta mapear erros igual seu exemplo
        const apiErrors = (data as any)?.details || {}
        const inputErrors: Errors = {}

        if (apiErrors?.buyer) {
          const buyerMsg = String(apiErrors.buyer)

          if (buyerMsg.includes('Email inválido') || buyerMsg.toLowerCase().includes('email')) {
            inputErrors.email = 'E-mail inválido.'
          }

          if (
            buyerMsg.includes('telefone deve ter pelo menos 12 caracteres') ||
            buyerMsg.includes('telefone deve ter pelo menos 11 dígitos') ||
            buyerMsg.toLowerCase().includes('telefone')
          ) {
            inputErrors.phone = 'Telefone deve ter pelo menos 11 dígitos.'
          }
        }

        if (Object.keys(inputErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...inputErrors }))
          setShowLoadingModal(false)
          setLoading(false)
          const firstField = (['name', 'email', 'phone'] as const).find((k) => (inputErrors as any)[k])
          if (firstField) scrollToField(firstField)
          return
        }

        throw new Error((data as any)?.error || 'Erro desconhecido ao processar pagamento.')
      }

      const payment = (data as any)?.data ?? data

      // expires_at normalmente vem como string (ISO). Se não vier, cria 10 minutos a partir de agora.
      const expiresAt =
        payment?.pix?.expires_at ? String(payment.pix.expires_at) : new Date(Date.now() + 10 * 60 * 1000).toISOString()

      setPix({
        externalId: payment?.id || payload.externalId,
        // total_amount vem em centavos
        amount: (payment?.total_amount ?? Math.round(total * 100)) / 100,
        copyPaste: payment?.pix?.code || '',
        qrCodeBase64: payment?.pix?.qrcode_base64 || '',
        txid: payment?.id || payload.externalId,
        expiresAt,
      })

      router.push('/pagamento')
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, general: err?.message || 'Erro ao processar pagamento.' }))
      setShowLoadingModal(false)
      setLoading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const showNameError = touched.name && !!errors.name
  const showEmailError = touched.email && !!errors.email
  const showPhoneError = touched.phone && !!errors.phone

  return (
    <>
      <main className="min-h-screen bg-[#eef2f3] text-[#0B0B0B]">
        {/* TOP BAR */}
        <div className="sticky top-0 z-50 w-full bg-[#E65A0E]">
          <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-4 px-4 py-3">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <FaClock className="text-[16px]" />
              </div>
              <div className="text-[13px] font-extrabold">Última vaga com bônus gratuito</div>
            </div>

            <div className="flex items-center gap-2">
              {[
                { label: 'HORAS', value: pad2(hh) },
                { label: 'MIN', value: pad2(mm) },
                { label: 'SEG', value: pad2(ss) },
              ].map((b) => (
                <div key={b.label} className="min-w-[64px] rounded-md bg-white/15 px-3 py-2 text-center text-white">
                  <div className="text-[14px] font-extrabold leading-none">{b.value}</div>
                  <div className="mt-1 text-[10px] font-bold opacity-90">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-8">
          {/* HERO BANNER (IMAGEM ÚNICA) */}
          <section className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
            <img
              src="/quiz/checkout.png"
              alt="Banner CrioCaseira"
              className="block h-auto w-full select-none"
              draggable={false}
            />
          </section>

          {/* CONTENT */}
          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[1fr_380px]">
            {/* LEFT */}
            <div className="space-y-6">
              {/* Erro geral */}
              {errors.general && (
                <div className="rounded-2xl border border-red-500 bg-red-50 p-4 text-center text-[13px] font-extrabold text-red-700">
                  {errors.general}
                </div>
              )}

              {/* Produto */}
              <div className="rounded-2xl bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-black/5">
                    <img src="/quiz/logocrio.jpg" alt="CrioCaseira" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-black/50">Produto</div>
                    <div className="text-[14px] font-extrabold">CrioCaseira</div>
                  </div>
                </div>
              </div>

              {/* Dados + Pagamento */}
              <div className="rounded-2xl bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
                <div className="space-y-5">
                  {/* NOME */}
                  <div ref={nameWrapRef}>
                    <label className="text-[12px] font-bold text-black/60">Nome</label>
                    <input
                      ref={nameInputRef}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (touched.name) setErrors((prev) => ({ ...prev, name: undefined }))
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      disabled={loading}
                      placeholder="Seu nome completo"
                      aria-invalid={showNameError}
                      className={[
                        'mt-2 w-full rounded-xl border bg-white px-4 py-3 text-[14px] outline-none',
                        showNameError ? 'border-red-500 focus:border-red-500' : 'border-black/10 focus:border-[#1E6FA8]',
                      ].join(' ')}
                    />
                    {showNameError && <div className="mt-2 text-[12px] font-semibold text-red-600">{errors.name}</div>}
                  </div>

                  {/* EMAIL */}
                  <div ref={emailWrapRef}>
                    <label className="text-[12px] font-bold text-black/60">E-mail</label>
                    <input
                      ref={emailInputRef}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (touched.email) setErrors((prev) => ({ ...prev, email: undefined }))
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      disabled={loading}
                      placeholder="Seu melhor e-mail"
                      aria-invalid={showEmailError}
                      className={[
                        'mt-2 w-full rounded-xl border bg-white px-4 py-3 text-[14px] outline-none',
                        showEmailError ? 'border-red-500 focus:border-red-500' : 'border-black/10 focus:border-[#1E6FA8]',
                      ].join(' ')}
                    />
                    {showEmailError && <div className="mt-2 text-[12px] font-semibold text-red-600">{errors.email}</div>}
                  </div>

                  {/* CELULAR */}
                  <div ref={phoneWrapRef}>
                    <label className="text-[12px] font-bold text-black/60">Celular com DDD</label>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={loading}
                        className="w-[120px] rounded-xl border border-black/10 bg-white px-3 py-3 text-[14px] outline-none focus:border-[#1E6FA8]"
                      >
                        <option value="+55">🇧🇷 +55</option>
                        <option value="+351">🇵🇹 +351</option>
                        <option value="+1">🇺🇸 +1</option>
                      </select>

                      <input
                        ref={phoneInputRef}
                        value={phone}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (countryCode === '+55') setPhone(formatBRPhone(raw))
                          else setPhone(raw.replace(/[^\d\s()+-]/g, '').slice(0, 20))
                          if (touched.phone) setErrors((prev) => ({ ...prev, phone: undefined }))
                        }}
                        onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                        disabled={loading}
                        inputMode="tel"
                        placeholder={countryCode === '+55' ? '(11) 99999-9999' : 'Seu celular'}
                        aria-invalid={showPhoneError}
                        className={[
                          'flex-1 rounded-xl border bg-white px-4 py-3 text-[14px] outline-none',
                          showPhoneError ? 'border-red-500 focus:border-red-500' : 'border-black/10 focus:border-[#1E6FA8]',
                        ].join(' ')}
                      />
                    </div>
                    {showPhoneError && <div className="mt-2 text-[12px] font-semibold text-red-600">{errors.phone}</div>}
                  </div>
                </div>

                <div className="my-6 h-px w-full bg-black/10" />

                {/* Oferta */}
                <div>
                  <div className="text-[12px] font-extrabold text-black/70">Oferta</div>
                  <div className="mt-2 text-[13px] text-black/60">
                    <div>
                      <span className="font-bold text-[#0F766E]">R$ 39,90</span> à vista
                    </div>
                    <div className="mt-1">Acesso vitalício</div>
                  </div>
                </div>

                <div className="my-6 h-px w-full bg-black/10" />

                {/* Pix */}
                <div>
                  <div className="text-[12px] font-extrabold text-black/70">Forma de pagamento</div>
                  <div className="mt-3 rounded-2xl border border-[#0EA5A5]/30 bg-[#E6FFFB] p-4">
                    <div className="text-[13px] font-extrabold text-[#0F766E]">Pix selecionado</div>
                    <div className="mt-1 text-[12px] text-black/60">
                      Clique em <b>Gerar Pix</b> para receber o QR Code e o código copia e cola.
                    </div>
                  </div>
                </div>

                {/* Upsells */}
                <div className="mt-6 space-y-4">
                  {/* VIP */}
                  <div className="rounded-2xl border border-dashed border-yellow-400 bg-[#FFF9E6] p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl bg-black/5">
                        <img src="/quiz/suportevip.png" alt="VIP" className="h-full w-full object-cover" draggable={false} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-extrabold">Suporte VIP: Contato Direto com Dra Dani</div>
                        <p className="mt-1 text-[12px] text-black/60">
                          Tire suas dúvidas com prioridade diretamente com a criadora da CrioCaseira. Receba orientação individual,
                          respostas rápidas e dicas personalizadas.
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[14px] font-extrabold text-[#0F766E]">{formatBRL(vipPrice)}</span>
                          <span className="text-[12px] text-black/40 line-through">{formatBRL(97)}</span>
                          <span className="ml-auto rounded-full bg-[#0EA5A5] px-2 py-1 text-[11px] font-extrabold text-white">
                            85%
                          </span>
                        </div>
                      </div>
                    </div>

                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                      <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} className="h-4 w-4" />
                      Quero Comprar Junto
                    </label>
                  </div>

                  {/* Acesso Vitalício */}
                  <div className="rounded-2xl border border-dashed border-yellow-400 bg-[#FFF9E6] p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl bg-black/5">
                        <img src="/quiz/acesso.png" alt="Acesso Vitalício" className="h-full w-full object-cover" draggable={false} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-extrabold">Acesso Vitalício</div>
                        <p className="mt-1 text-[12px] text-black/60">
                          Garanta acesso vitalício ao protocolo CrioCaseira™ e receba sempre novidades, atualizações e materiais extras.
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[14px] font-extrabold text-[#0F766E]">{formatBRL(lifetimePrice)}</span>
                          <span className="text-[12px] text-black/40 line-through">{formatBRL(67)}</span>
                          <span className="ml-auto rounded-full bg-[#0EA5A5] px-2 py-1 text-[11px] font-extrabold text-white">
                            85%
                          </span>
                        </div>
                      </div>
                    </div>

                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                      <input
                        type="checkbox"
                        checked={lifetime}
                        onChange={(e) => setLifetime(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Quero Comprar Junto
                    </label>
                  </div>
                </div>

                {/* Resumo */}
                <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[13px] font-extrabold">CrioCaseira</div>
                      <div className="text-[12px] text-black/50">Pagamento único</div>
                    </div>
                    <div className="text-[13px] font-extrabold">{formatBRL(basePrice)}</div>
                  </div>

                  {vip && (
                    <div className="mt-3 flex items-start justify-between">
                      <div>
                        <div className="text-[12px] font-bold">Suporte VIP</div>
                        <div className="text-[11px] text-black/50">Adicional</div>
                      </div>
                      <div className="text-[12px] font-extrabold">{formatBRL(vipPrice)}</div>
                    </div>
                  )}

                  {lifetime && (
                    <div className="mt-3 flex items-start justify-between">
                      <div>
                        <div className="text-[12px] font-bold">Acesso Vitalício</div>
                        <div className="text-[11px] text-black/50">Adicional</div>
                      </div>
                      <div className="text-[12px] font-extrabold">{formatBRL(lifetimePrice)}</div>
                    </div>
                  )}

                  <div className="my-4 h-px w-full bg-black/10" />

                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-extrabold">Total</div>
                    <div className="text-[14px] font-extrabold">{formatBRL(total)} à vista</div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handlePay}
                  disabled={loading}
                  className="mt-6 w-full rounded-2xl bg-[#0EA5A5] py-4 text-[15px] font-extrabold text-white shadow-[0_16px_34px_rgba(0,0,0,0.15)] hover:brightness-95 active:scale-[0.99] disabled:opacity-70"
                >
                  {loading ? 'Processando...' : 'Gerar Pix'}
                </button>

                <div className="mt-4 text-center text-[11px] text-black/50">
                  Ao prosseguir você concorda com os <span className="font-bold text-[#0EA5A5]">Termos de uso</span> e{' '}
                  <span className="font-bold text-[#0EA5A5]">Política de privacidade</span>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-black/50">
                  <FaLock className="text-[13px]" /> Compra segura
                </div>
              </div>
            </div>

            {/* RIGHT - DEPOIMENTOS */}
            <aside className="space-y-6">
              <div className="rounded-2xl bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 overflow-hidden rounded-full bg-black/5">
                    <img src="/quiz/anamaria.png" alt="Ana Maria" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-extrabold">Ana Maria</div>
                    <div className="text-[12px] text-black/50">Florianópolis, SC</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-black/[0.03] p-4 text-[13px] leading-relaxed text-black/70">
                  “Nunca imaginei que uma garrafa e dois ingredientes que eu já tinha em casa fariam tanta diferença.
                  Em <b>menos de 2 semanas</b>, minha barriga desinchou, minhas calças voltaram a servir e o mais importante:
                  <b> voltei a me olhar no espelho com orgulho.</b> Obrigada!” <span className="ml-1">💖</span>
                </div>

                <div className="mt-4">
                  <Stars />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 overflow-hidden rounded-full bg-black/5">
                    <img src="/quiz/marilia.png" alt="Marília Souza" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-extrabold">Marília Souza</div>
                    <div className="text-[12px] text-black/50">São Paulo, SP</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-black/[0.03] p-4 text-[13px] leading-relaxed text-black/70">
                  “Confesso que comprei desconfiada… Mas já na primeira semana vi diferença no espelho:
                  minhas calças ficaram mais largas e a barriga menos inchada. Hoje já perdi 5 quilos e posso dizer com certeza:
                  funciona sim.”
                </div>

                <div className="mt-4">
                  <Stars />
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <LoadingModal isOpen={showLoadingModal} />
    </>
  )
}
