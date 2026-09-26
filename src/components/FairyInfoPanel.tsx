import { useGameStore } from '../store/gameStore'
import { getEngine } from '../game/engineRef'
import { ACTIVITY_EMOJI } from '../data/config'

/** 右侧选中精灵的详情卡片 */
export function FairyInfoPanel() {
  const { fairies, selectedId, select } = useGameStore()
  const fairy = fairies.find((f) => f.id === selectedId)
  if (!fairy) return null

  const moodPct = Math.round(fairy.mood * 100)
  const moodFace = fairy.mood > 0.75 ? '😄' : fairy.mood > 0.5 ? '🙂' : fairy.mood > 0.3 ? '😐' : '😪'

  return (
    <div className="info-panel panel">
      <button
        type="button"
        className="close-btn"
        onClick={() => {
          select(null)
          getEngine()?.focusById(null)
        }}
        aria-label="关闭"
      >
        ×
      </button>
      <div className="info-header">
        <span className="info-avatar" style={{ background: fairy.color }}>
          {ACTIVITY_EMOJI[fairy.activity] ?? '🌿'}
        </span>
        <div>
          <div className="info-name">{fairy.name}</div>
          <div className="info-activity">{fairy.activityLabel}</div>
        </div>
      </div>
      <div className="info-mood">
        <span>心情 {moodFace}</span>
        <div className="mood-bar">
          <div className="mood-fill" style={{ width: `${moodPct}%`, background: fairy.color }} />
        </div>
      </div>
      <p className="info-hint">点击空白处返回全景视角</p>
    </div>
  )
}
