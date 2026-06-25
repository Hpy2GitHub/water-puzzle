import type { Tube } from '../types/game'

// The color at the top of a tube, or null if empty
export function getTopColor(tube: Tube): string | null {
  return tube.segments.length > 0 ? tube.segments[tube.segments.length - 1] : null
}

// How many consecutive matching segments sit at the top of the tube
export function getTopRunLength(tube: Tube): number {
  if (tube.segments.length === 0) return 0
  const top = tube.segments[tube.segments.length - 1]
  let count = 0
  for (let i = tube.segments.length - 1; i >= 0; i--) {
    if (tube.segments[i] === top) count++
    else break
  }
  return count
}

export function canPour(from: Tube, to: Tube, allowMismatch = false): boolean {
  if (from.segments.length === 0) return false
  if (to.segments.length >= to.capacity) return false
  const toTop = getTopColor(to)
  if (toTop === null) return true                      // destination is empty
  if (allowMismatch) return true                       // skip color check
  return toTop === getTopColor(from)                   // colors must match
}

// Returns new immutable Tube[] — does not mutate
export function pour(tubes: Tube[], fromIdx: number, toIdx: number): Tube[] {
  const from = tubes[fromIdx]
  const to = tubes[toIdx]
  const topColor = getTopColor(from)!
  const runLen = getTopRunLength(from)
  const space = to.capacity - to.segments.length
  const amount = Math.min(runLen, space)

  const newTubes = tubes.map((t, i) => {
    if (i === fromIdx) return { ...t, segments: t.segments.slice(0, -amount) }
    if (i === toIdx)   return { ...t, segments: [...t.segments, ...Array<string>(amount).fill(topColor)] }
    return t
  })
  return newTubes
}

export function isTubeSolved(tube: Tube): boolean {
  if (tube.segments.length === 0) return true                      // empty is fine
  if (tube.segments.length !== tube.capacity) return false         // must be full
  return new Set(tube.segments).size === 1                         // all one color
}

export function isPuzzleSolved(tubes: Tube[]): boolean {
  return tubes.every(isTubeSolved)
}

interface ScoredMove {
  from: number
  to: number
  score: number
}

// Returns [fromIdx, toIdx] of the best suggested move, or null if no valid move exists
export function findHint(tubes: Tube[], allowMismatch = false): [number, number] | null {
  const moves: ScoredMove[] = []

  for (let from = 0; from < tubes.length; from++) {
    for (let to = 0; to < tubes.length; to++) {
      if (from === to) continue
      if (!canPour(tubes[from], tubes[to], allowMismatch)) continue

      const runLen = getTopRunLength(tubes[from])
      const space = tubes[to].capacity - tubes[to].segments.length
      const amount = Math.min(runLen, space)
      const afterFrom = tubes[from].segments.length - amount
      const afterTo = tubes[to].segments.length + amount

      let score = 1

      // Strongly prefer moves that complete a destination tube
      if (afterTo === tubes[to].capacity && new Set([...tubes[to].segments, tubes[from].segments[tubes[from].segments.length - 1]]).size === 1) {
        score += 20
      }

      // Prefer moves that empty the source tube
      if (afterFrom === 0) score += 10

      // Prefer moves into tubes that already have the same color (grouping)
      if (getTopColor(tubes[to]) !== null) score += 5

      // Prefer pouring larger runs
      score += runLen

      // Avoid moves from a single-color full tube (don't break completed tubes)
      if (isTubeSolved(tubes[from])) score -= 50

      moves.push({ from, to, score })
    }
  }

  if (moves.length === 0) return null
  moves.sort((a, b) => b.score - a.score)
  return [moves[0].from, moves[0].to]
}
