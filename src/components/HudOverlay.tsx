import { useGameStore } from '../store/gameStore'

const PHASE_INFO: Record<string, { icon: string; label: string }> = {
  dawn: { icon: '🌅', label: '清晨' },
  morning: { icon: '🌞', label: '上午' },
  day: { icon: '☀️', label: '白天' },
  dusk: { icon: '🌇', label: '黄昏' },
  night: { icon: '🌙', label: '夜晚' },
}

/** 左上角 HUD：游戏内时间 / 天数 / 昼夜 */
export function HudOverlay() {
  const { timeLabel, phase, day } = useGameStore()
  const info = PHASE_INFO[phase] ?? PHASE_INFO.day
  return (
    <div className="hud panel">
      <span className="hud-icon">{info.icon}</span>
      <span className="hud-time">{timeLabel}</span>
      <span className="hud-phase">{info.label}</span>
      <span className="hud-day">第 {day} 天</span>
    </div>
  )
}
