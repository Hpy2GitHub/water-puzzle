import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HexColorPicker } from 'react-colorful'
import { useGame } from '../context/GameContext'
import { ShapePreview } from '../components/bottles/BottleShapes'
import { type BottleShape, DEFAULT_COLORS } from '../types/game'

const SHAPES: BottleShape[] = ['test-tube', 'flask', 'wine', 'beaker']
const MIN_COLORS = 3
const MAX_COLORS = 8

export default function ConfigPage() {
  const { config, updateConfig } = useGame()
  const navigate = useNavigate()

  // Which color slot is currently being edited (-1 = none)
  const [editingColorIndex, setEditingColorIndex] = useState(-1)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close color picker when clicking outside it
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
    // When increasing colors, fill new slots from DEFAULT_COLORS if not already set
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
    updateConfig({
      colors: [...DEFAULT_COLORS],
    })
  }

  function handleStart() {
    navigate('/puzzle')
  }

  const totalBottles = config.numColors + config.extraBottles

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-1">
          Water Sort Puzzle
        </h1>
        <p className="text-sm text-gray-400 text-center mb-8">Configure your puzzle</p>

        {/* Colors count */}
        <section className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Colors <span className="font-bold text-indigo-600">{config.numColors}</span>
          </label>
          <input
            type="range"
            min={MIN_COLORS}
            max={MAX_COLORS}
            value={config.numColors}
            onChange={(e) => handleNumColorsChange(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{MIN_COLORS}</span><span>{MAX_COLORS}</span>
          </div>
        </section>

        {/* Color palette */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Colors (click to edit)</span>
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
            >
              Reset defaults
            </button>
          </div>
          <div className="relative flex flex-wrap gap-2">
            {config.colors.slice(0, config.numColors).map((color, i) => (
              <button
                key={i}
                onClick={() => setEditingColorIndex(editingColorIndex === i ? -1 : i)}
                className={`w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 ${
                  editingColorIndex === i ? 'border-gray-800 scale-110' : 'border-white shadow-md'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Edit color ${i + 1}`}
              />
            ))}

            {/* Color picker popover */}
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
              </div>
            )}
          </div>
        </section>

        {/* Empty bottles */}
        <section className="mb-6">
          <span className="block text-sm font-semibold text-gray-700 mb-2">
            Empty bottles <span className="text-xs font-normal text-gray-400">(total: {totalBottles})</span>
          </span>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => updateConfig({ extraBottles: n })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  config.extraBottles === n
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                +{n}
              </button>
            ))}
          </div>
        </section>

        {/* Segments per bottle */}
        <section className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Segments per bottle <span className="font-bold text-indigo-600">{config.segmentsPerBottle}</span>
          </label>
          <input
            type="range"
            min={3}
            max={5}
            value={config.segmentsPerBottle}
            onChange={(e) => updateConfig({ segmentsPerBottle: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>3 (easier)</span><span>5 (harder)</span>
          </div>
        </section>

        {/* Bottle shape */}
        <section className="mb-8">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Bottle shape</span>
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
        <section className="mb-8">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div>
              <span className="block text-sm font-semibold text-gray-700">Allow mismatched pours</span>
              <span className="block text-xs text-gray-400 mt-0.5">Pour any color onto any other color</span>
            </div>
            <button
              role="switch"
              aria-checked={config.allowMismatch}
              onClick={() => updateConfig({ allowMismatch: !config.allowMismatch })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                config.allowMismatch ? 'bg-indigo-500' : 'bg-gray-200'
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
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-lg transition-colors shadow-md"
        >
          Start Game →
        </button>
      </div>
    </div>
  )
}
