import { DAY_LENGTH } from '../data/config'

export type DayPhase = 'dawn' | 'morning' | 'day' | 'dusk' | 'night'

/** 游戏内时钟：一天 = DAY_LENGTH 现实秒，t ∈ [0,1) 从 0:00 起算 */
export class WorldClock {
  /** 天数，从第 1 天开始 */
  day = 1
  private t = 0.28 // 从早上 6:40 左右开始

  update(dt: number) {
    this.t += dt / DAY_LENGTH
    while (this.t >= 1) {
      this.t -= 1
      this.day++
    }
  }

  /** 0..24 小时（浮点） */
  get hours(): number {
    return this.t * 24
  }

  /** "HH:MM" 显示 */
  get label(): string {
    const h = Math.floor(this.hours)
    const m = Math.floor((this.hours - h) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  get phase(): DayPhase {
    const h = this.hours
    if (h >= 5 && h < 7) return 'dawn'
    if (h >= 7 && h < 11) return 'morning'
    if (h >= 11 && h < 17) return 'day'
    if (h >= 17 && h < 19.5) return 'dusk'
    return 'night'
  }

  get isNight(): boolean {
    return this.phase === 'night'
  }

  /** 白昼强度 0(深夜)..1(正午)，用于光照叠加 */
  get daylight(): number {
    const h = this.hours
    // 5-7 点日出渐亮，17-19.5 点日落渐暗
    if (h >= 7 && h < 17) return 1
    if (h >= 5 && h < 7) return (h - 5) / 2
    if (h >= 17 && h < 19.5) return 1 - (h - 17) / 2.5
    return 0
  }
}
