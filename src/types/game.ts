export type BottleShape = 'test-tube' | 'flask' | 'wine' | 'beaker'

export interface GameConfig {
  numColors: number        // 3–8: how many distinct colors in the puzzle
  extraBottles: number     // 1–3: empty bottles added beyond numColors
  segmentsPerBottle: number // 3–5: liquid segments each bottle holds
  colors: string[]         // hex color per slot; length always >= numColors
  bottleShape: BottleShape
  allowMismatch: boolean   // when true, pouring onto a different color is allowed
}

export interface Tube {
  segments: string[]  // hex colors, index 0 = bottom; length <= capacity
  capacity: number    // = segmentsPerBottle
}

export interface GameState {
  tubes: Tube[]
  selectedIndex: number | null
  moveCount: number
}

export const DEFAULT_COLORS: string[] = [
  '#14b8a6',
  '#3b82f6',
  '#6c2c2c',
  '#7b827e',
  '#7f31c9',
  '#eab308',
  '#ec4899',
  '#ffffff',
]

export const DEFAULT_CONFIG: GameConfig = {
  numColors: 5,
  extraBottles: 2,
  segmentsPerBottle: 4,
  colors: [...DEFAULT_COLORS],
  bottleShape: 'test-tube',
  allowMismatch: false,
}

export const BOTTLE_SHAPE_LABELS: Record<BottleShape, string> = {
  'test-tube': 'Test Tube',
  'flask': 'Flask',
  'wine': 'Wine',
  'beaker': 'Beaker',
}
