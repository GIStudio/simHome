import { useGameStore } from '../store/gameStore'
import { getEngine } from '../game/engineRef'
import { ACTIVITY_EMOJI } from '../data/config'

/** 左下角精灵列表：点击选中并聚焦 */
export function FairyRoster() {
  const { fairies, selectedId, select } = useGameStore()
  return (
    <div className="roster">
      {fairies.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`roster-item panel ${selectedId === f.id ? 'selected' : ''}`}
          onClick={() => {
            const next = selectedId === f.id ? null : f.id
            select(next)
            getEngine()?.focusById(next)
          }}
          title={f.name}
        >
          <span className="roster-dot" style={{ background: f.color }} />
          <span className="roster-name">{f.name}</span>
          <span className="roster-emoji">{ACTIVITY_EMOJI[f.activity] ?? '🌿'}</span>
        </button>
      ))}
    </div>
  )
}
