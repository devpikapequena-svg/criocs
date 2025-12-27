'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface Product {
  id: number
  slug: string
  category: string
  name: string
  subtitle?: string
  price: number
  oldPrice?: number
  discount?: number
  promo: boolean
  image: string
}

interface CartItem {
  product: Product
  quantity: number
  detail?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, detail?: string) => void
  removeItem: (slug: string, detail?: string) => void
  increaseQty: (slug: string, detail?: string) => void
  decreaseQty: (slug: string, detail?: string) => void
  getTotalQuantity: () => number
  getSubtotal: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

 const addItem = (product: Product, detail?: string) => {
  setItems(prev => {
    const idx = prev.findIndex(i => i.product.slug === product.slug && i.detail === detail)
    if (idx !== -1) {
      return prev.map((item, i) =>
        i === idx ? { ...item, quantity: item.quantity + 1 } : item
      )
    }
    return [...prev, { product, quantity: 1, detail }]
  })
}
  const removeItem = (slug: string, detail?: string) => {
    setItems(prev => prev.filter(i => !(i.product.slug === slug && i.detail === detail)))
  }

const increaseQty = (slug: string, detail?: string) => {
  setItems(prev => {
    // Crie cópia do array
    const updatedItems = prev.map(item => {
      if (item.product.slug === slug && item.detail === detail) {
        // Retorne novo objeto com quantidade incrementada
        return { ...item, quantity: item.quantity + 1 }
      }
      return item
    })

    return updatedItems
  })
}
  const decreaseQty = (slug: string, detail?: string) => {
    setItems(prev => {
      const updated = [...prev]
      const idx = updated.findIndex(i => i.product.slug === slug && i.detail === detail)
      if (idx !== -1) {
        if (updated[idx].quantity > 1) {
          updated[idx].quantity -= 1
        } else {
          updated.splice(idx, 1)
        }
      }
      return updated
    })
  }

  const getTotalQuantity = () => items.reduce((acc, item) => acc + item.quantity, 0)

  const getSubtotal = () => items.reduce((acc, item) => acc + item.product.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, increaseQty, decreaseQty, getTotalQuantity, getSubtotal }}
    >
      {children}
    </CartContext.Provider>
  )
}