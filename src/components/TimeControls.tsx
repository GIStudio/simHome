import { useGameStore } from '../store/gameStore'

const SPEEDS = [
  { v: 0, label: '⏸' },
  { v: 1, label: '1×' },
  { v: 2, label: '2×' },
  { v: 4, label: '4×' },
]

/** 右下角时间控制：暂停 / 常速 / 双倍 / 四倍 */
export function TimeControls() {
  const { speed, setSpeed } = useGameStore()
  return (
    <div className="time-controls panel">
      {SPEEDS.map((s) => (
        <button
          key={s.v}
          type="button"
          className={speed === s.v ? 'active' : ''}
          onClick={() => setSpeed(s.v)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
