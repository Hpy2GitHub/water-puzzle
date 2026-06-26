import { motion } from 'framer-motion'
import type { BottleShape } from '../../types/game'

// Each bottle shape is defined by:
//   clipPath  — the filled liquid area (segments are clipped to this)
//   outline   — the visible bottle border drawn on top
//   liquidTop — Y coordinate of the top of the liquid area (segments stack upward from bottom)
//   liquidBot — Y coordinate of the bottom of the liquid area
//   viewBox   — SVG viewBox string

interface ShapeDef {
  viewBox: string
  clipPathD: string   // path that clips the liquid segments
  outlineD: string    // path drawn as the bottle outline
  liquidTop: number   // Y where liquid area starts (top)
  liquidBot: number   // Y where liquid area ends (bottom)
  liquidLeft: number
  liquidRight: number
}

const SHAPES: Record<BottleShape, ShapeDef> = {
  'test-tube': {
    viewBox: '0 0 60 130',
    // Straight sides, rounded bottom
    clipPathD: 'M 14,4 L 14,98 Q 14,116 30,116 Q 46,116 46,98 L 46,4 Z',
    outlineD:  'M 14,4 L 14,98 Q 14,116 30,116 Q 46,116 46,98 L 46,4',
    liquidTop: 4,
    liquidBot: 116,
    liquidLeft: 14,
    liquidRight: 46,
  },
  'flask': {
    viewBox: '0 0 70 130',
    // Narrow neck, wide conical body
    clipPathD: 'M 27,4 L 27,32 L 6,112 Q 6,120 35,120 Q 64,120 64,112 L 43,32 L 43,4 Z',
    outlineD:  'M 27,4 L 27,32 L 6,112 Q 6,120 35,120 Q 64,120 64,112 L 43,32 L 43,4',
    liquidTop: 4,
    liquidBot: 120,
    liquidLeft: 6,
    liquidRight: 64,
  },
  'wine': {
    viewBox: '0 0 60 140',
    // Cylindrical body, curved shoulder, narrow neck
    clipPathD: 'M 22,4 L 22,42 Q 12,58 12,70 L 12,126 Q 12,134 30,134 Q 48,134 48,126 L 48,70 Q 48,58 38,42 L 38,4 Z',
    outlineD:  'M 22,4 L 22,42 Q 12,58 12,70 L 12,126 Q 12,134 30,134 Q 48,134 48,126 L 48,70 Q 48,58 38,42 L 38,4',
    liquidTop: 4,
    liquidBot: 134,
    liquidLeft: 12,
    liquidRight: 48,
  },
  'beaker': {
    viewBox: '0 0 70 120',
    // Wide cylinder, slightly tapered, flat bottom — lab beaker
    clipPathD: 'M 10,4 L 8,108 Q 8,116 35,116 Q 62,116 62,108 L 60,4 Z',
    outlineD:  'M 10,4 L 8,108 Q 8,116 35,116 Q 62,116 62,108 L 60,4',
    liquidTop: 4,
    liquidBot: 116,
    liquidLeft: 8,
    liquidRight: 62,
  },
}

export interface ShapeDimensions {
  vbW: number
  vbH: number
  liquidTop: number
  liquidBot: number
}

export function getShapeDimensions(shape: BottleShape): ShapeDimensions {
  const def = SHAPES[shape]
  const [,, vbW, vbH] = def.viewBox.split(' ').map(Number)
  return { vbW, vbH, liquidTop: def.liquidTop, liquidBot: def.liquidBot }
}

export type HintRole = 'from' | 'to'

interface BottleProps {
  shape: BottleShape
  segments: string[]   // colors bottom-to-top; empty array = empty bottle
  capacity: number
  isSelected?: boolean
  hintRole?: HintRole
  onClick?: () => void
  width?: number
  drainAmount?: number  // segments currently animating out of the source bottle
  drainColor?: string
}

export function Bottle({ shape, segments, capacity, isSelected = false, hintRole, onClick, width = 60, drainAmount, drainColor }: BottleProps) {
  const def = SHAPES[shape]
  const [_vbX, _vbY, vbW, vbH] = def.viewBox.split(' ').map(Number)
  const height = width * (vbH / vbW)

  const liquidHeight = def.liquidBot - def.liquidTop
  const segmentH = liquidHeight / capacity
  const liquidWidth = def.liquidRight - def.liquidLeft

  const clipId  = `clip-${shape}-${Math.random().toString(36).slice(2, 7)}`
  const glossId = `g-${clipId}`

  const strokeColor =
    isSelected          ? '#22d3ee' :
    hintRole === 'from' ? '#f59e0b' :
    hintRole === 'to'   ? '#34d399' :
    '#7ba8c8'

  const strokeWidth = (isSelected || hintRole) ? 3 : 2

  return (
    <svg
      viewBox={def.viewBox}
      width={width}
      height={height}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'block' }}
      aria-label={`${shape} bottle`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={def.clipPathD} />
        </clipPath>
        <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.35" />
          <stop offset="60%"  stopColor="white" stopOpacity="0.06" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Liquid segments — clipped to bottle shape, rendered bottom-up */}
      <g clipPath={`url(#${clipId})`}>
        {segments.map((color, i) => (
          <rect
            key={i}
            x={def.liquidLeft}
            y={def.liquidBot - (i + 1) * segmentH}
            width={liquidWidth}
            height={segmentH}
            fill={color}
          />
        ))}
      </g>

      {/* Glass specular highlight — left-side reflection streak */}
      <g clipPath={`url(#${clipId})`}>
        <rect
          x={def.liquidLeft + 2}
          y={def.liquidTop}
          width={(def.liquidRight - def.liquidLeft) * 0.2}
          height={def.liquidBot - def.liquidTop}
          fill={`url(#${glossId})`}
          rx={2}
        />
      </g>

      {/* Drain animation — poured segments shrinking out toward the opening */}
      {drainAmount && drainAmount > 0 && drainColor && (
        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            x={def.liquidLeft}
            y={def.liquidBot - (segments.length + drainAmount) * segmentH}
            width={liquidWidth}
            height={drainAmount * segmentH}
            fill={drainColor}
            initial={{ scaleY: 1, opacity: 1 }}
            animate={{ scaleY: 0, opacity: 0 }}
            transition={{ delay: 0.72, duration: 0.42, ease: 'easeIn' }}
            style={{ transformOrigin: '50% 0%' }}
          />
        </g>
      )}

      {/* Liquid surface sheen */}
      {segments.length > 0 && (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={def.liquidLeft}
            y={def.liquidBot - segments.length * segmentH}
            width={liquidWidth}
            height={Math.min(segmentH * 0.28, 5)}
            fill="white"
            fillOpacity={0.2}
          />
        </g>
      )}

      {/* Bottle outline on top so it overlaps the liquid edges */}
      <path
        d={def.outlineD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 3D rim ellipse at the bottle opening */}
      <ellipse
        cx={(def.liquidLeft + def.liquidRight) / 2}
        cy={def.liquidTop}
        rx={Math.max(1, (def.liquidRight - def.liquidLeft) / 2 - 1)}
        ry={2}
        fill="white"
        fillOpacity={0.22}
        stroke={strokeColor}
        strokeWidth={0.75}
        strokeOpacity={0.5}
      />
    </svg>
  )
}

// Lightweight outline-only version for the shape selector in config
interface ShapePreviewProps {
  shape: BottleShape
  isSelected: boolean
  onClick: () => void
}

export function ShapePreview({ shape, isSelected, onClick }: ShapePreviewProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors ${
        isSelected
          ? 'border-cyan-400 bg-cyan-500/20'
          : 'border-white/15 hover:border-white/30 bg-white/5'
      }`}
    >
      <Bottle shape={shape} segments={[]} capacity={4} width={32} />
      <span className={`text-xs font-medium ${isSelected ? 'text-cyan-300' : 'text-blue-200/60'}`}>
        {shape === 'test-tube' ? 'Test Tube' : shape.charAt(0).toUpperCase() + shape.slice(1)}
      </span>
    </button>
  )
}
