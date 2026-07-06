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
  '#22c55e',  // 1. GREEN
  '#3b82f6',  // 2. BLUE
  '#f97316',  // 3. ORANGE (will have a white dot)
  '#7b827e',  // 4. GREY
  '#7f31c9',  // 5. PURPLE
  '#eab308',  // 6. YELLOW
  '#ffffff',  // 7. WHITE
  '#ef4444',  // 8. RED
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
