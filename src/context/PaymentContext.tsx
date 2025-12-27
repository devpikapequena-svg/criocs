'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type PixPayload = {
  // ajuste conforme o retorno real da sua API
  qrCodeBase64?: string // imagem base64 (ou url)
  qrCode?: string // texto do QR
  copyPaste?: string // "copia e cola"
  txid?: string
  expiresAt?: string
  amount?: number
  externalId?: string
  // você pode colocar mais campos do gateway aqui
}

type PaymentContextValue = {
  pix: PixPayload | null
  setPix: (data: PixPayload | null) => void
  clearPix: () => void
}

const PaymentContext = createContext<PaymentContextValue | null>(null)

const STORAGE_KEY = 'checkout_pix_payload_v1'

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const [pix, setPixState] = useState<PixPayload | null>(null)

  // carregar do sessionStorage ao abrir a página (pra sobreviver a refresh)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) setPixState(JSON.parse(raw))
    } catch {
      // ignora
    }
  }, [])

  const setPix = (data: PixPayload | null) => {
    setPixState(data)
    try {
      if (!data) sessionStorage.removeItem(STORAGE_KEY)
      else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // ignora
    }
  }

  const clearPix = () => setPix(null)

  const value = useMemo(() => ({ pix, setPix, clearPix }), [pix])

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
}

export function usePayment() {
  const ctx = useContext(PaymentContext)
  if (!ctx) throw new Error('usePayment must be used within PaymentProvider')
  return ctx
}
