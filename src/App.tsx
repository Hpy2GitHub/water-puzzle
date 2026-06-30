import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import ConfigPage from './pages/ConfigPage'
import PuzzlePage from './pages/PuzzlePage'
import HistoryPage from './pages/HistoryPage'

const BUBBLES = [
  { id: 0,  size: 10, left: 6,  bottom: 8,  delay: 0,   dur: 10 },
  { id: 1,  size: 18, left: 16, bottom: 18, delay: 3.2, dur: 13 },
  { id: 2,  size: 8,  left: 28, bottom: 6,  delay: 6.1, dur: 9  },
  { id: 3,  size: 24, left: 39, bottom: 28, delay: 1.4, dur: 15 },
  { id: 4,  size: 12, left: 51, bottom: 12, delay: 4.7, dur: 11 },
  { id: 5,  size: 20, left: 63, bottom: 22, delay: 2.3, dur: 14 },
  { id: 6,  size: 9,  left: 74, bottom: 5,  delay: 7.5, dur: 8  },
  { id: 7,  size: 16, left: 83, bottom: 32, delay: 0.8, dur: 12 },
  { id: 8,  size: 14, left: 91, bottom: 14, delay: 5.3, dur: 10 },
  { id: 9,  size: 22, left: 45, bottom: 42, delay: 8.1, dur: 16 },
  { id: 10, size: 11, left: 23, bottom: 38, delay: 3.7, dur: 11 },
  { id: 11, size: 7,  left: 69, bottom: 48, delay: 6.8, dur: 9  },
]

const RAYS = [
  { left: '10%', width: 55, skew: -12 },
  { left: '33%', width: 90, skew:  -8 },
  { left: '57%', width: 65, skew: -10 },
  { left: '77%', width: 48, skew: -14 },
]

function AppBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Base deep-water gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #07111f, #0d1f38, #07111f)' }} />
      {/* Centered radial glow — simulates sunlight from above */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 22%, rgba(22,78,120,0.48) 0%, transparent 60%)' }} />
      {/* Light shafts filtering down through the water */}
      {RAYS.map((ray, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 0,
          left: ray.left,
          width: ray.width,
          height: '68%',
          background: 'linear-gradient(to bottom, rgba(34,211,238,0.07), transparent)',
          transform: `skewX(${ray.skew}deg)`,
        }} />
      ))}
      {/* Rising bubbles */}
      {BUBBLES.map(b => (
        <div key={b.id} style={{
          position: 'absolute',
          left: `${b.left}%`,
          bottom: `${b.bottom}%`,
          width:  b.size,
          height: b.size,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.13)',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.22), rgba(255,255,255,0.02))',
          animation: `bubble-rise ${b.dur}s ease-in ${b.delay}s infinite`,
        }} />
      ))}
      {/* Bottom wave layers */}
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"
           style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 80, opacity: 0.07 }}>
        <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,10 1440,40 L1440,80 L0,80 Z" fill="white" />
      </svg>
      <svg viewBox="0 0 1440 55" preserveAspectRatio="none"
           style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 55, opacity: 0.04 }}>
        <path d="M0,28 C360,55 720,0 1080,28 C1260,44 1380,12 1440,28 L1440,55 L0,55 Z" fill="white" />
      </svg>
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppBackground />
        <Routes>
          <Route path="/" element={<ConfigPage />} />
          <Route path="/puzzle" element={<PuzzlePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  )
}
