import { useEffect, useRef } from 'react'
import { GameEngine } from '../game/GameEngine'
import { setEngine } from '../game/engineRef'
import { useGameStore } from '../store/gameStore'

/** Pixi 画布宿主组件：负责引擎生命周期与 store 桥接 */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let engine: GameEngine | null = null
    let cancelled = false
    const e = new GameEngine()

    e.onSnapshot = (s) => useGameStore.getState().setSnapshot(s)
    e.onSelect = (id) => useGameStore.getState().select(id)

    e.init(host).then(() => {
      if (cancelled) {
        e.destroy()
        return
      }
      engine = e
      setEngine(e)
      e.setSpeed(useGameStore.getState().speed)
    })

    return () => {
      cancelled = true
      setEngine(null)
      engine?.destroy()
    }
  }, [])

  return <div ref={hostRef} className="game-canvas" />
}
