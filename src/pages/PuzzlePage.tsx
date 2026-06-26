import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useGameState, type PourEvent } from '../hooks/useGameState'
import { Bottle, getShapeDimensions } from '../components/bottles/BottleShapes'
import { findHint } from '../utils/gameLogic'
import type { Tube, BottleShape } from '../types/game'
import type { HintRole } from '../components/bottles/BottleShapes'

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
  const [stream,      setStream]      = useState<StreamProps | null>(null)
  const [fillLine,    setFillLine]    = useState<FillLineProps | null>(null)
  const [drainProps,  setDrainProps]  = useState<{amount: number; color: string} | null>(null)

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

        // Show drain overlay immediately so the segments appear intact during lift/glide/tip.
        // The motion.rect has a matching delay so it only starts shrinking once the bottle is tipped.
        if (lastPour.amount > 0) setDrainProps({ amount: lastPour.amount, color: lastPour.color })

        const xDelta = (destRect.left + destRect.width  / 2)
                     - (srcRect.left  + srcRect.width   / 2)
        const dir = xDelta >= 0 ? 1 : -1

        // Downward cross-row pour (not directly below): descend into the row gap first so the
        // bottle doesn't glide through other top-row bottles during the horizontal move.
        // All other pours: lift upward as before.
        const LIFT_MARGIN = 60
        const isDownwardCrossRow = destRect.top > srcRect.bottom + 20 && Math.abs(xDelta) >= width / 2
        const yMove = isDownwardCrossRow
          ? srcRect.height + 30   // descend past bottle + number label below the top row
          : -Math.max(70, srcRect.top - destRect.top + LIFT_MARGIN) // negative → lift

        console.log('[pour-anim] from:', lastPour.fromIdx, 'to:', lastPour.toIdx)
        console.log('[pour-anim] srcRect.top:', srcRect.top.toFixed(0), '| srcRect.bottom:', srcRect.bottom.toFixed(0), '| destRect.top:', destRect.top.toFixed(0))
        console.log('[pour-anim] xDelta:', xDelta.toFixed(0), '| yMove:', yMove.toFixed(0), '| isDownwardCrossRow:', isDownwardCrossRow, '| dir:', dir)

        if (cancelled) return
        await controls.start({ y: yMove, transition: { duration: 0.18, ease: 'easeOut' } })
        if (cancelled) return
        await controls.start({ x: xDelta, transition: { duration: 0.26, ease: 'easeInOut' } })
        if (cancelled) return
        if (motionRef.current) motionRef.current.style.transformOrigin = `50% ${POUR_PIVOT_Y_PCT}%`
        await controls.start({ rotate: dir * 88, transition: { duration: 0.28, ease: 'easeIn' } })
        const dim          = getShapeDimensions(shape)
        const openingPx    = dim.liquidTop * width / dim.vbW + JOINT_OFFSET_PX
        const neckY        = srcRect.top + yMove + openingPx
        const destOpeningY = destRect.top        + openingPx
        const streamTop    = Math.min(neckY, destOpeningY)
        const streamHeight = Math.abs(destOpeningY - neckY)
        console.log('[pour-anim] neckY:', neckY.toFixed(0), '| destOpeningY:', destOpeningY.toFixed(0), '| streamTop:', streamTop.toFixed(0), '| streamH:', streamHeight.toFixed(0))
        if (!cancelled) setStream({ centerX: destRect.left + destRect.width / 2, top: streamTop, height: streamHeight, color: lastPour.color })
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
        if (!cancelled) { setStream(null); setDrainProps(null) }
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

    return () => { cancelled = true; setDrainProps(null) }
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
          drainAmount={isSource ? drainProps?.amount : undefined}
          drainColor={isSource ? drainProps?.color : undefined}
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

function calcBottleWidth(numBottles: number, shape: BottleShape): number {
  const dim     = getShapeDimensions(shape)
  const numCols = Math.ceil(numBottles / 2)
  const availW  = window.innerWidth  - 48              // p-6 left + right
  const availH  = window.innerHeight - 56 - 48         // header (~56px) + p-6 top + bottom
  const fromW   = (availW - (numCols - 1) * 20) / numCols  // gap-x-5 between columns
  const rowH    = (availH - 96 - 40) / 2              // gap-y-24 between rows, ~20px label per row
  const fromH   = rowH * dim.vbW / dim.vbH
  return Math.max(40, Math.min(90, Math.floor(Math.min(fromW, fromH))))
}

export default function PuzzlePage() {
  const { config } = useGame()
  const navigate   = useNavigate()
  const {
    tubes, selectedIndex, moveCount, isSolved,
    hintIndices, lastPour,
    handleTubeClick, undo, reset, newGame, showHint, sounds,
  } = useGameState(config)

  const [muted, setMuted] = useState(false)
  const [viewingSolution, setViewingSolution] = useState(false)

  // Show the panel fresh each time a new puzzle is solved
  useEffect(() => {
    if (isSolved) setViewingSolution(false)
  }, [isSolved])

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

  const [bottleWidth, setBottleWidth] = useState(() => calcBottleWidth(tubes.length, config.bottleShape))

  useEffect(() => {
    function update() { setBottleWidth(calcBottleWidth(tubes.length, config.bottleShape)) }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [tubes.length, config.bottleShape])

  return (
    <div className="min-h-screen flex flex-col">

      <header className="flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <button onClick={() => navigate('/')}
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          ← Config
        </button>
        <div className="text-center">
          <p className="text-base font-black text-white leading-none tracking-tight">Water Sort</p>
          <p className="text-[11px] text-cyan-400/80 leading-none mt-0.5">
            {moveCount} {moveCount === 1 ? 'move' : 'moves'}
          </p>
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
            className="text-center text-xs text-amber-300 bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4">
            Pour from bottle{' '}
            <span className="font-semibold text-amber-400">{hintIndices![0] + 1}</span>
            {' '}into bottle{' '}
            <span className="font-semibold text-green-400">{hintIndices![1] + 1}</span>
          </motion.div>
        )}
        {!hintIndices && noMovesLeft(tubes, config.allowMismatch) && (
          <motion.div key="no-moves"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="text-center text-xs text-red-300 bg-red-500/10 border-b border-red-500/20 py-1.5">
            No moves available — try undoing or start a new game
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="grid gap-x-5 gap-y-24 justify-items-center"
          style={{ gridTemplateColumns: `repeat(${Math.ceil(tubes.length / 2)}, auto)` }}>
          {tubes.map((tube, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <AnimatedBottle
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
              <span className={`text-[10px] font-medium tabular-nums select-none leading-none ${
                hintIndices?.[0] === idx ? 'text-amber-400' :
                hintIndices?.[1] === idx ? 'text-green-400' :
                'text-blue-300/70'
              }`}>{idx + 1}</span>
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {isSolved && !viewingSolution && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="bg-[#0d1f38]/90 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl p-8 text-center max-w-xs w-full mx-4">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-2xl font-black text-white mb-1">Solved!</h2>
              <p className="text-blue-300/70 text-sm mb-6">{moveCount} {moveCount === 1 ? 'move' : 'moves'}</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => newGame()}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/30">
                  New Game
                </button>
                <button onClick={() => navigate('/')}
                  className="w-full py-2.5 border border-white/15 text-blue-200/70 hover:bg-white/10 font-medium rounded-xl transition-colors">
                  Change Config
                </button>
                <button onClick={() => setViewingSolution(true)}
                  className="w-full py-2 text-blue-300/70 hover:text-blue-200/80 text-sm font-medium transition-colors">
                  Pause — view puzzle
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
                 bg-white/10 border border-white/15
                 hover:bg-white/20 hover:border-white/25
                 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
      {children}
    </button>
  )
}

function noMovesLeft(tubes: Tube[], allowMismatch: boolean): boolean {
  return findHint(tubes, allowMismatch) === null && tubes.some(t => t.segments.length > 0)
}
