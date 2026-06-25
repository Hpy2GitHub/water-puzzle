import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type GameConfig, DEFAULT_CONFIG } from '../types/game'

interface GameContextValue {
  config: GameConfig
  setConfig: (config: GameConfig) => void
  updateConfig: (partial: Partial<GameConfig>) => void
}

const GameContext = createContext<GameContextValue | null>(null)

const STORAGE_KEY = 'water-puzzle-config'

function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<GameConfig>) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<GameConfig>(loadConfig)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  function setConfig(next: GameConfig) {
    setConfigState(next)
  }

  function updateConfig(partial: Partial<GameConfig>) {
    setConfigState((prev) => ({ ...prev, ...partial }))
  }

  return (
    <GameContext.Provider value={{ config, setConfig, updateConfig }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
