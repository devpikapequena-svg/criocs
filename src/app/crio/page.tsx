// src/app/quiz/page.tsx
'use client'

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

function RulerPicker({
  min,
  max,
  value,
  onChange,
  unitPx = 10,
  majorStep = 10,
  minorStep = 1,
  labelEvery = 10,
}: {
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  unitPx?: number
  majorStep?: number
  minorStep?: number
  labelEvery?: number
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [sidePad, setSidePad] = useState(0)

  const rafRef = useRef<number | null>(null)
  const isUserRef = useRef(false)

  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

  const count = useMemo(() => Math.floor((max - min) / minorStep) + 1, [min, max, minorStep])
  const trackWidth = useMemo(() => (count - 1) * unitPx, [count, unitPx])

  // ✅ com spacers (W/2): scrollLeft 0 corresponde ao MIN no ponteiro
  const valueToScrollLeft = (v: number) => {
    const clamped = clamp(v, min, max)
    return ((clamped - min) / minorStep) * unitPx
  }

  const scrollLeftToValue = (scrollLeft: number) => {
    const raw = scrollLeft / unitPx
    const stepped = Math.round(raw) * minorStep
    return clamp(min + stepped, min, max)
  }

  const scrollToValue = (v: number, behavior: ScrollBehavior = 'auto') => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: valueToScrollLeft(v), behavior })
  }

  // spacer = metade da largura do container (pra centralizar o min/max no ponteiro)
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const measure = () => {
      const w = el.clientWidth || 0
      setSidePad(Math.floor(w / 2))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // posiciona certinho ao montar (após medir)
  useEffect(() => {
    if (!sidePad) return
    const v = clamp(value, min, max)

    // 2 RAFs = garante layout aplicado antes do scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToValue(v, 'auto')
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidePad, min, max])

  // se value mudar por fora e usuário não estiver arrastando, reposiciona
  useEffect(() => {
    if (!sidePad) return
    if (isUserRef.current) return
    scrollToValue(clamp(value, min, max), 'auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, unitPx, minorStep, sidePad])

  const handleScroll = () => {
    const el = scrollerRef.current
    if (!el) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      onChange(scrollLeftToValue(el.scrollLeft))
    })
  }

  const snap = () => {
    const el = scrollerRef.current
    if (!el) return
    const v = scrollLeftToValue(el.scrollLeft)
    scrollToValue(v, 'smooth')
  }

  const onDown = () => {
    isUserRef.current = true
  }

  const onUp = () => {
    isUserRef.current = false
    snap()
  }

  return (
    <div className="relative">
      {/* ponteiro fixo */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <div className="mx-auto h-[56px] w-[4px] rounded-full bg-[#2F6F9E]" />
        <div
          className="mx-auto mt-[-2px] h-0 w-0"
          style={{
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '12px solid #2F6F9E',
          }}
        />
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onTouchStart={onDown}
        onTouchEnd={onUp}
        className="w-full overflow-x-auto rounded-2xl border border-black/10 bg-white py-4"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* spacer ESQ + trilho + spacer DIR */}
        <div className="flex items-start" style={{ height: 70 }}>
          <div style={{ width: sidePad, flex: '0 0 auto' }} />

          <div className="relative" style={{ width: trackWidth, flex: '0 0 auto', height: 70 }}>
            {Array.from({ length: count }).map((_, i) => {
              const v = min + i * minorStep
              const isMajor = v % majorStep === 0
              const showLabel = v % labelEvery === 0

              return (
                <div key={v} className="absolute bottom-0" style={{ left: i * unitPx }}>
                  <div
                    className="bg-black/15"
                    style={{
                      width: isMajor ? 2 : 1,
                      height: isMajor ? 34 : 16,
                      borderRadius: 999,
                      marginLeft: isMajor ? 0 : 0.5,
                    }}
                  />
                  {showLabel && (
                    <div className="mt-4 -translate-x-1/2 text-center text-[12px] text-black/45">{v}</div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ width: sidePad, flex: '0 0 auto' }} />
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-black/45">Arraste para selecionar</p>
    </div>
  )
}

type Answers = {
  kilos?: string
  corpo?: 'Definido' | 'Magro' | 'Cheinha' | 'Plus'
  area?: 'Barriga/Abdômen' | 'Culotes/Flancos' | 'Coxas/Pernas' | 'Glúteos' | 'Braços'
  pesoKg?: number
  alturaCm?: number
  pesoDesejadoKg?: number
  rotina?: 'Corrida' | 'Casa' | 'Flexível' | 'TrabalhoFora'
  sono?: 'Menos5' | 'Entre5e7' | 'Entre7e9' | 'Mais9'
  corpoSonhos?: 'Em Forma' | 'Com Curvas' | 'Definido' | 'Natural'
}

const cardBase =
  'w-full rounded-xl bg-[#E6F4F6] border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.08)] transition active:scale-[0.99]'

export default function QuizPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const [answers, setAnswers] = useState<Answers>({
    pesoKg: 40, // ✅ 40..150
    alturaCm: 130, // ✅ 130..200
    pesoDesejadoKg: 60,
  })

  // passos: 0..13 (14 telas)
  const totalSteps = 14

  // ✅ barra do topo SÓ até o step do sono (step 0..8)
  const showTopProgress = step <= 8
  const topProgress = useMemo(() => ((step + 1) / totalSteps) * 100, [step])

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const pesoKg = useMemo(() => Math.round(answers.pesoKg ?? 40), [answers.pesoKg])
  const alturaCm = useMemo(() => Math.round(answers.alturaCm ?? 130), [answers.alturaCm])
  const pesoDesejadoKg = useMemo(() => Math.round(answers.pesoDesejadoKg ?? 60), [answers.pesoDesejadoKg])

  // =========================
  // ✅ IMC FIXO (sempre acima de sobrepeso)
  // =========================
  const FIXED_IMC = 24.42
  const FIXED_MARKER_PCT = 56
  const FIXED_ZONE_LABEL = 'Zona de Alerta'

  // =========================
  // “Analisando” (sem spinner)
  // =========================
  const [analysisPct, setAnalysisPct] = useState(0)
  useEffect(() => {
    if (step !== 9) return

    setAnalysisPct(0)
    let pct = 0

    const tick = setInterval(() => {
      const inc = pct < 70 ? 3 : pct < 90 ? 2 : 1
      pct = Math.min(100, pct + inc)
      setAnalysisPct(pct)
      if (pct >= 100) {
        clearInterval(tick)
        setTimeout(() => setStep(10), 350)
      }
    }, 70)

    return () => clearInterval(tick)
  }, [step])

  // =========================
  // “Gerando…” (sem spinner)
  // =========================
  const [genPct, setGenPct] = useState(0)
  useEffect(() => {
    if (step !== 12) return

    setGenPct(0)
    let pct = 0

    const tick = setInterval(() => {
      const inc = pct < 70 ? 4 : pct < 92 ? 2 : 1
      pct = Math.min(100, pct + inc)
      setGenPct(pct)
      if (pct >= 100) {
        clearInterval(tick)
        setTimeout(() => setStep(13), 350)
      }
    }, 80)

    return () => clearInterval(tick)
  }, [step])

  // texto do “Perda em 3 semanas” (bem simples, baseado na escolha)
  const meta3Semanas = useMemo(() => {
    const k = answers.kilos || 'Até 5 kg'
    if (k === 'Mais de 20 kg') return 'Perca até 10 kg em 3 semanas'
    if (k === 'De 16 a 20 kg') return 'Perca até 8 kg em 3 semanas'
    if (k === 'De 11 a 15 kg') return 'Perca até 6 kg em 3 semanas'
    if (k === 'De 6 a 10 kg') return 'Perca até 5 kg em 3 semanas'
    return 'Perca até 5 kg em 3 semanas'
  }, [answers.kilos])

  return (
    <main className="min-h-screen bg-white text-[#0B0B0B]">
      <div className="mx-auto w-full max-w-[640px] px-5 pt-8 pb-10">
        {/* LOGO */}
        <div className="flex items-center justify-center">
          <img src="/logo.png" alt="CrioCaseira" className="h-8 w-auto" />
        </div>

        {/* TOP PROGRESS (só até o sono) */}
        {showTopProgress && (
          <div className="mt-7 h-2 w-full rounded-full bg-black/5 overflow-hidden">
            <div className="h-full bg-[#2F6F9E]" style={{ width: `${topProgress}%` }} />
          </div>
        )}

        {/* 0) QUILOS */}
        {step === 0 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">Quantos quilos você gostaria de eliminar?</h1>
            <p className="mt-3 text-center text-[13px] text-black/70">
              O protocolo da CrioCaseira foi desenvolvido para <b>eliminar gordura localizada</b> de forma{' '}
              <b className="underline">segura</b> e <b className="underline">acelerada</b>
            </p>

            <div className="mt-8 space-y-3">
              {['Até 5 kg', 'De 6 a 10 kg', 'De 11 a 15 kg', 'De 16 a 20 kg', 'Mais de 20 kg'].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, kilos: v }))
                    next()
                  }}
                  className={`${cardBase} px-5 py-4 text-left text-[15px] font-medium`}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 1) CORPO */}
        {step === 1 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">
              Como você classificaria seu <span className="text-[#2F6F9E]">corpo</span> hoje?
            </h1>
            <p className="mt-3 text-center text-[13px] text-black/70">
              Essa resposta ajuda a ajustar o plano ideal de <b className="underline">aplicação do frio</b>
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: 'Definido', img: '/quiz/definido.png' },
                { label: 'Magro', img: '/quiz/magro.png' },
                { label: 'Cheinha', img: '/quiz/cheinha.png' },
                { label: 'Plus', img: '/quiz/plus.png' },
              ].map((it) => (
                <button
                  key={it.label}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, corpo: it.label as Answers['corpo'] }))
                    next()
                  }}
                  className={`${cardBase} p-4`}
                >
                  <div className="w-full rounded-lg bg-white/40 border border-black/5 overflow-hidden">
                    <img src={it.img} alt={it.label} className="h-[120px] w-full object-contain" />
                  </div>
                  <div className="mt-3 text-center text-[14px] font-medium">{it.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button onClick={back} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 2) ÁREA */}
        {step === 2 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">
              Qual área do seu corpo você mais quer reduzir <span className="text-[#2F6F9E]">gordura</span>?
            </h1>
            <p className="mt-3 text-center text-[13px] text-black/70">
              Escolha a região onde você <b className="underline">mais deseja ver diferença</b>
            </p>

            <div className="mt-8 space-y-3">
              {[
                { label: 'Barriga/Abdômen', img: '/quiz/barriga.png' },
                { label: 'Culotes/Flancos', img: '/quiz/culotes.png' },
                { label: 'Coxas/Pernas', img: '/quiz/coxas.png' },
                { label: 'Glúteos', img: '/quiz/gluteos.png' },
                { label: 'Braços', img: '/quiz/bracos.png' },
              ].map((it) => (
                <button
                  key={it.label}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, area: it.label as Answers['area'] }))
                    next()
                  }}
                  className={`${cardBase} flex items-center gap-4 px-4 py-4 text-left`}
                >
                  <div className="h-[52px] w-[62px] rounded-lg bg-white/40 border border-black/5 overflow-hidden flex items-center justify-center">
                    <img src={it.img} alt={it.label} className="h-full w-full object-cover" />
                  </div>
                  <div className="text-[15px] font-medium">{it.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button onClick={back} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 3) COMO FUNCIONA */}
        {step === 3 && (
          <section className="mt-10">
            <h1 className="text-center text-[18px] font-extrabold leading-tight">
              A CrioCaseira Resolve a Falta de tempo e rotina agitada Pra Você...
              <br />
              <span className="text-[16px] font-extrabold">Como Funciona a CrioCaseira:</span>
            </h1>

            <div className="mt-6 flex justify-center">
              <img src="/quiz/rotina.png" alt="Como funciona" className="w-full max-w-[420px] h-auto" />
            </div>

            {/* texto abaixo da imagem (igual print) */}
            <div className="mt-7 text-left">
              <p className="text-[15px] font-extrabold text-black">Você só precisa de:</p>

              <div className="mt-3 space-y-3 text-[14px] text-black/80">
                <div className="flex items-center gap-2">
                  <span className="text-black/70">⏱️</span>
                  <span>
                    <b>12 Minutos</b> por Dia
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-black/70">🧴</span>
                  <span>
                    <b>1 Garrafa Pet</b> + 2 Ingredientes que você <b>já tem em casa</b>
                  </span>
                </div>
              </div>

              <p className="mt-6 text-[14px] leading-relaxed text-black/85">
                <b>E o melhor...</b> Mesmo depois de tirar a garrafa, o processo de destruição{' '}
                <b className="underline">da gordura continua</b>. 💥
                <br />
                Uma vez ativadas, as células seguem sendo <b className="underline">eliminadas automaticamente</b> pelo corpo{' '}
                <b className="underline">durante horas</b>. ⏳
              </p>
            </div>

            <button
              onClick={next}
              className="mt-8 w-full rounded-2xl bg-[#2A8A1F] py-4 text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
            >
              CONTINUAR
            </button>

            <div className="mt-6 flex justify-center">
              <button onClick={back} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 4) PESO ATUAL (40-150) */}
        {step === 4 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">Qual é o seu peso atual?</h1>
            <p className="mt-3 text-center text-[13px] text-black/70">Estamos quase lá! Vamos ajustar o protocolo para seu corpo.</p>

            <div className="mt-8 text-center">
              <div className="text-[54px] font-extrabold leading-none">
                {pesoKg}
                <span className="ml-2 text-[22px] font-bold text-black/45">kg</span>
              </div>
            </div>

            <div className="mt-7">
              <RulerPicker min={40} max={150} value={pesoKg} onChange={(v) => setAnswers((a) => ({ ...a, pesoKg: v }))} />
            </div>

            <button
              onClick={next}
              className="mt-8 w-full rounded-2xl bg-[#2A8A1F] py-4 text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
            >
              CONTINUAR
            </button>

            <div className="mt-6 flex justify-center">
              <button onClick={back} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 5) ALTURA (130-200) */}
        {step === 5 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">Qual é a sua altura?</h1>
            <p className="mt-3 text-center text-[13px] text-black/70">Isso ajuda a personalizar melhor o protocolo para você.</p>

            <div className="mt-8 text-center">
              <div className="text-[54px] font-extrabold leading-none">
                {alturaCm}
                <span className="ml-2 text-[22px] font-bold text-black/45">cm</span>
              </div>
            </div>

            <div className="mt-7">
              <RulerPicker min={130} max={200} value={alturaCm} onChange={(v) => setAnswers((a) => ({ ...a, alturaCm: v }))} />
            </div>

            <button
              onClick={next}
              className="mt-8 w-full rounded-2xl bg-[#2A8A1F] py-4 text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
            >
              CONTINUAR
            </button>

            <div className="mt-6 flex justify-center">
              <button onClick={back} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 6) PESO DESEJADO */}
        {step === 6 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">Qual o peso desejado?</h1>
            <p className="mt-3 text-center text-[13px] text-black/70">Isso ajuda a personalizar a meta do seu plano.</p>

            <div className="mt-8 text-center">
              <div className="text-[54px] font-extrabold leading-none">
                {pesoDesejadoKg}
                <span className="ml-2 text-[22px] font-bold text-black/45">kg</span>
              </div>
            </div>

            <div className="mt-7">
              <RulerPicker
                min={40}
                max={150}
                value={pesoDesejadoKg}
                onChange={(v) => setAnswers((a) => ({ ...a, pesoDesejadoKg: v }))}
              />
            </div>

            <button
              onClick={next}
              className="mt-8 w-full rounded-2xl bg-[#2A8A1F] py-4 text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
            >
              CONTINUAR
            </button>

            <div className="mt-6 flex justify-center">
              <button onClick={back} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 7) ROTINA (EMOJIS) */}
        {step === 7 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">Como é sua rotina atualmente?</h1>
            <p className="mt-3 text-center text-[13px] text-black/70">
              Vamos adaptar a CrioCaseira para <b>caber na sua realidade</b>
            </p>

            <div className="mt-8 space-y-3">
              {[
                { key: 'Corrida', emoji: '🏃‍♀️', text: 'Minha rotina é corrida, mal tenho tempo pra mim' },
                { key: 'Casa', emoji: '🏠', text: 'Fico em casa, mas cuido de tudo e vivo cansada' },
                { key: 'Flexível', emoji: '⏰', text: 'Tenho horários flexíveis e posso ajustar meu tempo' },
                { key: 'TrabalhoFora', emoji: '🏢', text: 'Trabalho fora e chego exausta no fim do dia' },
              ].map((it) => (
                <button
                  key={it.key}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, rotina: it.key as Answers['rotina'] }))
                    next()
                  }}
                  className={`${cardBase} flex items-center gap-4 px-4 py-4 text-left`}
                >
                  <div className="h-[44px] w-[44px] rounded-lg bg-white/50 border border-black/5 flex items-center justify-center text-[22px]">
                    {it.emoji}
                  </div>
                  <div className="text-[14px] text-black/80">{it.text}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button onClick={back} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 8) SONO (EMOJIS) -> ANALISANDO */}
        {step === 8 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">
              Quantas horas de sono você tem por <span className="text-[#2F6F9E]">noite</span>?
            </h1>
            <p className="mt-3 text-center text-[13px] text-black/70">
              O sono influencia diretamente na <b>eliminação de gordura</b> e no <b>metabolismo</b>
            </p>

            <div className="mt-8 space-y-3">
              {[
                { key: 'Menos5', emoji: '⏰', text: 'Menos de 5 horas' },
                { key: 'Entre5e7', emoji: '🕰️', text: 'Entre 5 e 7 horas' },
                { key: 'Entre7e9', emoji: '😴', text: 'Entre 7 e 9 horas' },
                { key: 'Mais9', emoji: '🛌', text: 'Mais de 9 horas' },
              ].map((it) => (
                <button
                  key={it.key}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, sono: it.key as Answers['sono'] }))
                    setStep(9)
                  }}
                  className={`${cardBase} flex items-center gap-4 px-4 py-4 text-left`}
                >
                  <div className="h-[44px] w-[44px] rounded-lg bg-white/50 border border-black/5 flex items-center justify-center text-[22px]">
                    {it.emoji}
                  </div>
                  <div className="text-[14px] text-black/80">{it.text}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button onClick={back} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>

            <div className="mt-8 flex justify-center">
              <button onClick={() => router.push('/vsl')} className="text-[12px] text-black/50 underline">
                Voltar para o vídeo
              </button>
            </div>
          </section>
        )}

        {/* 9) ANALISANDO (sem spinner / sem top progress) */}
        {step === 9 && (
          <section className="mt-24 flex flex-col items-center">
            <div className="w-full max-w-[460px]">
              <div className="h-3 w-full rounded-full bg-black/10 overflow-hidden">
                <div className="h-full rounded-full bg-[#2F6F9E]" style={{ width: `${analysisPct}%` }} />
              </div>

              <div className="mt-2 text-center text-[13px] font-bold text-black/70">{analysisPct}%</div>

              <h2 className="mt-6 text-center text-[18px] font-extrabold">Analisando Suas Respostas...</h2>
              <p className="mt-2 text-center text-[13px] text-black/60">
                Estamos verificando suas respostas,
                <br />
                isso só leva alguns segundos...
              </p>
            </div>
          </section>
        )}

        {/* 10) RESULTADO IMC (fixo, sem top progress) */}
        {step === 10 && (
          <section className="mt-10">
            <h1 className="text-center text-[18px] font-extrabold leading-tight">
              Resultado da Sua Avaliação
              <br />
              <span className="text-[14px] font-bold text-black/70">Índice de Massa Corporal (IMC)</span>
            </h1>

            <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#0E3B63] to-[#1E5B8C] p-4 text-white shadow-[0_14px_28px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between gap-3">
                <div className="px-1 py-2 text-[12px] font-extrabold">Seu IMC é {FIXED_IMC.toFixed(2)}</div>
                <div className="px-2 py-1 rounded-lg bg-[#F7E36B] text-[12px] font-extrabold text-black">{FIXED_ZONE_LABEL}</div>
              </div>

              <div className="relative mt-4">
                <div className="h-2 w-full rounded-full bg-white/25" />
                <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${FIXED_MARKER_PCT}% - 10px)` }}>
                  <div className="relative">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-black shadow">
                      Você está aqui
                    </div>
                    <div className="h-5 w-5 rounded-full border-2 border-white bg-transparent" />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-between text-[12px] font-bold text-white/90">
                <span>Normal</span>
                <span>Sobrepeso</span>
                <span>Obesidade</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-[#FFF6CC] p-4 shadow-[0_10px_22px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-3">
                <div className="mt-1 text-[18px]">⚠️</div>
                <div>
                  <h3 className="text-[15px] font-extrabold">Seu Corpo Pode Estar te Sabotando Silenciosamente</h3>
                  <p className="mt-2 text-[13px] text-black/70">
                    Mesmo que você se <b>alimente bem</b>, alguns fatores estão travando sua <b>queima de gordura</b> e{' '}
                    <b>retendo líquidos</b>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-[#FFD7D7] p-4 shadow-[0_10px_22px_rgba(0,0,0,0.06)]">
              <h3 className="text-[15px] font-extrabold flex items-center gap-2">
                ❌ <span>Alguns Sinais de Alerta</span>
              </h3>

              <ul className="mt-3 space-y-2 text-[13px] text-black/80">
                <li>❌ <b>Metabolismo lento</b> mesmo comendo pouco</li>
                <li>❌ Sensação constante de <b>inchaço e cansaço</b></li>
                <li>❌ <b>Gordura acumulada</b> em áreas específicas: <b>{answers.area ?? 'Barriga/Abdômen'}</b></li>
                <li>❌ Corpo <b>retendo líquido e toxinas</b> diariamente</li>
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-[#DDF3FF] p-4 shadow-[0_10px_22px_rgba(0,0,0,0.06)]">
              <h3 className="text-[15px] font-extrabold">
                💡 Com a CrioCaseira, Seu Corpo Ativa o Processo Natural de Apoptose Eliminando as Células de Gordura Automaticamente
              </h3>
              <p className="mt-2 text-[13px] text-black/70">
                A combinação do frio + 2 ingredientes potencializam o efeito da destruição da célula de <b>gordura</b>,
                enquanto você relaxa em casa.
              </p>
            </div>

            <div className="mt-7 text-center text-[16px] font-extrabold">Veja o Resultado da Pamela, Nossa Aluna...</div>

            {/* Pamela (imagem) */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_14px_30px_rgba(0,0,0,0.12)]">
              <img src="/quiz/pamela.png" alt="Resultado da Pamela" className="w-full h-auto block" draggable={false} />
            </div>

            <button
              onClick={() => setStep(11)}
              className="mt-8 w-full rounded-2xl bg-[#2A8A1F] py-4 text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
            >
              CONTINUAR
            </button>

            <div className="mt-6 flex justify-center">
              <button onClick={() => setStep(8)} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 11) CORPO DOS SONHOS (imagem 1) */}
        {step === 11 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">
              Qual o <span className="text-[#2F6F9E]">corpo</span> dos seus sonhos?
            </h1>
            <p className="mt-3 text-center text-[13px] text-black/70">Escolha o tipo de corpo que você deseja alcançar</p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: 'Em Forma', img: '/quiz/emforma.png' },
                { label: 'Com Curvas', img: '/quiz/comcurvas.png' },
                { label: 'Definido', img: '/quiz/definido1.png' },
                { label: 'Natural', img: '/quiz/natural.png' },
              ].map((it) => (
                <button
                  key={it.label}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, corpoSonhos: it.label as Answers['corpoSonhos'] }))
                    setStep(12)
                  }}
                  className={`${cardBase} p-4`}
                >
                  <div className="w-full rounded-lg bg-white/40 border border-black/5 overflow-hidden">
                    <img src={it.img} alt={it.label} className="h-[120px] w-full object-contain" />
                  </div>
                  <div className="mt-3 text-center text-[14px] font-medium">{it.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button onClick={() => setStep(10)} className="text-[13px] text-black/60 underline">
                Voltar
              </button>
            </div>
          </section>
        )}

        {/* 12) GERANDO (imagem 2) */}
        {step === 12 && (
          <section className="mt-16 flex flex-col items-center">
            <div className="w-full max-w-[520px]">
              <div className="h-3 w-full rounded-full bg-black/10 overflow-hidden">
                <div className="h-full rounded-full bg-[#2F6F9E]" style={{ width: `${genPct}%` }} />
              </div>

              <div className="mt-2 text-center text-[13px] font-bold text-black/70">{genPct}%</div>

              <h2 className="mt-6 text-center text-[18px] font-extrabold">Gerando Sua CrioCaseira...</h2>
              <p className="mt-2 text-center text-[13px] text-black/60">
                🔎 Estamos mapeando seu perfil de acordo com todas suas
                <br />
                respostas...
              </p>

              {/* depoimento */}
              <div className="mt-8 rounded-2xl border border-black/10 bg-white p-4 shadow-[0_10px_22px_rgba(0,0,0,0.06)]">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-black/10 overflow-hidden">
                    <img src="/quiz/avatar.jpg" alt="Ana Maria" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-extrabold leading-none">Ana Maria</div>
                    <div className="mt-1 text-[12px] text-black/55">Floripa, SC</div>
                  </div>
                </div>

                <div className="mt-3 text-[13px] leading-relaxed text-black/75">
                  <i>
                    “Nunca imaginei que uma garrafa e dois ingredientes que eu já tinha em casa fariam tanta diferença. Em{' '}
                    <b>menos de 2 semanas</b>, minha barriga desinchou, minhas calças voltaram a servir e o mais importante:{' '}
                    <b>voltei a me olhar no espelho com orgulho</b>. Obrigada por devolver minha autoestima de forma tão simples
                    e acessível!”
                  </i>{' '}
                  💖
                </div>

                <div className="mt-3 text-[14px]">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </section>
        )}

        {/* 13) RESULTADOS + PROTOCOLO + OFERTA (imagens 3/4/5) */}
        {step === 13 && (
          <section className="mt-10">
            <h1 className="text-center text-[22px] font-extrabold leading-tight">
              Daqui 3 Semanas Você Vai <span className="text-[#2F6F9E]">Agradecer por Ter Começado </span>Hoje...
            </h1>
            <p className="mt-3 text-center text-[13px] text-black/70">
              De acordo com suas respostas <b>Esses Poderão Ser Seus Resultados</b>...
            </p>

    {/* card HOJE / DAQUI 3 SEMANAS */}
<div className="mt-7 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_14px_30px_rgba(0,0,0,0.08)]">
  <div className="grid grid-cols-2">
    <div className="px-4 py-3 text-[12px] font-extrabold border-r border-black/10">HOJE</div>
    <div className="px-4 py-3 text-[12px] font-extrabold">DAQUI 3 SEMANAS</div>
  </div>

  <div className="px-4 pb-4">
    {/* ✅ IMAGENS LADO A LADO (HOJE / DEPOIS) */}
    <div className="mt-2 grid grid-cols-2 gap-3 overflow-hidden rounded-xl bg-black/5 p-3">
      <div className="overflow-hidden rounded-lg bg-white/60 border border-black/5">
        <img
          src="/quiz/hoje.png"
          alt="Hoje"
          className="w-full h-[340px]"
          draggable={false}
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white/60 border border-black/5">
        <img
          src="/quiz/depois.png"
          alt="Daqui 3 semanas"
          className="w-full h-[340px] "
          draggable={false}
        />
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-4">
      <div>
        <div className="text-[12px] font-bold">Capacidade de Eliminar Gordura</div>
        <div className="mt-2 h-3 w-full rounded-full bg-black/10 overflow-hidden">
          <div className="h-full bg-red-600 rounded-full" style={{ width: '19%' }} />
        </div>
        <div className="mt-2 rounded-xl bg-black/5 p-3 text-[12px] text-black/70">
          ❌ Seu corpo está trabalhando com apenas <b>19% da capacidade</b> de queimar gordura
        </div>
      </div>

      <div>
        <div className="text-[12px] font-bold">Capacidade de Eliminar Gordura</div>
        <div className="mt-2 h-3 w-full rounded-full bg-black/10 overflow-hidden">
          <div className="h-full bg-green-600 rounded-full" style={{ width: '100%' }} />
        </div>
        <div className="mt-2 rounded-xl bg-black/5 p-3 text-[12px] text-black/70">
          ✅ Com a CrioCaseira, seu corpo trabalhará com <b>100% da capacidade</b> de destruir gordura
        </div>
      </div>
    </div>
  </div>
</div>


            {/* protocolo */}
            <h2 className="mt-8 text-center text-[18px] font-extrabold">
              Seu <span className="text-[#2F6F9E]">Protocolo Personalizado</span> CrioCaseiro...
            </h2>

            <div className="mt-6 space-y-3">
              <div className={`${cardBase} px-5 py-4`}>
                <div className="text-[12px] font-bold text-black/55">Meta de Perda de Peso</div>
                <div className="mt-1 text-[14px] text-black/80">🎯 {meta3Semanas}</div>
              </div>

              <div className={`${cardBase} px-5 py-4`}>
                <div className="text-[12px] font-bold text-black/55">Objetivo Principal</div>
                <div className="mt-1 text-[14px] text-black/80">
                  👤 Reduza na região de <b>{answers.area ?? 'Barriga/Abdômen'}</b>
                </div>
              </div>

              <div className={`${cardBase} px-5 py-4`}>
                <div className="text-[12px] font-bold text-black/55">Corpo dos Sonhos</div>
                <div className="mt-1 text-[14px] text-black/80">
                  ✅ Conquiste um corpo <b>{answers.corpoSonhos ?? 'Em Forma'}</b>
                </div>
              </div>

              <div className={`${cardBase} px-5 py-4`}>
                <div className="text-[12px] font-bold text-black/55">Benefício Principal</div>
                <div className="mt-1 text-[14px] text-black/80">
                  ⬆️ Para você que quer <b>reduzir gordura localizada</b> sem dieta ou academia
                </div>
              </div>
            </div>

            {/* lista/offer (imagem 5) */}
            <div className="mt-10">
              <div className="mt-6 text-[14px] leading-relaxed text-black/80">
                <div>→ CrioCaseira Personalizada <span className="text-red-600 font-extrabold line-through">(R$297,00)</span></div>
                <div>→ Chá Turbo Seca <span className="text-red-600 font-extrabold line-through">(R$97,00)</span></div>
                <div>→ Dieta Personalizada <span className="text-red-600 font-extrabold line-through">(R$197,00)</span></div>
                <div>→ Modo AnriReganho <span className="text-red-600 font-extrabold line-through">(R$97,00)</span></div>
                <div>→ Libido em Alta <span className="text-red-600 font-extrabold line-through">(R$197,00)</span></div>
                <div>→ Plano Barriga Livre <span className="text-red-600 font-extrabold line-through">(R$147,00)</span></div>
                <div>→ Suporte <span className="text-red-600 font-extrabold line-through">(R$97,00)</span></div>
                <div>→ Material Passo a Passo <span className="text-red-600 font-extrabold line-through">(R$97,00)</span></div>
                <div>→ 4 Bônus Premium <span className="text-red-600 font-extrabold line-through">(R$735,00)</span></div>
                <div>→ Material Premium <span className="text-red-600 font-extrabold line-through">(R$297,00)</span></div>
                <div>→ Acesso ao App <span className="text-red-600 font-extrabold line-through">(R$97,00)</span></div>
                <div>→ Grupo Exclusivo <span className="text-red-600 font-extrabold line-through">(R$47,00)</span></div>
              </div>

              <div className="mt-6 rounded-2xl border border-red-300 bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-extrabold">VALOR NORMAL</div>
                  <div className="text-[12px] text-black/60">Valor sem Desconto</div>
                </div>
                <div className="rounded-xl bg-red-600 px-4 py-2 text-white font-extrabold">
                  <div className="text-[10px] opacity-90">VALOR TOTAL</div>
                  <div className="text-[20px] leading-none">R$ 2.405</div>
                </div>
              </div>

              <p className="mt-5 text-center text-[13px] text-black/70">
                Mas apenas hoje, <b>até as 23:59</b> ou acabar as <b>3 últimas vagas</b> você levará com{' '}
                <span className="text-green-600 font-extrabold">98% de DESCONTO</span> 👇👇
              </p>

<div className="mt-5 rounded-2xl border border-green-300 bg-white p-4 flex items-center justify-between">
  <div>
    <div className="text-[12px] font-extrabold">✅ SOMENTE HOJE</div>
    <div className="text-[12px] text-black/60">30 Dias de Garantia</div>
  </div>

  <div className="rounded-xl bg-green-500 px-5 py-3 text-black font-extrabold text-center">
    <div className="text-[12px] opacity-80">Valor promocional</div>
    <div className="text-[22px] leading-none">R$ 39,90</div>
  </div>
</div>

              <button
                onClick={() => {
                  // troca pelo seu checkout
                  router.push('/checkout')
                }}
                className="mt-6 w-full rounded-2xl bg-[#2A8A1F] py-5 text-[16px] font-extrabold text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)]"
              >
                QUERO MINHA VAGA
              </button>

              <div className="mt-6 flex justify-center">
                <button onClick={() => setStep(10)} className="text-[13px] text-black/60 underline">
                  Voltar
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
