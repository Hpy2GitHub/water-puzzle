import type { GameConfig, Tube } from '../types/game'

interface CodeData {
  n: number      // numColors
  e: number      // extraBottles
  s: number      // segmentsPerBottle
  c: string[]    // colors (first n entries)
  b: string      // bottleShape
  a: boolean     // allowMismatch
  t: number[][]  // tubes as color indices
}

export interface DecodedPuzzle {
  config: GameConfig
  initialTubes: Tube[]
}

export function encodePuzzleCode(config: GameConfig, initialTubes: Tube[]): string {
  const colors = config.colors.slice(0, config.numColors)
  const data: CodeData = {
    n: config.numColors,
    e: config.extraBottles,
    s: config.segmentsPerBottle,
    c: colors,
    b: config.bottleShape,
    a: config.allowMismatch,
    t: initialTubes.map(tube => tube.segments.map(seg => colors.indexOf(seg))),
  }
  return btoa(JSON.stringify(data))
}

export function decodePuzzleCode(code: string): DecodedPuzzle | null {
  try {
    const data = JSON.parse(atob(code)) as CodeData
    if (!data.n || !data.c || !data.t) return null

    const colors = [...data.c]
    while (colors.length < 8) colors.push('#888888')

    const config: GameConfig = {
      numColors: data.n,
      extraBottles: data.e,
      segmentsPerBottle: data.s,
      colors,
      bottleShape: data.b as GameConfig['bottleShape'],
      allowMismatch: !!data.a,
    }
    const initialTubes: Tube[] = data.t.map(segs => ({
      segments: segs.map(i => (i >= 0 && i < data.c.length ? data.c[i] : '')).filter(Boolean),
      capacity: data.s,
    }))
    return { config, initialTubes }
  } catch {
    return null
  }
}
