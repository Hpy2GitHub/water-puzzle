import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useGameState, type PourEvent } from '../hooks/useGameState'
import { Bottle, getShapeDimensions } from '../components/bottles/BottleShapes'
import { findHint } from '../utils/gameLogic'
import type { Tube, BottleShape } from '../types/game'
import type { HintRole } from '../components/bottles/BottleShapes'

const _LOADED_AT = new Date().toLocaleTimeString()

const POUR_PIVOT_Y_PCT  = 3   // rotation pivot — keeps neck over destination during tip
const JOINT_OFFSET_PX   = 20  // shifts stream bottom + fill-line top together (px into bottle)

interface StreamProps {
  centerX: number
  top: number
  height: number
  color: string
}

interface FillLineProps {
  topPx: number    // px from top of the posRef div to the bottle opening
  heightPx: number // px from opening to current liquid surface
  color: string
}

// ── AnimatedBottle ─────────────────────────────────────────────────────────────
// Defined outside PuzzlePage so it isn't recreated on each render.
// Each instance owns its own useAnimation() — no cross-bottle animation bleed.

interface AnimatedBottleProps {
  idx: number
  tube: Tube
  shape: BottleShape
  isSelected: boolean
  hintRole?: HintRole
  onClick: () => void
  width: number
  lastPour: PourEvent | null
  getBottleRect: (idx: number) => DOMRect | null
  registerRef: (idx: number, el: HTMLElement | null) => void
  pourPausedRef: React.RefObject<boolean>
}

function AnimatedBottle({
  idx, tube, shape, isSelected, hintRole, onClick, width,
  lastPour, getBottleRect, registerRef, pourPausedRef,
}: AnimatedBottleProps) {
  const controls   = useAnimation()               // this bottle's own controls — never shared
  const posRef     = useRef<HTMLDivElement>(null) // stays fixed for rect computation
  const motionRef  = useRef<HTMLDivElement>(null) // ref to the animated element for transformOrigin mutation
  const [stream,   setStream]   = useState<StreamProps | null>(null)
  const [fillLine, setFillLine] = useState<FillLineProps | null>(null)

  const isSource = lastPour?.fromIdx === idx
  const isDest   = lastPour?.toIdx   === idx

  // Register the stable (non-transformed) outer div for position tracking
  useEffect(() => {
    registerRef(idx, posRef.current)
    return () => registerRef(idx, null)
  }, [idx, registerRef])

  // Idle / selected / hint — spring transitions, skipped during pour
  useEffect(() => {
    if (isSource || isDest) return   // pour animation owns the motion element right now

    const target = isSelected
      ? { y: -14, scale: 1.06, rotate: 0 }
      : hintRole === 'from'
      ? { y: -8,  scale: 1.03, rotate: 0 }
      : hintRole === 'to'
      ? { y: -8,  scale: 1.03, rotate: 0 }
      : { y: 0,   scale: 1,    rotate: 0 }

    void controls.start({ ...target, transition: { type: 'spring', stiffness: 300, damping: 28 } })
  }, [isSelected, hintRole, isSource, isDest, controls])

  // Pour sequence: pick up → glide → tip → drip → return
  useEffect(() => {
    if (!lastPour || (!isSource && !isDest)) return

    let cancelled = false

    if (isSource) {
      const runPour = async () => {
        const srcRect  = getBottleRect(lastPour.fromIdx)
        const destRect = getBottleRect(lastPour.toIdx)
        if (!srcRect || !destRect) return

        const xDelta = (destRect.left + destRect.width  / 2)
                     - (srcRect.left  + srcRect.width   / 2)
        const dir = xDelta >= 0 ? 1 : -1

        if (cancelled) return
        await controls.start({ y: -70, transition: { duration: 0.18, ease: 'easeOut' } })
        if (cancelled) return
        await controls.start({ x: xDelta, transition: { duration: 0.26, ease: 'easeInOut' } })
        if (cancelled) return
        if (motionRef.current) motionRef.current.style.transformOrigin = `50% ${POUR_PIVOT_Y_PCT}%`
        await controls.start({ rotate: dir * 88, transition: { duration: 0.28, ease: 'easeIn' } })
        const dim          = getShapeDimensions(shape)
        const openingPx    = dim.liquidTop * width / dim.vbW + JOINT_OFFSET_PX
        const neckY        = srcRect.top  - 70 + openingPx
        const destOpeningY = destRect.top      + openingPx
        if (!cancelled) setStream({ centerX: destRect.left + destRect.width / 2, top: neckY, height: Math.max(0, destOpeningY - neckY), color: lastPour.color })
        const holdWithPause = (ms: number) => new Promise<void>(r => {
          const start = Date.now()
          const tick = () => {
            if (pourPausedRef.current) { setTimeout(tick, 50); return }
            const elapsed = Date.now() - start
            elapsed >= ms ? r() : setTimeout(tick, Math.min(50, ms - elapsed))
          }
          tick()
        })
        await holdWithPause(500)
        if (!cancelled) setStream(null)
        if (cancelled) return
        await controls.start({ rotate: 0, transition: { duration: 0.22, ease: 'easeOut' } })
        if (motionRef.current) motionRef.current.style.transformOrigin = '50% 50%'
        if (cancelled) return
        await controls.start({ x: 0, transition: { duration: 0.26, ease: 'easeInOut' } })
        if (cancelled) return
        await controls.start({ y: 0, transition: { duration: 0.16, ease: 'easeIn' } })
      }
      void runPour()
    }

    if (isDest) {
      const runReceive = async () => {
        // Timed to when the external stream reaches the bottle rim (~0.72s into the pour)
        await new Promise<void>(r => setTimeout(r, 720))
        if (cancelled) return

        // Show a colored line from the bottle opening down to the current liquid surface.
        // tube.segments already reflects the post-pour state (React state updated before effect ran).
        const dim = getShapeDimensions(shape)
        const renderedH  = width * dim.vbH / dim.vbW
        const segH       = (dim.liquidBot - dim.liquidTop) / tube.capacity
        const surfaceY   = dim.liquidBot - tube.segments.length * segH  // SVG y of liquid top
        const openingPx  = dim.liquidTop / dim.vbH * renderedH + JOINT_OFFSET_PX
        const surfacePx  = surfaceY     / dim.vbH * renderedH
        const lineH      = Math.max(0, surfacePx - openingPx)
        if (!cancelled && lineH > 0) setFillLine({ topPx: openingPx, heightPx: lineH, color: lastPour.color })

        await controls.start({ scaleY: [1, 0.91, 1.05, 1], transition: { duration: 0.32 } })
        if (cancelled) return
        await controls.start({ scaleY: 1, transition: { duration: 0 } })

        // Hold briefly so the fill line is visible, then fade it out
        await new Promise<void>(r => setTimeout(r, 300))
        if (!cancelled) setFillLine(null)
      }
      void runReceive()
    }

    return () => { cancelled = true }
  }, [lastPour?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // posRef sits in layout space (never transformed) — used for rect measurement
    <div ref={posRef} style={{ position: 'relative', display: 'inline-block' }} onClick={onClick}>
      {/* motion.div is what actually moves; transformOrigin managed via motionRef during pour */}
      <motion.div
        ref={motionRef}
        animate={controls}
        style={{ display: 'inline-block', cursor: 'pointer' }}
      >
        <Bottle
          shape={shape}
          segments={tube.segments}
          capacity={tube.capacity}
          isSelected={isSelected}
          hintRole={hintRole}
          width={width}
        />
      </motion.div>

      {/* Fill line — absolute overlay inside this bottle from the opening to the liquid surface */}
      <AnimatePresence>
        {fillLine && (
          <motion.div
            key="fill-line"
            initial={{ scaleY: 0, opacity: 0.9 }}
            animate={{ scaleY: 1, opacity: 0.75 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: 'calc(50% - 2px)',
              top: fillLine.topPx,
              width: 4,
              height: fillLine.heightPx,
              backgroundColor: fillLine.color,
              transformOrigin: 'top center',
              borderRadius: '0 0 2px 2px',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
      </AnimatePresence>

      {/* Liquid stream — fixed-position column from the tipped neck to the destination opening */}
      <AnimatePresence>
        {stream && (
          <motion.div
            key="stream"
            initial={{ scaleY: 0, opacity: 0.9 }}
            animate={{ scaleY: 1, opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: stream.centerX - 5,
              top: stream.top,
              width: 10,
              height: stream.height,
              backgroundColor: stream.color,
              transformOrigin: 'top center',
              // Tapers from 10 px at the source neck to 4 px at the destination rim,
              // matching the fill-line width and mimicking a narrowing falling stream
              clipPath: 'polygon(0 0, 100% 0, 70% 100%, 30% 100%)',
              pointerEvents: 'none',
              zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── PuzzlePage ─────────────────────────────────────────────────────────────────

export default function PuzzlePage() {
  const { config } = useGame()
  const navigate   = useNavigate()
  const {
    tubes, selectedIndex, moveCount, isSolved,
    hintIndices, lastPour,
    handleTubeClick, undo, reset, newGame, showHint, sounds,
  } = useGameState(config)

  const [muted, setMuted] = useState(false)

  const bottleRefs    = useRef<Map<number, HTMLElement>>(new Map())
  const pourPausedRef = useRef(false)

  // Backtick (`) freezes the pour animation in place for alignment inspection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`') pourPausedRef.current = !pourPausedRef.current
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const registerRef = useCallback((idx: number, el: HTMLElement | null) => {
    if (el) bottleRefs.current.set(idx, el)
    else    bottleRefs.current.delete(idx)
  }, [])

  const getBottleRect = useCallback((idx: number): DOMRect | null =>
    bottleRefs.current.get(idx)?.getBoundingClientRect() ?? null
  , [])

  const bottleWidth = 62

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col">

      <header className="flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-sm shadow-sm">
        <button onClick={() => navigate('/')}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
          ← Config
        </button>
        <div className="text-center">
          <p className="text-xs font-mono text-indigo-400 leading-none">
            v5 · {_LOADED_AT} · mix:{config.allowMismatch ? 'ON' : 'OFF'}
          </p>
          <p className="text-xs text-gray-400 leading-none">Moves</p>
          <p className="text-lg font-bold text-gray-700">{moveCount}</p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton onClick={undo}         title="Undo"            disabled={moveCount === 0}>↩</IconButton>
          <IconButton onClick={reset}        title="Restart"         disabled={moveCount === 0}>⟳</IconButton>
          <IconButton onClick={() => newGame()} title="New game">⊞</IconButton>
          <IconButton onClick={showHint}     title="Hint">💡</IconButton>
          <IconButton onClick={() => setMuted(sounds.toggleMute())} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </IconButton>
        </div>
      </header>

      <AnimatePresence>
        {hintIndices && (
          <motion.div key="hint"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="text-center text-xs text-amber-700 bg-amber-50 border-b border-amber-200 py-1.5 px-4">
            Pour from the <span className="font-semibold text-amber-600">amber bottle</span> into the{' '}
            <span className="font-semibold text-green-600">green bottle</span>
          </motion.div>
        )}
        {!hintIndices && noMovesLeft(tubes, config.allowMismatch) && (
          <motion.div key="no-moves"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="text-center text-xs text-red-600 bg-red-50 border-b border-red-200 py-1.5">
            No moves available — try undoing or start a new game
          </motion.div>
        )}
      </AnimatePresence>

      {/* No max-width cap so bottles wrap naturally at any viewport width */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-wrap justify-center gap-5">
          {tubes.map((tube, idx) => (
            <AnimatedBottle
              key={idx}
              idx={idx}
              tube={tube}
              shape={config.bottleShape}
              isSelected={selectedIndex === idx}
              hintRole={
                hintIndices?.[0] === idx ? 'from'
                : hintIndices?.[1] === idx ? 'to'
                : undefined
              }
              onClick={() => handleTubeClick(idx)}
              width={bottleWidth}
              lastPour={lastPour}
              getBottleRect={getBottleRect}
              registerRef={registerRef}
              pourPausedRef={pourPausedRef}
            />
          ))}
        </div>
      </main>

      <AnimatePresence>
        {isSolved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-xs w-full mx-4">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Solved!</h2>
              <p className="text-gray-500 text-sm mb-6">{moveCount} {moveCount === 1 ? 'move' : 'moves'}</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => newGame()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
                  New Game
                </button>
                <button onClick={() => navigate('/')}
                  className="w-full py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium rounded-xl transition-colors">
                  Change Config
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

function IconButton({ onClick, title, disabled = false, children }: {
  onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-base
                 bg-white border border-gray-200 shadow-sm
                 hover:bg-indigo-50 hover:border-indigo-300
                 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      {children}
    </button>
  )
}

function noMovesLeft(tubes: Tube[], allowMismatch: boolean): boolean {
  return findHint(tubes, allowMismatch) === null && tubes.some(t => t.segments.length > 0)
}
