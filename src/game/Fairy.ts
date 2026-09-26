import { AnimatedSprite, Container, Graphics, Rectangle, Text, type Texture } from 'pixi.js'
import type { ActivityKind, AnimName, FairyDef, FairySnapshot, PoiDef } from './types'
import type { WorldClock } from './WorldClock'
import { FairyBrain, ACTIVITY_LABELS } from './FairyBrain'
import { POIS, WALK_SPEED, WALK_BOUNDS, ACTIVITY_EMOJI } from '../data/config'

type ExecState =
  | { name: 'idle-wait'; timer: number }
  | { name: 'moving'; target: { x: number; y: number }; onArrive: () => void }
  | { name: 'activity'; anim: AnimName; activity: ActivityKind; timer: number; poi?: PoiDef }
  | { name: 'chat-approach'; partner: Fairy; timer: number }
  | { name: 'chatting'; partner: Fairy; timer: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/**
 * 小精灵实体：动画渲染 + 移动 + 活动执行。
 * 行为由 FairyBrain 决定，本类负责执行与表现。
 */
export class Fairy {
  readonly def: FairyDef
  readonly container = new Container()
  private sprite: AnimatedSprite
  private bubble: Container
  private bubbleText: Text
  private anims: Record<AnimName, Texture[]>
  private brain: FairyBrain
  private exec: ExecState
  private currentAnim: AnimName | null = null
  private brainClock: WorldClock | null = null

  /** 心情 0..1（随活动缓慢变化） */
  mood = 0.7
  /** 脚底世界坐标 */
  x = 240
  y = 240
  face = 1

  onSelect: (f: Fairy) => void = () => {}
  onHover: (f: Fairy | null) => void = () => {}

  constructor(def: FairyDef, anims: Record<AnimName, Texture[]>, startX: number, startY: number) {
    this.def = def
    this.anims = anims
    this.x = startX
    this.y = startY
    this.brain = new FairyBrain(def)

    this.sprite = new AnimatedSprite(anims.idle)
    this.sprite.anchor.set(0.5, 1)
    this.sprite.animationSpeed = 4 / 60
    this.sprite.play()
    this.sprite.eventMode = 'static'
    this.sprite.hitArea = new Rectangle(6, 2, 20, 30) // 收小命中区到身体范围
    this.sprite.cursor = 'pointer'
    this.sprite.on('pointertap', () => this.onSelect(this))
    this.sprite.on('pointerover', () => this.onHover(this))
    this.sprite.on('pointerout', () => this.onHover(null))
    this.container.addChild(this.sprite)

    // 悬停状态气泡（默认隐藏）
    this.bubble = new Container()
    const g = new Graphics()
    g.roundRect(0, 0, 26, 22, 6).fill({ color: 0xfdf6e3, alpha: 0.95 })
    g.roundRect(10, 20, 6, 5, 2).fill({ color: 0xfdf6e3, alpha: 0.95 })
    this.bubble.addChild(g)
    this.bubbleText = new Text({
      text: '🌿',
      style: { fontFamily: 'Segoe UI Emoji, sans-serif', fontSize: 14 },
    })
    this.bubbleText.position.set(5, 2)
    this.bubble.addChild(this.bubbleText)
    this.bubble.visible = false
    this.container.addChild(this.bubble)

    this.exec = { name: 'idle-wait', timer: rand(0.2, 1.5) }
    this.setAnim('idle')
  }

  bindClock(clock: WorldClock) {
    this.brainClock = clock
  }

  get activity(): ActivityKind {
    const s = this.exec
    switch (s.name) {
      case 'activity': return s.activity
      case 'chat-approach':
      case 'chatting': return 'chat'
      case 'moving': return 'wander'
      default: return 'idle'
    }
  }

  get activityLabel(): string {
    const a = this.activity
    if (a === 'chat') return '和小伙伴聊天'
    return ACTIVITY_LABELS[a]
  }

  snapshot(): FairySnapshot {
    return {
      id: this.def.id,
      name: this.def.name,
      color: this.def.color,
      activity: this.activity,
      activityLabel: this.activityLabel,
      mood: this.mood,
      x: this.x,
      y: this.y,
    }
  }

  private setAnim(name: AnimName) {
    if (this.currentAnim === name) return
    this.currentAnim = name
    this.sprite.textures = this.anims[name]
    const fps = { idle: 4, walk: 8, sleep: 2, eat: 6, read: 3, play: 8, dance: 6 }[name]
    this.sprite.animationSpeed = fps / 60
    this.sprite.play()
  }

  /** 每帧更新（dt 为游戏时间秒，已含倍速） */
  update(dt: number, others: Fairy[]) {
    // 心情按活动缓慢趋近目标值
    const moodTarget: Record<string, number> = { sleep: 0.55, eat: 0.85, read: 0.75, play: 1, dance: 0.95, chat: 0.9, wander: 0.6, idle: 0.5, warm: 0.8 }
    const mt = moodTarget[this.activity] ?? 0.6
    this.mood += (mt - this.mood) * dt * 0.05

    switch (this.exec.name) {
      case 'idle-wait': {
        this.exec.timer -= dt
        if (this.exec.timer <= 0) this.nextDecision(others)
        break
      }
      case 'moving': {
        const { target, onArrive } = this.exec
        const dx = target.x - this.x
        const dy = target.y - this.y
        const dist = Math.hypot(dx, dy)
        const step = WALK_SPEED * dt
        if (dist <= step || dist < 1) {
          this.x = target.x
          this.y = target.y
          onArrive()
        } else {
          this.x += (dx / dist) * step
          this.y += (dy / dist) * step
          if (Math.abs(dx) > 1.5) this.face = dx > 0 ? 1 : -1
        }
        break
      }
      case 'activity': {
        this.exec.timer -= dt
        // 睡觉时被深夜锁定：时间到自然醒
        if (this.exec.timer <= 0) this.toIdleWait(rand(0.5, 2))
        break
      }
      case 'chat-approach': {
        this.exec.timer -= dt
        const partner = this.exec.partner
        const dx = partner.x - this.x
        const dy = partner.y - this.y
        const dist = Math.hypot(dx, dy)
        const step = WALK_SPEED * dt
        if (dist <= 22 || this.exec.timer <= 0) {
          if (partner.stateName === 'chat-approach' || (partner.stateName === 'moving' && partner.chatTarget === this)) {
            const dur = Math.max(6, this.exec.timer)
            partner.beginChatWith(this, dur)
            this.startChatting(partner, dur)
          } else if (partner.activity === 'chat') {
            // 对方已在聊天，等待其结束后再试
            this.toIdleWait(rand(1, 3))
          } else {
            this.toIdleWait(rand(1, 3)) // 对方走开了
          }
        } else {
          this.x += (dx / dist) * step
          this.y += (dy / dist) * step
          if (Math.abs(dx) > 1.5) this.face = dx > 0 ? 1 : -1
        }
        break
      }
      case 'chatting': {
        this.exec.timer -= dt
        if (this.exec.timer <= 0) {
          this.exec.partner.endChat()
          this.toIdleWait(rand(1, 3))
        }
        break
      }
    }

    this.syncTransform()
  }

  get stateName(): string {
    return this.exec.name
  }

  /** 正在走向的聊天对象 */
  get chatTarget(): Fairy | null {
    return this.exec.name === 'chat-approach' ? this.exec.partner : null
  }

  /** 供伙伴发起聊天时调用 */
  beginChatWith(initiator: Fairy, duration: number) {
    this.face = initiator.x >= this.x ? 1 : -1
    this.exec = { name: 'chatting', partner: initiator, timer: duration }
    this.setAnim(this.def.energy > 0.7 ? 'dance' : 'idle')
  }

  endChat() {
    this.toIdleWait(rand(0.8, 2))
  }

  private startChatting(partner: Fairy, duration: number) {
    this.face = partner.x >= this.x ? 1 : -1
    this.exec = { name: 'chatting', partner, timer: duration }
    this.setAnim(this.def.energy > 0.7 ? 'dance' : 'idle')
  }

  private toIdleWait(timer: number) {
    this.exec = { name: 'idle-wait', timer }
    this.setAnim('idle')
  }

  private nextDecision(others: Fairy[]) {
    const clock = this.brainClock
    const phase = clock?.phase ?? 'day'
    const isSleepy = clock ? clock.hours >= 21 || clock.hours < 6 : false
    const decision = this.brain.decide(phase, isSleepy)

    if (decision.kind === 'chat') {
      // 找一个没在睡、没在聊的伙伴
      const candidates = others.filter(
        (o) => o !== this && o.activity !== 'sleep' && o.stateName !== 'chatting' && o.stateName !== 'chat-approach',
      )
      if (candidates.length > 0) {
        const partner = candidates[Math.floor(Math.random() * candidates.length)]
        this.exec = { name: 'chat-approach', partner, timer: 12 }
        this.setAnim('walk')
        return
      }
    }
    if (decision.kind === 'poi' && decision.poiId) {
      const poi = POIS.find((p) => p.id === decision.poiId)
      if (poi) {
        // 睡觉占床检查：床被占就去别处（地毯上睡）
        if (poi.id === 'bed' && others.some((o) => o !== this && o.poiId === 'bed')) {
          const rug = POIS.find((p) => p.id === 'rug')!
          this.exec = {
            name: 'activity', anim: 'sleep', activity: 'sleep',
            timer: decision.duration, poi: rug,
          }
          this.moveTo(rug.spot, 'walk', () => this.beginActivity(rug, 'sleep', 'sleep', decision.duration))
          return
        }
        this.moveTo(poi.spot, 'walk', () => this.beginActivity(poi, poi.anim, poi.activity, decision.duration))
        return
      }
    }
    // wander 或兜底
    const t = decision.target ?? {
      x: rand(WALK_BOUNDS.xMin, WALK_BOUNDS.xMax),
      y: rand(WALK_BOUNDS.yMin, WALK_BOUNDS.yMax),
    }
    this.moveTo(t, 'walk', () => {
      this.exec = { name: 'activity', anim: 'idle', activity: 'idle', timer: decision.duration }
      this.setAnim('idle')
    })
  }

  /** 当前所在 POI（用于占位判断） */
  get poiId(): string | undefined {
    return this.exec.name === 'activity' ? this.exec.poi?.id : undefined
  }

  private moveTo(target: { x: number; y: number }, anim: AnimName, onArrive?: () => void) {
    this.exec = { name: 'moving', target, onArrive: onArrive ?? (() => this.toIdleWait(1)) }
    this.setAnim(anim)
  }

  private beginActivity(poi: PoiDef, anim: AnimName, activity: ActivityKind, duration: number) {
    this.face = poi.face ?? (Math.random() > 0.5 ? 1 : -1)
    this.exec = { name: 'activity', anim, activity, timer: duration, poi }
    this.setAnim(anim)
  }

  private syncTransform() {
    const act = this.exec.name === 'activity' ? this.exec : null
    const offY = act && act.anim === 'sleep' ? (act.poi?.offsetY ?? 0) : 0
    this.container.position.set(this.x, this.y + offY)
    this.container.zIndex = this.y + (act && act.anim === 'sleep' ? 5 : 0) // 睡床上抬层级
    this.sprite.scale.x = this.face
    this.bubble.position.set(-13, -this.sprite.texture.height - 8)
    this.bubbleText.text = ACTIVITY_EMOJI[this.activity] ?? '🌿'
  }

  setHovered(hovered: boolean) {
    this.bubble.visible = hovered
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
