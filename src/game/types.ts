/** 精灵图动画名（与生成脚本 ANIMS 一一对应） */
export type AnimName = 'idle' | 'walk' | 'sleep' | 'eat' | 'read' | 'play' | 'dance'

/** 小精灵当前活动（用于 UI 展示与决策） */
export type ActivityKind = 'idle' | 'wander' | 'sleep' | 'eat' | 'read' | 'play' | 'dance' | 'warm' | 'chat'

export interface FairySnapshot {
  id: string
  name: string
  color: string
  activity: ActivityKind
  activityLabel: string
  mood: number // 0..1
  x: number
  y: number
}

export interface PoiDef {
  id: string
  /** 活动到达点（精灵脚底坐标） */
  spot: { x: number; y: number }
  /** 到达后播放的动画 */
  anim: AnimName
  /** 对应的活动类型 */
  activity: ActivityKind
  label: string
  /** 面朝方向：1 右 -1 左 */
  face?: number
  /** 躺/坐在家具上（渲染层级跟随家具） */
  offsetY?: number
}

export interface FairyDef {
  id: string
  name: string
  /** 对应精灵图变体 */
  styleId: 'moss' | 'berry' | 'sky' | 'glow'
  /** UI 展示色 */
  color: string
  /** 性格：活力（爱走动玩耍） / 社交（爱凑近同伴） */
  energy: number // 0..1
  social: number // 0..1
}
