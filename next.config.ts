// next.config.ts
import type { NextConfig } from 'next'
import WebpackObfuscator from 'webpack-obfuscator'

// Next já carrega .env.local automaticamente.
// NÃO use require('dotenv').config() aqui.

const nextConfig: NextConfig = {
  // (opcional) se você quer build passar mesmo com erro TS
  typescript: {
    ignoreBuildErrors: true,
  },

  // ❌ REMOVIDO: eslint (Next 16 não aceita mais eslint no next.config)
  // ❌ REMOVIDO: serverRuntimeConfig (Next 16 não aceita mais)
  // Use process.env direto no código do servidor (route handlers, services etc.)

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'logodownload.org', pathname: '/**' },
      { protocol: 'https', hostname: 'www.gematsu.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn-gop.garenanow.com', pathname: '/**' },
      { protocol: 'https', hostname: 'contentgarena-a.akamaihd.net', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
      { protocol: 'https', hostname: 'i.postimg.cc', pathname: '/**' },
      { protocol: 'https', hostname: 's2-ge.glbimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.s3.glbimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'p.novaskin.me', pathname: '/**' },
      { protocol: 'https', hostname: 'payment.boacompra.com', pathname: '/**' },
      { protocol: 'https', hostname: 'recargarjogo.help', pathname: '/**' },

      // cuidado: hostname: '**' pode dar problema em algumas versões do Next.
      // se der erro, remova esse fallback e liste os domínios que você usa.
      { protocol: 'https', hostname: '**', pathname: '/**' },
    ],
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
    ]
  },

  // Você usa WebpackObfuscator => isso é WEBPACK.
  // No Next 16 você precisa forçar o build com --webpack (abaixo eu te digo como).
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.plugins.push(
        new WebpackObfuscator(
          {
            compact: true,
            disableConsoleOutput: true,
            selfDefending: true,
            simplify: true,
            stringArray: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayThreshold: 0.75,
          },
          []
        )
      )
    }
    return config
  },
}

export default nextConfig