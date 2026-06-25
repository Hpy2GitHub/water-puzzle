import { useState, useCallback, useRef } from 'react'
import type { GameConfig, Tube } from '../types/game'
import { canPour, pour, isPuzzleSolved, findHint, getTopColor } from '../utils/gameLogic'
import { generatePuzzle } from '../utils/puzzleGenerator'
import { useSounds } from './useSounds'

const MAX_UNDO = 50

export interface PourEvent {
  fromIdx: number
  toIdx: number
  color: string   // color that was poured — captured before state update
  id: number      // ever-incrementing so same-source pours still re-trigger effects
}

export interface GameStateReturn {
  tubes: Tube[]
  selectedIndex: number | null
  moveCount: number
  isSolved: boolean
  hintIndices: [number, number] | null
  lastPour: PourEvent | null
  handleTubeClick: (index: number) => void
  undo: () => void
  reset: () => void
  newGame: (cfg?: GameConfig) => void
  showHint: () => void
  clearHint: () => void
  sounds: ReturnType<typeof useSounds>
}

export function useGameState(initialConfig: GameConfig): GameStateReturn {
  const [tubes, setTubes] = useState<Tube[]>(() => generatePuzzle(initialConfig))
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [moveCount, setMoveCount] = useState(0)
  const [history, setHistory] = useState<Tube[][]>([])
  const [hintIndices, setHintIndices] = useState<[number, number] | null>(null)
  const [lastPour, setLastPour] = useState<PourEvent | null>(null)
  const pourIdRef       = useRef(0)
  const allowMismatchRef = useRef(initialConfig.allowMismatch)
  allowMismatchRef.current = initialConfig.allowMismatch   // always current
  const sounds = useSounds()

  const isSolved = isPuzzleSolved(tubes)

  const handleTubeClick = useCallback((clickedIdx: number) => {
    // Any interaction clears a shown hint
    setHintIndices(null)

    // Case 1: nothing selected — try to select this tube
    if (selectedIndex === null) {
      if (tubes[clickedIdx].segments.length === 0) {
        sounds.playInvalid()
        return
      }
      sounds.playSelect()
      setSelectedIndex(clickedIdx)
      return
    }

    // Case 2: tapped the same tube — deselect
    if (selectedIndex === clickedIdx) {
      setSelectedIndex(null)
      return
    }

    // Case 3: valid pour from selectedIndex → clickedIdx
    if (canPour(tubes[selectedIndex], tubes[clickedIdx], allowMismatchRef.current)) {
      const color = getTopColor(tubes[selectedIndex]) ?? '#888'
      const nextTubes = pour(tubes, selectedIndex, clickedIdx)
      const pourId = ++pourIdRef.current
      setHistory((h) => [...h.slice(-MAX_UNDO), tubes])
      setTubes(nextTubes)
      setMoveCount((c) => c + 1)
      setSelectedIndex(null)
      setLastPour({ fromIdx: selectedIndex, toIdx: clickedIdx, color, id: pourId })
      // Clear after animation completes so idle/select state can resume on those bottles
      setTimeout(() => setLastPour(p => p?.id === pourId ? null : p), 1800)
      sounds.playPour()
      if (isPuzzleSolved(nextTubes)) sounds.playComplete()
      return
    }

    // Case 4: can't pour, but clicked tube has liquid — switch selection
    if (tubes[clickedIdx].segments.length > 0) {
      sounds.playSelect()
      setSelectedIndex(clickedIdx)
      return
    }

    // Case 5: can't pour into empty destination from this source — buzz
    sounds.playInvalid()
  }, [tubes, selectedIndex, sounds])

  const undo = useCallback(() => {
    if (history.length === 0) return
    setTubes(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
    setSelectedIndex(null)
    setHintIndices(null)
    setMoveCount((c) => Math.max(0, c - 1))
  }, [history])

  const reset = useCallback(() => {
    if (history.length === 0) return
    setTubes(history[0])
    setHistory([])
    setSelectedIndex(null)
    setHintIndices(null)
    setMoveCount(0)
  }, [history])

  const newGame = useCallback((cfg?: GameConfig) => {
    setTubes(generatePuzzle(cfg ?? initialConfig))
    setHistory([])
    setSelectedIndex(null)
    setHintIndices(null)
    setMoveCount(0)
  }, [initialConfig])

  const showHint = useCallback(() => {
    setHintIndices(findHint(tubes, allowMismatchRef.current))
    setSelectedIndex(null)
  }, [tubes])

  const clearHint = useCallback(() => setHintIndices(null), [])

  return {
    tubes, selectedIndex, moveCount, isSolved, hintIndices, lastPour,
    handleTubeClick, undo, reset, newGame, showHint, clearHint, sounds,
  }
}
