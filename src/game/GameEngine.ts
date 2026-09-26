import { Application, Assets, Container, Rectangle, Texture } from 'pixi.js'
import { FAIRY_DEFS, GAME_H, GAME_W } from '../data/config'
import { Fairy } from './Fairy'
import { SceneHollow } from './Scene'
import { WorldClock, type DayPhase } from './WorldClock'
import type { AnimName, FairySnapshot } from './types'

interface SpriteManifest {
  frameSize: number
  fairies: Record<string, { file: string; animations: Record<string, { start: number; count: number; fps: number }> }>
  furniture: { id: string; file: string; w: number; h: number }[]
  background: { file: string; w: number; h: number }
}

const SPRITES_BASE = import.meta.env.BASE_URL + 'sprites/'

export interface GameSnapshot {
  timeLabel: string
  phase: DayPhase
  day: number
  fairies: FairySnapshot[]
}

/**
 * 游戏引擎：Pixi 应用生命周期、纹理装配、主循环、缩放适配与摄像机。
 * 框架无关，通过回调与 React 层通信。
 */
export class GameEngine {
  private app = new Application()
  private world = new Container()
  private scene!: SceneHollow
  private fairies: Fairy[] = []
  private clock = new WorldClock()
  private speed = 1
  private host!: HTMLElement
  private fitScale = 1
  private zoom = 1
  private zoomTarget = 1
  private focusTarget: { x: number; y: number } | null = null
  private camPos = { x: 0, y: 0 }
  private snapAccum = 0
  private disposed = false

  onSnapshot: (s: GameSnapshot) => void = () => {}
  onSelect: (id: string | null) => void = () => {}

  async init(host: HTMLElement) {
    this.host = host
    await this.app.init({
      width: GAME_W,
      height: GAME_H,
      antialias: false,
      background: 0x120d1a,
      roundPixels: true,
    })
    if (this.disposed) {
      this.app.destroy()
      return
    }
    host.appendChild(this.app.canvas)

    const manifest = await this.loadAssets()
    this.buildWorld(manifest)
    this.bindInput()
    this.app.ticker.add((t) => this.tick(t.deltaMS / 1000))
    this.observeResize()
    this.resize()
  }

  private async loadAssets(): Promise<SpriteManifest> {
    const res = await fetch(SPRITES_BASE + 'manifest.json')
    if (!res.ok) throw new Error('manifest.json 加载失败：' + res.status)
    const manifest: SpriteManifest = await res.json()
    const files = new Set<string>()
    for (const f of Object.values(manifest.fairies)) files.add(f.file)
    for (const f of manifest.furniture) files.add(f.file)
    files.add(manifest.background.file)
    await Assets.load([...files].map((f) => SPRITES_BASE + f))
    return manifest
  }

  private buildWorld(manifest: SpriteManifest) {
    this.app.stage.addChild(this.world)
    this.world.sortableChildren = true

    const base = SPRITES_BASE
    const furnitureTex = new Map<string, Texture>()
    for (const f of manifest.furniture) {
      const t = Texture.from(base + f.file)
      t.source.scaleMode = 'nearest'
      furnitureTex.set(f.id, t)
    }
    const bgTex = Texture.from(base + manifest.background!.file)
    bgTex.source.scaleMode = 'nearest'

    this.scene = new SceneHollow(bgTex, furnitureTex)
    this.scene.root.zIndex = 0
    this.world.addChild(this.scene.root)

    // 精灵动画纹理切帧
    for (const def of FAIRY_DEFS) {
      const info = manifest.fairies[def.styleId]
      const sheet = Texture.from(base + info.file)
      sheet.source.scaleMode = 'nearest'
      const anims = {} as Record<AnimName, Texture[]>
      for (const [name, a] of Object.entries(info.animations)) {
        const frames: Texture[] = []
        for (let i = 0; i < a.count; i++) {
          frames.push(
            new Texture({
              source: sheet.source,
              frame: new Rectangle((a.start + i) * manifest.frameSize, 0, manifest.frameSize, manifest.frameSize),
            }),
          )
        }
        anims[name as AnimName] = frames
      }
      const start = { x: 120 + Math.random() * 240, y: 226 + Math.random() * 26 }
      const fairy = new Fairy(def, anims, start.x, start.y)
      fairy.bindClock(this.clock)
      fairy.onSelect = (f) => {
        this.onSelect(f.def.id)
        this.focus(f)
      }
      fairy.onHover = (f) => {
        for (const other of this.fairies) other.setHovered(other === f)
      }
      this.fairies.push(fairy)
      this.world.addChild(fairy.container)
    }
    // 精灵容器 zIndex 从 10 起，按 y 排序（sortableChildren）
    for (const f of this.fairies) f.container.zIndex = 10 + f.y
  }

  private bindInput() {
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('pointertap', (e) => {
      if (e.target === this.app.stage) {
        this.onSelect(null)
        this.unfocus()
      }
    })
  }

  /** 点击精灵：摄像机轻微推近聚焦 */
  private focus(f: Fairy) {
    this.zoomTarget = 1.7
    this.focusTarget = { x: f.x, y: f.y - 16 }
  }

  private unfocus() {
    this.zoomTarget = 1
    this.focusTarget = null
  }

  setSpeed(v: number) {
    this.speed = v
  }

  /** 由 UI 层选中精灵（外部触发聚焦） */
  focusById(id: string | null) {
    const f = this.fairies.find((x) => x.def.id === id)
    if (f) this.focus(f)
    else this.unfocus()
  }

  private observeResize() {
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.resize())
      ro.observe(this.host)
    }
  }

  private resize() {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    if (w === 0 || h === 0) return
    this.app.renderer.resize(w, h)
    this.fitScale = Math.max(1, Math.floor(Math.min(w / GAME_W, h / GAME_H)))
  }

  private tick(realDt: number) {
    const dt = realDt * this.speed
    this.clock.update(dt)
    this.scene.update(dt, this.clock)
    for (const f of this.fairies) f.update(dt, this.fairies)
    this.updateCamera(realDt)

    // 快照节流推送（4 次/秒）
    this.snapAccum += realDt
    if (this.snapAccum > 0.25) {
      this.snapAccum = 0
      this.onSnapshot({
        timeLabel: this.clock.label,
        phase: this.clock.phase,
        day: this.clock.day,
        fairies: this.fairies.map((f) => f.snapshot()),
      })
    }
  }

  private updateCamera(dt: number) {
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 5)
    const scale = this.fitScale * this.zoom
    const viewW = this.app.renderer.width / scale
    const viewH = this.app.renderer.height / scale

    let cx = GAME_W / 2
    let cy = GAME_H / 2
    if (this.focusTarget) {
      cx = Math.max(viewW / 2, Math.min(GAME_W - viewW / 2, this.focusTarget.x))
      cy = Math.max(viewH / 2, Math.min(GAME_H - viewH / 2, this.focusTarget.y))
    }
    this.camPos.x += (cx - this.camPos.x) * Math.min(1, dt * 5)
    this.camPos.y += (cy - this.camPos.y) * Math.min(1, dt * 5)

    this.world.scale.set(scale)
    this.world.position.set(
      this.app.renderer.width / 2 - this.camPos.x * scale,
      this.app.renderer.height / 2 - this.camPos.y * scale,
    )
  }

  destroy() {
    this.disposed = true
    this.app.destroy(true, { children: true })
  }
}
