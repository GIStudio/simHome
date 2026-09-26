import type { GameEngine } from './GameEngine'

/** 引擎单例引用：UI 层通过它调用引擎方法（聚焦、倍速等） */
let engine: GameEngine | null = null

export function setEngine(e: GameEngine | null) {
  engine = e
}

export function getEngine(): GameEngine | null {
  return engine
}
