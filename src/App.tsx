import { GameCanvas } from './components/GameCanvas'
import { HudOverlay } from './components/HudOverlay'
import { TimeControls } from './components/TimeControls'
import { FairyRoster } from './components/FairyRoster'
import { FairyInfoPanel } from './components/FairyInfoPanel'
import './App.css'

function App() {
  return (
    <div className="app">
      <GameCanvas />
      <HudOverlay />
      <FairyRoster />
      <FairyInfoPanel />
      <TimeControls />
    </div>
  )
}

export default App
