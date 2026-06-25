import type { GameConfig, Tube } from '../types/game'
import { isPuzzleSolved } from './gameLogic'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generatePuzzle(config: GameConfig): Tube[] {
  const { numColors, extraBottles, segmentsPerBottle, colors } = config

  // Build a flat list of every segment that belongs in the puzzle
  const allSegments: string[] = []
  for (let c = 0; c < numColors; c++) {
    for (let s = 0; s < segmentsPerBottle; s++) {
      allSegments.push(colors[c])
    }
  }

  // Shuffle and deal into tubes — guaranteed to mix colors
  const shuffled = shuffle(allSegments)
  const tubes: Tube[] = []

  for (let t = 0; t < numColors; t++) {
    tubes.push({
      segments: shuffled.slice(t * segmentsPerBottle, (t + 1) * segmentsPerBottle),
      capacity: segmentsPerBottle,
    })
  }

  for (let e = 0; e < extraBottles; e++) {
    tubes.push({ segments: [], capacity: segmentsPerBottle })
  }

  // Extremely unlikely but possible: all segments happened to land solved — redeal
  if (isPuzzleSolved(tubes)) return generatePuzzle(config)

  return tubes
}
