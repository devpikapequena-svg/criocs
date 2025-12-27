'use client'

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import './globals.css'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'
import { CartProvider } from '@/context/CartContext'
import { PaymentProvider } from '@/context/PaymentContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const META_PIXEL_ID = '868874045516079'


function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const isNotFoundPage = pathname === '/_not-found'

  useEffect(() => {
    if (isNotFoundPage) return

    setIsNavigating(true)
    const timer = setTimeout(() => setIsNavigating(false), 500)

    const handleLoad = () => {
      setIsNavigating(false)
      clearTimeout(timer)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
      const observer = new MutationObserver(() => {
        if (document.readyState === 'complete') {
          handleLoad()
          observer.disconnect()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      window.removeEventListener('load', handleLoad)
      clearTimeout(timer)
    }
  }, [pathname, searchParams, isNotFoundPage])

  // PageView em navegação SPA (App Router)
  useEffect(() => {
    if (isNotFoundPage) return
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }
  }, [pathname, searchParams, isNotFoundPage])

  return (
    <>
      {isNavigating && !isNotFoundPage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
          <div className="loading-spinner" />
        </div>
      )}

      <div
        className={cn(
          'min-h-screen bg-background font-sans antialiased transition-opacity duration-300',
          isNavigating && !isNotFoundPage ? 'opacity-0' : 'opacity-100'
        )}
      >
        {children}
      </div>
    </>
  )
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>Crio Caseira</title>
        <meta
          name="description"
          content="Crio Caseira"
        />
        <meta name="robots" content="index, follow" />

        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
        {/* End Meta Pixel Code */}
      </head>

      <body className={cn('overflow-y-scroll font-sans', inter.variable)}>
        {/* Meta Pixel (noscript) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>

        <CartProvider>
          <PaymentProvider>
            <Suspense fallback={null}>
              <LayoutContent>{children}</LayoutContent>
            </Suspense>
          </PaymentProvider>
        </CartProvider>
      </body>
    </html>
  )
}