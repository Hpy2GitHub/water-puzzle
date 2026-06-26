import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HexColorPicker } from 'react-colorful'
import { useGame } from '../context/GameContext'
import { ShapePreview } from '../components/bottles/BottleShapes'
import { type BottleShape, DEFAULT_COLORS } from '../types/game'
import { isTooCloseToBackground, ensureContrast } from '../utils/colorUtils'

const SHAPES: BottleShape[] = ['test-tube', 'flask', 'wine', 'beaker']
const MIN_COLORS = 3
const MAX_COLORS = 8

export default function ConfigPage() {
  const { config, updateConfig } = useGame()
  const navigate = useNavigate()

  const [editingColorIndex, setEditingColorIndex] = useState(-1)
  const pickerRef = useRef<HTMLDivElement>(null)
  const cardRef   = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    function update() {
      const el = cardRef.current
      if (!el) return
      el.style.zoom = ''                            // reset so we measure natural height
      const naturalH = el.scrollHeight
      const available = window.innerHeight - 32    // subtract outer p-4 × 2
      setZoom(naturalH > available ? available / naturalH : 1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (editingColorIndex === -1) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setEditingColorIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editingColorIndex])

  function handleNumColorsChange(n: number) {
    const colors = [...config.colors]
    while (colors.length < n) {
      colors.push(DEFAULT_COLORS[colors.length % DEFAULT_COLORS.length])
    }
    updateConfig({ numColors: n, colors })
  }

  function handleColorChange(index: number, hex: string) {
    const colors = [...config.colors]
    colors[index] = hex
    updateConfig({ colors })
  }

  function handleReset() {
    updateConfig({ colors: [...DEFAULT_COLORS] })
  }

  function handleStart() {
    // Auto-brighten any active colors that would blend into the dark background
    const colors = config.colors.map((c, i) =>
      i < config.numColors ? ensureContrast(c) : c
    )
    updateConfig({ colors })
    navigate('/puzzle')
  }

  const totalBottles = config.numColors + config.extraBottles

  const activeColors = config.colors.slice(0, config.numColors)
  const colorCounts = activeColors.reduce<Record<string, number>>(
    (acc, c) => ({ ...acc, [c]: (acc[c] ?? 0) + 1 }), {}
  )
  const isDuplicate = (c: string) => (colorCounts[c] ?? 0) > 1
  const hasDuplicates = activeColors.some(isDuplicate)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div ref={cardRef} style={{ zoom }} className="relative bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] rounded-3xl shadow-2xl shadow-black/50 p-6 w-full max-w-md">

        {/* Header */}
        <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">
          Water Sort Puzzle
        </h1>
        <p className="text-sm text-cyan-300/60 text-center mb-5">Configure your puzzle</p>

        {/* Colors count */}
        <section className="mb-4">
          <label className="block text-sm font-semibold text-blue-100/80 mb-2">
            Colors <span className="font-black text-cyan-400">{config.numColors}</span>
          </label>
          <input
            type="range"
            min={MIN_COLORS}
            max={MAX_COLORS}
            value={config.numColors}
            onChange={(e) => handleNumColorsChange(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-xs text-blue-300/40 mt-1">
            <span>{MIN_COLORS}</span><span>{MAX_COLORS}</span>
          </div>
        </section>

        {/* Color palette */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-100/80">Colors (click to edit)</span>
            <button
              onClick={handleReset}
              className="text-xs text-blue-300/40 hover:text-cyan-400 transition-colors"
            >
              Reset defaults
            </button>
          </div>
          <div className="relative flex flex-wrap gap-2">
            {config.colors.slice(0, config.numColors).map((color, i) => {
              const tooDark = isTooCloseToBackground(color)
              const dupe    = isDuplicate(color)
              return (
                <button
                  key={i}
                  onClick={() => setEditingColorIndex(editingColorIndex === i ? -1 : i)}
                  className={`relative w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 ${
                    tooDark
                      ? 'border-red-400 scale-105'
                      : dupe
                      ? 'border-amber-400 scale-105'
                      : editingColorIndex === i ? 'border-cyan-400 scale-110' : 'border-white/20 shadow-md'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Edit color ${i + 1}`}
                >
                  {tooDark && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-black border border-[#0d1f38] pointer-events-none">
                      !
                    </span>
                  )}
                  {!tooDark && dupe && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white text-[9px] font-black border border-[#0d1f38] pointer-events-none">
                      =
                    </span>
                  )}
                </button>
              )
            })}

            {editingColorIndex !== -1 && (
              <div
                ref={pickerRef}
                className="absolute top-12 left-0 z-10 bg-white rounded-xl shadow-xl p-3 border border-gray-100"
              >
                <HexColorPicker
                  color={config.colors[editingColorIndex]}
                  onChange={(hex) => handleColorChange(editingColorIndex, hex)}
                />
                <p className="text-xs text-center text-gray-400 mt-2">
                  {config.colors[editingColorIndex].toUpperCase()}
                </p>
                {isTooCloseToBackground(config.colors[editingColorIndex]) && (
                  <p className="text-[10px] text-center text-red-500 mt-1 font-semibold">
                    Too dark — will be brightened on start
                  </p>
                )}
              </div>
            )}
          </div>
          {config.colors.slice(0, config.numColors).some(isTooCloseToBackground) && (
            <p className="text-xs text-red-400/80 mt-2">
              Dark colors are auto-brightened when the game starts.
            </p>
          )}
          {hasDuplicates && (
            <p className="text-xs text-amber-400/80 mt-2">
              Duplicate colors will look identical in the puzzle — each color needs a unique shade.
            </p>
          )}
        </section>

        {/* Empty bottles */}
        <section className="mb-4">
          <span className="block text-sm font-semibold text-blue-100/80 mb-2">
            Empty bottles <span className="text-xs font-normal text-blue-300/40">(total: {totalBottles})</span>
          </span>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => updateConfig({ extraBottles: n })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  config.extraBottles === n
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                    : 'border-white/15 bg-white/5 text-blue-200/60 hover:border-white/30 hover:text-blue-100'
                }`}
              >
                +{n}
              </button>
            ))}
          </div>
        </section>

        {/* Segments per bottle */}
        <section className="mb-4">
          <label className="block text-sm font-semibold text-blue-100/80 mb-2">
            Segments per bottle <span className="font-black text-cyan-400">{config.segmentsPerBottle}</span>
          </label>
          <input
            type="range"
            min={3}
            max={5}
            value={config.segmentsPerBottle}
            onChange={(e) => updateConfig({ segmentsPerBottle: Number(e.target.value) })}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-xs text-blue-300/40 mt-1">
            <span>3 (easier)</span><span>5 (harder)</span>
          </div>
        </section>

        {/* Bottle shape */}
        <section className="mb-5">
          <span className="block text-sm font-semibold text-blue-100/80 mb-2">Bottle shape</span>
          <div className="grid grid-cols-4 gap-2">
            {SHAPES.map((shape) => (
              <ShapePreview
                key={shape}
                shape={shape}
                isSelected={config.bottleShape === shape}
                onClick={() => updateConfig({ bottleShape: shape })}
              />
            ))}
          </div>
        </section>

        {/* Allow mismatched pours */}
        <section className="mb-5">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div>
              <span className="block text-sm font-semibold text-blue-100/80">Allow mismatched pours</span>
              <span className="block text-xs text-blue-300/40 mt-0.5">Pour any color onto any other color</span>
            </div>
            <button
              role="switch"
              aria-checked={config.allowMismatch}
              onClick={() => updateConfig({ allowMismatch: !config.allowMismatch })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                config.allowMismatch ? 'bg-cyan-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  config.allowMismatch ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </section>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black rounded-2xl text-lg transition-all shadow-lg shadow-cyan-900/30"
        >
          Start Game →
        </button>
      </div>
    </div>
  )
}
