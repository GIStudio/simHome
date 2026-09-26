import type { FairyDef, PoiDef } from '../game/types'

/** 游戏内部分辨率（像素艺术原生分辨率） */
export const GAME_W = 480
export const GAME_H = 270
export const FLOOR_Y = 208

/** 游戏内一天时长（现实秒） */
export const DAY_LENGTH = 240

/** 走路速度 px/s */
export const WALK_SPEED = 26

/** 家具摆放（左上角坐标，对应贴图尺寸） */
export const FURNITURE_LAYOUT = [
  { id: 'rug', x: 200, y: 232, z: 2 },
  { id: 'bed', x: 14, y: 172, z: 3 },
  { id: 'stove', x: 120, y: 168, z: 3 },
  { id: 'table', x: 310, y: 190, z: 3 },
  { id: 'shelf', x: 430, y: 160, z: 3 },
  { id: 'plant', x: 452, y: 186, z: 3 },
  { id: 'window', x: 360, y: 96, z: 1 },
  { id: 'lamp', x: 295, y: 22, z: 1 },
  { id: 'ball', x: 258, y: 252, z: 11 },
] as const

/** 活动兴趣点：精灵到达 spot 后播放 anim */
export const POIS: PoiDef[] = [
  { id: 'bed', spot: { x: 44, y: 196 }, anim: 'sleep', activity: 'sleep', label: '呼呼大睡', offsetY: -14 },
  { id: 'table', spot: { x: 302, y: 226 }, anim: 'eat', activity: 'eat', label: '享用果子', face: 1 },
  { id: 'shelf', spot: { x: 422, y: 228 }, anim: 'read', activity: 'read', label: '安静读书', face: -1 },
  { id: 'rug', spot: { x: 236, y: 246 }, anim: 'play', activity: 'play', label: '开心玩耍' },
  { id: 'rug-dance', spot: { x: 210, y: 242 }, anim: 'dance', activity: 'dance', label: '翩翩起舞' },
  { id: 'stove', spot: { x: 148, y: 240 }, anim: 'idle', activity: 'warm', label: '烤火取暖', face: -1 },
  { id: 'window', spot: { x: 376, y: 222 }, anim: 'idle', activity: 'idle', label: '望着窗外', face: 1 },
]

/** 走路活动范围（脚底坐标） */
export const WALK_BOUNDS = { xMin: 26, xMax: 454, yMin: 218, yMax: 258 }

/** 四只小精灵 */
export const FAIRY_DEFS: FairyDef[] = [
  { id: 'moss', name: '苔苔', styleId: 'moss', color: '#8ac926', energy: 0.35, social: 0.3 },
  { id: 'berry', name: '莓莓', styleId: 'berry', color: '#f28cb8', energy: 0.85, social: 0.8 },
  { id: 'sky', name: '天天', styleId: 'sky', color: '#6fc3df', energy: 0.55, social: 0.5 },
  { id: 'glow', name: '闪闪', styleId: 'glow', color: '#ffd166', energy: 0.7, social: 0.95 },
]

/** 活动的 emoji 图标（悬停气泡 / UI 使用） */
export const ACTIVITY_EMOJI: Record<string, string> = {
  idle: '🌿', wander: '🚶', sleep: '💤', eat: '🍓', read: '📖', play: '⚽', dance: '🎵', warm: '🔥', chat: '💬',
}
