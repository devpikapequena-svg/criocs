'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

export default function VslPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [muted, setMuted] = useState(false)

  const [hasStarted, setHasStarted] = useState(false)

  const maxWatchedRef = useRef(0)
  const isProgrammaticRef = useRef(false)

  const CTA_TIME = 7 * 60
  const [showCTA, setShowCTA] = useState(false)

  const barRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

  const getSafeDuration = (v: HTMLVideoElement) => {
    const d = v.duration
    return Number.isFinite(d) && d > 0 ? d : 0
  }

  const play = async () => {
    const v = videoRef.current
    if (!v) return
    try {
      await v.play()
    } catch {}
  }

  const pause = () => {
    const v = videoRef.current
    if (!v) return
    v.pause()
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) play()
    else pause()
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    const next = !v.muted
    v.muted = next
    setMuted(next)
  }

  const allowedTime = () => maxWatchedRef.current

  const seekTo = (t: number) => {
    const v = videoRef.current
    if (!v) return
    const d = getSafeDuration(v)
    if (!d) return
    v.currentTime = clamp(t, 0, d)
  }

  const trySeek = (targetTime: number) => {
    const v = videoRef.current
    if (!v) return
    const d = getSafeDuration(v)
    if (!d) return

    const maxAllowed = allowedTime() + 0.25
    const next = targetTime <= maxAllowed ? targetTime : allowedTime()

    seekTo(next)
    setCurrent(next)
  }

  const timeFromClientX = (clientX: number) => {
    const bar = barRef.current
    const v = videoRef.current
    if (!bar || !v) return 0

    const d = getSafeDuration(v)
    if (!d) return 0

    const rect = bar.getBoundingClientRect()
    const pct = (clientX - rect.left) / rect.width
    return clamp(pct, 0, 1) * d
  }

  const onPointerDownBar = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    draggingRef.current = true
    const t = timeFromClientX(e.clientX)
    trySeek(Math.min(t, allowedTime()))
  }

  const onPointerMoveBar = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const t = timeFromClientX(e.clientX)
    trySeek(Math.min(t, allowedTime()))
  }

  const stopDrag = () => {
    draggingRef.current = false
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const syncDuration = () => {
      const d = getSafeDuration(v)
      if (d && d !== duration) setDuration(d)
    }

    const onLoaded = () => {
      syncDuration()
      setMuted(v.muted)
      setCurrent(v.currentTime || 0)
      maxWatchedRef.current = Math.max(maxWatchedRef.current, v.currentTime || 0)
    }

    const onTimeUpdate = () => {
      syncDuration()
      const t = v.currentTime || 0
      setCurrent(t)
      if (t > maxWatchedRef.current) maxWatchedRef.current = t
      if (!showCTA && t >= CTA_TIME) setShowCTA(true)
    }

    const onPlayEv = () => {
      setIsPlaying(true)
      setHasStarted(true)
    }

    const onPauseEv = () => setIsPlaying(false)

    const onSeeking = () => {
      if (isProgrammaticRef.current) return
      const target = v.currentTime || 0
      const maxAllowed = allowedTime() + 0.25
      if (target > maxAllowed) {
        isProgrammaticRef.current = true
        v.currentTime = allowedTime()
        setTimeout(() => {
          isProgrammaticRef.current = false
        }, 60)
      }
    }

    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('loadeddata', onLoaded)
    v.addEventListener('durationchange', syncDuration)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('play', onPlayEv)
    v.addEventListener('pause', onPauseEv)
    v.addEventListener('seeking', onSeeking)

    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('loadeddata', onLoaded)
      v.removeEventListener('durationchange', syncDuration)
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('play', onPlayEv)
      v.removeEventListener('pause', onPauseEv)
      v.removeEventListener('seeking', onSeeking)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCTA])

  const progressPct = useMemo(() => {
    const v = videoRef.current
    const d = v ? getSafeDuration(v) : duration
    if (!d) return 0
    return (current / d) * 100
  }, [current, duration])

  const allowedPct = useMemo(() => {
    const v = videoRef.current
    const d = v ? getSafeDuration(v) : duration
    if (!d) return 0
    return (allowedTime() / d) * 100
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, current])

  return (
    <main className="min-h-screen bg-white text-[#0B0B0B]">
      <div className="mx-auto w-full max-w-[520px] px-4 pt-6 pb-28">
        <header className="text-center">
          <h1 className="mx-auto max-w-[430px] text-[18px] sm:text-[20px] leading-[1.35] font-medium tracking-[-0.01em]">
            A <span className="font-extrabold">Impressionante</span>{' '}
            <span className="font-medium">Criolipólise Caseira</span> Que{' '}
            <span className="font-extrabold">Congela e Expulsa</span>{' '}
            <span className="font-extrabold text-[#E11D48]">4,6Kg</span>{' '}
            <span className="font-medium">em uma Semana</span>
          </h1>

          <p className="mt-2 text-[12px] sm:text-[13px] text-black/55">
            Assista ao vídeo abaixo (com áudio).
          </p>
        </header>

        <section className="mt-4">
          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-black shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-28 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute -bottom-28 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
            </div>

            <div className="relative w-full pt-[177.78%]">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                src="/crio.mp4"
                poster="/preview.png"
                playsInline
                preload="metadata"
                controls={false}
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
              />

              {!hasStarted && (
                <div className="absolute inset-0 z-20">
                  <img
                    src="/preview.png"
                    alt="Prévia do vídeo"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />

                  <button
                    type="button"
                    onClick={play}
                    className="absolute inset-0 flex items-center justify-center bg-black/25"
                    aria-label="Iniciar vídeo"
                  >
                    <div className="rounded-full bg-white px-6 py-4 text-[15px] font-extrabold text-black shadow-[0_16px_40px_rgba(0,0,0,0.35)] active:scale-[0.98] transition">
                      ▶ Play
                    </div>
                  </button>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 z-40 p-3">
                <div className="rounded-xl bg-black/55 backdrop-blur px-3 py-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="rounded-lg bg-white/10 px-3 py-2 text-white hover:bg-white/15 transition"
                      aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                      title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    >
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      className="rounded-lg bg-white/10 px-3 py-2 text-white hover:bg-white/15 transition"
                      aria-label={muted ? 'Ativar som' : 'Mutar'}
                      title={muted ? 'Ativar som' : 'Mutar'}
                    >
                      {muted ? <FaVolumeMute /> : <FaVolumeUp />}
                    </button>
                  </div>

                  <div className="mt-2">
                    <div
                      ref={barRef}
                      onPointerDown={onPointerDownBar}
                      onPointerMove={onPointerMoveBar}
                      onPointerUp={stopDrag}
                      onPointerCancel={stopDrag}
                      className="relative h-3 w-full touch-none select-none rounded-full bg-white/15"
                      aria-label="Progresso"
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-white/25"
                        style={{ width: `${allowedPct}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-white"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {!showCTA && (
                      <p className="mt-2 text-center text-[11px] text-white/70">
                        Você pode voltar o vídeo, mas não pode avançar.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!showCTA && (
          <div className="mt-3 rounded-xl border border-black/10 bg-[#FAFAFA] px-3 py-2 text-center">
            <p className="text-[12px] text-black/70">Continue assistindo para liberar o acesso.</p>
          </div>
        )}

        {showCTA && (
          <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-[520px] -translate-x-1/2 px-4">
            <button
              onClick={() => router.push('/crio')}
              className="w-full rounded-2xl bg-[#22C55E] py-4 text-[15px] font-extrabold text-white shadow-[0_0_0_0_rgba(34,197,94,0.7)] animate-pulseGreen"
            >
              QUERO COMEÇAR AGORA
            </button>
          </div>
        )}

        <style jsx>{`
          @keyframes pulseGreen {
            0% {
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.65);
              transform: scale(1);
            }
            70% {
              box-shadow: 0 0 0 18px rgba(34, 197, 94, 0);
              transform: scale(1.02);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
              transform: scale(1);
            }
          }
          .animate-pulseGreen {
            animation: pulseGreen 1.6s infinite;
          }
        `}</style>
      </div>
    </main>
  )
}
