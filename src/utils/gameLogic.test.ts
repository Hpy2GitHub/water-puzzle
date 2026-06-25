import { describe, it, expect } from 'vitest'
import {
  getTopColor,
  getTopRunLength,
  canPour,
  pour,
  isTubeSolved,
  isPuzzleSolved,
  findHint,
} from './gameLogic'
import type { Tube } from '../types/game'

function tube(segments: string[], capacity = 4): Tube {
  return { segments, capacity }
}

// ── getTopColor ────────────────────────────────────────────────────────────────

describe('getTopColor', () => {
  it('returns null for empty tube', () => {
    expect(getTopColor(tube([]))).toBeNull()
  })

  it('returns the top segment color', () => {
    expect(getTopColor(tube(['red', 'blue']))).toBe('blue')
  })
})

// ── getTopRunLength ────────────────────────────────────────────────────────────

describe('getTopRunLength', () => {
  it('returns 0 for empty tube', () => {
    expect(getTopRunLength(tube([]))).toBe(0)
  })

  it('returns 1 when top color appears once', () => {
    expect(getTopRunLength(tube(['red', 'blue']))).toBe(1)
  })

  it('counts consecutive matching segments from the top', () => {
    expect(getTopRunLength(tube(['red', 'blue', 'blue', 'blue']))).toBe(3)
  })

  it('counts the full tube when all segments match', () => {
    expect(getTopRunLength(tube(['blue', 'blue', 'blue', 'blue']))).toBe(4)
  })
})

// ── canPour ────────────────────────────────────────────────────────────────────

describe('canPour', () => {
  it('rejects pour from empty tube', () => {
    expect(canPour(tube([]), tube(['red']))).toBe(false)
  })

  it('rejects pour into full tube', () => {
    expect(canPour(tube(['red']), tube(['blue', 'blue', 'blue', 'blue']))).toBe(false)
  })

  it('allows pour into empty tube', () => {
    expect(canPour(tube(['red']), tube([]))).toBe(true)
  })

  it('allows pour when top colors match', () => {
    expect(canPour(tube(['red', 'blue']), tube(['red', 'blue']))).toBe(true)
  })

  it('rejects pour when top colors differ', () => {
    expect(canPour(tube(['red']), tube(['blue']))).toBe(false)
  })
})

// ── pour ──────────────────────────────────────────────────────────────────────

describe('pour', () => {
  it('moves one segment when top run is 1', () => {
    const tubes = [tube(['red', 'blue']), tube(['blue', 'blue'])]
    const result = pour(tubes, 0, 1)
    expect(result[0].segments).toEqual(['red'])
    expect(result[1].segments).toEqual(['blue', 'blue', 'blue'])
  })

  it('moves the entire top run when space allows', () => {
    const tubes = [tube(['red', 'blue', 'blue']), tube([])]
    const result = pour(tubes, 0, 1)
    expect(result[0].segments).toEqual(['red'])
    expect(result[1].segments).toEqual(['blue', 'blue'])
  })

  it('is limited by destination capacity', () => {
    const tubes = [tube(['blue', 'blue', 'blue']), tube(['blue'], 2)]
    const result = pour(tubes, 0, 1)
    expect(result[1].segments).toEqual(['blue', 'blue'])   // only 1 space available
    expect(result[0].segments).toEqual(['blue', 'blue'])   // 1 segment removed
  })

  it('does not mutate the original tubes array', () => {
    const tubes = [tube(['red']), tube([])]
    const original = JSON.stringify(tubes)
    pour(tubes, 0, 1)
    expect(JSON.stringify(tubes)).toBe(original)
  })
})

// ── isTubeSolved ──────────────────────────────────────────────────────────────

describe('isTubeSolved', () => {
  it('treats an empty tube as solved', () => {
    expect(isTubeSolved(tube([]))).toBe(true)
  })

  it('treats a full single-color tube as solved', () => {
    expect(isTubeSolved(tube(['red', 'red', 'red', 'red']))).toBe(true)
  })

  it('treats a mixed tube as not solved', () => {
    expect(isTubeSolved(tube(['red', 'blue', 'red', 'red']))).toBe(false)
  })

  it('treats a partially filled tube as not solved', () => {
    expect(isTubeSolved(tube(['red', 'red']))).toBe(false)
  })
})

// ── isPuzzleSolved ─────────────────────────────────────────────────────────────

describe('isPuzzleSolved', () => {
  it('returns true when all tubes are solved', () => {
    const tubes = [
      tube(['red', 'red', 'red', 'red']),
      tube(['blue', 'blue', 'blue', 'blue']),
      tube([]),
    ]
    expect(isPuzzleSolved(tubes)).toBe(true)
  })

  it('returns false when any tube is unsolved', () => {
    const tubes = [
      tube(['red', 'red', 'red', 'red']),
      tube(['blue', 'red', 'blue', 'blue']),
    ]
    expect(isPuzzleSolved(tubes)).toBe(false)
  })
})

// ── findHint ──────────────────────────────────────────────────────────────────

describe('findHint', () => {
  it('returns null when no valid moves exist', () => {
    // Two full single-color tubes — nothing to pour
    const tubes = [
      tube(['red', 'red', 'red', 'red']),
      tube(['blue', 'blue', 'blue', 'blue']),
    ]
    expect(findHint(tubes)).toBeNull()
  })

  it('returns a [from, to] pair for a valid move', () => {
    const tubes = [tube(['red']), tube([])]
    const hint = findHint(tubes)
    expect(hint).not.toBeNull()
    expect(hint).toEqual([0, 1])
  })

  it('prefers a move that completes a destination tube', () => {
    // Tube 0: [blue, red] — top is red
    // Tube 1: [red, red, red] — one space, top is red → pouring completes it
    // Tube 2: [] — empty alternative
    const tubes = [
      tube(['blue', 'red'], 4),
      tube(['red', 'red', 'red'], 4),
      tube([], 4),
    ]
    const hint = findHint(tubes)
    // Completing tube 1 (score +20) should beat pouring into empty tube 2 (score +1)
    expect(hint).toEqual([0, 1])
  })

  it('avoids breaking a solved tube', () => {
    // Tube 0 is solved — hint should not suggest pouring from it
    const tubes = [
      tube(['red', 'red', 'red', 'red']),   // solved — do not touch
      tube(['blue', 'red'], 4),
      tube([], 4),
    ]
    const hint = findHint(tubes)
    expect(hint?.[0]).not.toBe(0)
  })
})
