import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { FURNITURE_LAYOUT } from '../data/config'
import type { WorldClock } from './WorldClock'

interface Firefly {
  baseX: number
  baseY: number
  phase: number
  speed: number
  radius: number
}

/**
 * 树洞场景：背景 + 家具 + 昼夜光照 + 萤火虫。
 * root 为静态场景（背景/家具/窗色），fx 为光照特效层
 * （夜色蒙版/暖光/萤火虫），由引擎挂到世界顶层以覆盖精灵。
 */
export class SceneHollow {
  readonly root = new Container()
  readonly fx = new Container()
  private windowTint: Graphics
  private nightOverlay: Graphics
  private warmLights: Container
  private fireflyLayer: Graphics
  private fireflies: Firefly[] = []
  private t = 0

  constructor(bg: Texture, furniture: Map<string, Texture>) {
    this.root.sortableChildren = true

    const bgSprite = new Sprite(bg)
    bgSprite.zIndex = 0
    this.root.addChild(bgSprite)

    for (const item of FURNITURE_LAYOUT) {
      const tex = furniture.get(item.id)
      if (!tex) continue
      const s = new Sprite(tex)
      s.position.set(item.x, item.y)
      s.zIndex = item.z
      this.root.addChild(s)
    }

    // 窗户夜色叠加（窗玻璃区域，白天透明）
    this.windowTint = new Graphics()
    this.windowTint.rect(366, 102, 22, 22).fill({ color: 0x2a3a6e })
    this.windowTint.zIndex = 1
    this.root.addChild(this.windowTint)

    // ---- 光照特效层（覆盖精灵） ----
    this.fx.eventMode = 'none'
    this.fx.sortableChildren = true

    // 夜色蒙版（multiply，压暗一切）
    this.nightOverlay = new Graphics()
    this.nightOverlay.rect(0, 0, 480, 270).fill({ color: 0x1a2448 })
    this.nightOverlay.blendMode = 'multiply'
    this.nightOverlay.zIndex = 1
    this.fx.addChild(this.nightOverlay)

    // 暖色光源（灯笼 + 火炉），夜晚渐显
    this.warmLights = new Container()
    this.warmLights.zIndex = 2
    this.warmLights.addChild(this.makeGlow(304, 40, 26))
    this.warmLights.addChild(this.makeGlow(136, 196, 34))
    this.warmLights.addChild(this.makeGlow(136, 196, 18))
    this.fx.addChild(this.warmLights)

    // 萤火虫（最顶层）
    this.fireflyLayer = new Graphics()
    this.fireflyLayer.zIndex = 3
    this.fx.addChild(this.fireflyLayer)
    for (let i = 0; i < 12; i++) {
      this.fireflies.push({
        baseX: 40 + Math.random() * 400,
        baseY: 30 + Math.random() * 165,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
        radius: 8 + Math.random() * 20,
      })
    }
  }

  /** 柔和暖光晕：多层同心圆，add 混合 */
  private makeGlow(cx: number, cy: number, r: number): Graphics {
    const g = new Graphics()
    const layers = [
      { r: 1.0, a: 0.16 },
      { r: 0.66, a: 0.22 },
      { r: 0.36, a: 0.30 },
    ]
    for (const l of layers) {
      g.circle(cx, cy, r * l.r).fill({ color: 0xffb84d, alpha: l.a })
    }
    g.blendMode = 'add'
    return g
  }

  update(dt: number, clock: WorldClock) {
    this.t += dt
    const dark = 1 - clock.daylight // 0 白天 .. 1 深夜
    this.nightOverlay.alpha = dark * 0.6
    this.warmLights.alpha = Math.min(1, dark * 1.6)
    this.windowTint.alpha = dark * 0.85

    // 萤火虫：夜晚活动
    const show = dark > 0.55 ? (dark - 0.55) / 0.45 : 0
    this.fireflyLayer.clear()
    if (show > 0.01) {
      for (const f of this.fireflies) {
        const x = f.baseX + Math.cos(this.t * f.speed + f.phase) * f.radius
        const y = f.baseY + Math.sin(this.t * f.speed * 1.4 + f.phase * 2) * f.radius * 0.5
        const blink = 0.35 + 0.65 * Math.abs(Math.sin(this.t * 1.8 + f.phase * 3))
        const a = show * blink
        this.fireflyLayer.circle(x, y, 2.5).fill({ color: 0xd8ff8a, alpha: a * 0.35 })
        this.fireflyLayer.circle(x, y, 1).fill({ color: 0xf4ffb0, alpha: a })
      }
    }
  }
}
