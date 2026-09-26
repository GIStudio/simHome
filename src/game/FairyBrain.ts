import type { DayPhase } from './WorldClock'
import type { ActivityKind, FairyDef } from './types'
import { WALK_BOUNDS } from '../data/config'

/** brain 产出的决定 */
export interface Decision {
  kind: 'poi' | 'wander' | 'chat'
  poiId?: string
  /** wander 的目的地 */
  target?: { x: number; y: number }
  /** 活动持续秒数 */
  duration: number
}

interface WeightRow {
  sleep: number
  eat: number
  read: number
  play: number
  dance: number
  warm: number
  gaze: number
  wander: number
  chat: number
}

/** 时段 → 活动偏好权重 */
const PHASE_WEIGHTS: Record<DayPhase, WeightRow> = {
  dawn:   { sleep: 6, eat: 8, read: 2, play: 1, dance: 1, warm: 5, gaze: 3, wander: 4, chat: 2 },
  morning:{ sleep: 0, eat: 9, read: 4, play: 4, dance: 2, warm: 1, gaze: 2, wander: 6, chat: 4 },
  day:    { sleep: 0, eat: 3, read: 6, play: 7, dance: 4, warm: 0, gaze: 2, wander: 7, chat: 5 },
  dusk:   { sleep: 1, eat: 7, read: 4, play: 3, dance: 5, warm: 3, gaze: 2, wander: 5, chat: 6 },
  night:  { sleep: 14, eat: 1, read: 3, play: 1, dance: 0, warm: 4, gaze: 1, wander: 2, chat: 1 },
}

const POI_BY_ACTIVITY: Partial<Record<keyof WeightRow, string>> = {
  sleep: 'bed',
  eat: 'table',
  read: 'shelf',
  play: 'rug',
  dance: 'rug-dance',
  warm: 'stove',
  gaze: 'window',
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/**
 * 小精灵大脑：按时段偏好 + 性格调制，随机决定下一件事。
 * 纯决策逻辑，不持有渲染对象。
 */
export class FairyBrain {
  private def: FairyDef

  constructor(def: FairyDef) {
    this.def = def
  }

  /** 挑选下一个活动 */
  decide(phase: DayPhase, isSleepy: boolean): Decision {
    const w = { ...PHASE_WEIGHTS[phase] }
    const { energy, social } = this.def
    // 性格调制
    w.play *= 0.4 + energy
    w.dance *= 0.3 + energy * 0.9
    w.wander *= 0.5 + energy
    w.chat *= 0.25 + social
    w.read *= 1.35 - energy * 0.5
    if (isSleepy) w.sleep *= 3 // 困了更容易去睡

    const entries = Object.entries(w) as [keyof WeightRow, number][]
    const total = entries.reduce((s, [, v]) => s + v, 0)
    let roll = Math.random() * total
    let picked: keyof WeightRow = 'wander'
    for (const [k, v] of entries) {
      roll -= v
      if (roll <= 0) {
        picked = k
        break
      }
    }

    if (picked === 'wander') {
      return {
        kind: 'wander',
        target: {
          x: rand(WALK_BOUNDS.xMin, WALK_BOUNDS.xMax),
          y: rand(WALK_BOUNDS.yMin, WALK_BOUNDS.yMax),
        },
        duration: rand(3, 7),
      }
    }
    if (picked === 'chat') {
      return { kind: 'chat', duration: rand(6, 12) }
    }
    return { kind: 'poi', poiId: POI_BY_ACTIVITY[picked], duration: this.activityDuration(picked) }
  }

  private activityDuration(a: keyof WeightRow): number {
    switch (a) {
      case 'sleep': return rand(50, 110)
      case 'read': return rand(25, 55)
      case 'eat': return rand(10, 22)
      case 'warm': return rand(12, 25)
      default: return rand(8, 20)
    }
  }
}

/** 活动的中文标签 */
export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  idle: '发呆中',
  wander: '闲逛中',
  sleep: '睡觉中',
  eat: '吃东西',
  read: '看书',
  play: '玩耍中',
  dance: '跳舞中',
  warm: '烤火取暖',
  chat: '聊天中',
}
