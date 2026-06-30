import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { loadHistory, clearHistory, type HistoryEntry } from '../utils/gameHistory'
import { decodePuzzleCode } from '../utils/puzzleCode'

function formatDatetime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {/* ignore */})
}

function EntryCard({ entry, onRelaunch }: { entry: HistoryEntry; onRelaunch: (entry: HistoryEntry) => void }) {
  const { date, time } = formatDatetime(entry.datetime)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    copyToClipboard(entry.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      {/* Top row: datetime + result badge */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-white font-semibold text-sm">{date}</p>
          <p className="text-blue-300/60 text-xs">{time}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          entry.result === 'won'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-orange-500/15 text-orange-300 border border-orange-500/25'
        }`}>
          {entry.result === 'won' ? '✓ Solved' : '✗ Abandoned'}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-blue-200/70">
        <span>{entry.moves} {entry.moves === 1 ? 'move' : 'moves'}</span>
        <span className="text-white/20">·</span>
        <span>{entry.label}</span>
      </div>

      {/* Code row */}
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-[10px] text-cyan-400/60 bg-black/20 rounded-lg px-2.5 py-1.5 truncate">
          {entry.code}
        </code>
        <button onClick={handleCopy}
          className="shrink-0 text-xs text-blue-300/60 hover:text-blue-200 transition-colors px-2 py-1 rounded-md hover:bg-white/5">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Relaunch */}
      <button onClick={() => onRelaunch(entry)}
        className="w-full py-2 bg-gradient-to-r from-cyan-600/40 to-blue-600/40 hover:from-cyan-500/50 hover:to-blue-500/50
                   border border-cyan-500/30 hover:border-cyan-400/50
                   text-cyan-300 hover:text-cyan-200 font-semibold text-sm rounded-xl transition-all">
        ↩ Replay this puzzle
      </button>
    </div>
  )
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { setConfig } = useGame()
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory())

  function handleRelaunch(entry: HistoryEntry) {
    const decoded = decodePuzzleCode(entry.code)
    if (!decoded) return
    setConfig(decoded.config)
    navigate('/puzzle', { state: { tubes: decoded.initialTubes } })
  }

  function handleClearAll() {
    clearHistory()
    setEntries([])
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <button onClick={() => navigate(-1)}
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          ← Back
        </button>
        <p className="text-base font-black text-white">History</p>
        {entries.length > 0 ? (
          <button onClick={handleClearAll}
            className="text-sm text-red-400/70 hover:text-red-300 transition-colors">
            Clear All
          </button>
        ) : (
          <div className="w-16" />
        )}
      </header>

      <main className="flex-1 px-4 py-4 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
            <p className="text-white/40 text-lg">No games yet</p>
            <p className="text-white/25 text-sm">Finish or abandon a puzzle to see it here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} onRelaunch={handleRelaunch} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
