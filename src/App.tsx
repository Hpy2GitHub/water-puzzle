import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import ConfigPage from './pages/ConfigPage'
import PuzzlePage from './pages/PuzzlePage'

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter basename="/water-puzzle">
        <Routes>
          <Route path="/" element={<ConfigPage />} />
          <Route path="/puzzle" element={<PuzzlePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  )
}
