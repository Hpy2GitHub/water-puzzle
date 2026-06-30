import type { GameConfig, Tube } from '../types/game'
import { encodePuzzleCode } from './puzzleCode'

export interface HistoryEntry {
  id: string
  datetime: string
  result: 'won' | 'abandoned'
  moves: number
  code: string
  label: string
}

const STORAGE_KEY = 'water-puzzle-history'
const MAX_ENTRIES = 50

const SHAPE_LABELS: Record<string, string> = {
  'test-tube': 'test tube',
  flask: 'flask',
  wine: 'wine glass',
  beaker: 'beaker',
}

function makeLabel(config: GameConfig): string {
  const shape = SHAPE_LABELS[config.bottleShape] ?? config.bottleShape
  return `${config.numColors} colors · ${config.segmentsPerBottle} seg · ${shape}`
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export function saveHistoryEntry(
  config: GameConfig,
  initialTubes: Tube[],
  moves: number,
  result: 'won' | 'abandoned',
): void {
  const now = new Date()
  const entry: HistoryEntry = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    datetime: now.toISOString(),
    result,
    moves,
    code: encodePuzzleCode(config, initialTubes),
    label: makeLabel(config),
  }
  const updated = [entry, ...loadHistory()].slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
