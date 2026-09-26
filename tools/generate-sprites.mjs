/**
 * 精灵树洞 - 程序化像素素材生成器
 *
 * 生成内容（全部透明底 PNG + manifest.json）：
 *  - 4 个小精灵精灵图（32x32/帧）：idle/walk/sleep/eat/read/play/dance 七种动画
 *  - 树洞背景 480x270 与 9 件家具贴图
 *
 * 用法：node tools/generate-sprites.mjs
 * 输出：src/assets/sprites/
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sprites')
const FRAME = 32

/* ---------------------------------- 基础原语 ---------------------------------- */

function hex(c) {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

/** 颜色明暗调整：amt>0 变亮，<0 变暗 */
function shade(c, amt) {
  const [r, g, b] = hex(c)
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))))
  return [f(r), f(g), f(b), 255]
}

/** 可复现随机数（mulberry32） */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Px {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.data = new Uint8Array(w * h * 4)
  }
  set(x, y, c) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return
    const i = (y * this.w + x) * 4
    this.data[i] = c[0]
    this.data[i + 1] = c[1]
    this.data[i + 2] = c[2]
    this.data[i + 3] = c[3] ?? 255
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null
    const i = (y * this.w + x) * 4
    return this.data[i + 3] === 0 ? null : [this.data[i], this.data[i + 1], this.data[i + 2], 255]
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c)
  }
  /** 实心像素圆（逐像素半径判断，边缘干净） */
  circle(cx, cy, r, c) {
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) this.set(cx + i, cy + j, c)
  }
  /** 实心像素椭圆 */
  ellipse(cx, cy, rx, ry, c) {
    for (let j = -ry; j <= ry; j++)
      for (let i = -rx; i <= rx; i++)
        if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1.15) this.set(cx + i, cy + j, c)
  }
  hline(x, y, len, c) {
    this.rect(x, y, len, 1, c)
  }
  vline(x, y, len, c) {
    this.rect(x, y, 1, len, c)
  }
  blit(src, dx, dy) {
    for (let j = 0; j < src.h; j++)
      for (let i = 0; i < src.w; i++) {
        const c = src.get(i, j)
        if (c) this.set(dx + i, dy + j, c)
      }
  }
  /** 自动描边：给所有不透明像素的透明邻居填轮廓色 */
  outline(c) {
    const marks = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))
          marks.push([x, y])
      }
    for (const [x, y] of marks) this.set(x, y, c)
  }
  toPng() {
    return PNG.sync.write({ width: this.w, height: this.h, data: Buffer.from(this.data) })
  }
}

/* ---------------------------------- 精灵绘制 ---------------------------------- */

/**
 * 站姿小精灵（Q 版团子造型，正面朝观众）
 * opts: { pal, hat, bob, eyes, mouth, legs, arms, prop, propFrame }
 */
function drawFairy(px, o) {
  const P = o.pal
  const bob = o.bob ?? 0
  const bodyCy = 18 + bob
  const bodyBottom = bodyCy + 7
  const INK = P.ink

  // 腿（先画，被身体覆盖顶部）
  const legTop = bodyBottom - 3
  const legs = o.legs ?? 'stand'
  const legPose = { stand: [0, 0], a: [-2, 1], b: [2, -1], lift: [-1, -2], mid: [1, 0] }[legs] ?? [0, 0]
  px.rect(12 + legPose[0], legTop, 3, 28 - legTop, P.bodyDark)
  px.rect(17 + legPose[1], legTop, 3, 28 - legTop - (legs === 'b' ? 1 : 0), P.bodyDark)
  // 脚丫
  px.rect(11 + legPose[0], 27, 4, 1, shade(P.body, -0.25))
  px.rect(17 + legPose[1], 27, 4, 1, shade(P.body, -0.25))

  // 手臂（在身体后侧，摆动）
  const armY = bodyCy + 2
  const arms = o.arms ?? 'down'
  const armPose = {
    down: [-1, 1],
    swingA: [-3, 2],
    swingB: [2, -3],
    upA: [-4, -4],
    upB: [-4, -4],
    front: [0, 0],
  }[arms] ?? [0, 0]
  px.circle(7 + armPose[0], armY + Math.abs(armPose[0]), 2, P.body)
  px.circle(24 - armPose[1] * -1, armY + Math.abs(armPose[1] ?? 0), 2, P.body)

  // 身体（圆润团子）
  px.ellipse(16, bodyCy, 8, 8, P.body)
  px.rect(8, bodyCy - 2, 16, 9, P.body) // 补齐中段
  // 底部阴影 + 左上高光
  px.ellipse(16, bodyCy + 5, 6, 2, P.bodyDark)
  px.hline(11, bodyCy - 6, 4, P.bodyLight)
  px.set(10, bodyCy - 5, P.bodyLight)

  // 脸部
  drawFace(px, P, o, bodyCy)

  // 帽子（头顶装饰，随 bob 一起动）
  drawHat(px, P, o.hat, 16, bodyCy - 9)

  // 道具
  drawProp(px, P, o)

  px.outline(INK)
}

/** 脸：眼睛/腮红/嘴。eyes: open|closed|half|happy ; mouth: calm|smile|open|chew */
function drawFace(px, P, o, bodyCy) {
  const eyeY = bodyCy - 2
  const eyes = o.eyes ?? 'open'
  for (const ex of [12, 20]) {
    if (eyes === 'open') {
      px.rect(ex, eyeY - 1, 2, 3, [255, 255, 255, 255])
      px.rect(ex + (ex < 16 ? 1 : 0), eyeY, 1, 2, [40, 32, 50, 255])
    } else if (eyes === 'half') {
      px.rect(ex, eyeY, 2, 1, [255, 255, 255, 255])
      px.rect(ex, eyeY + 1, 2, 1, P.ink)
    } else if (eyes === 'closed') {
      px.hline(ex, eyeY + 1, 2, P.ink)
    } else if (eyes === 'happy') {
      px.set(ex, eyeY, P.ink)
      px.set(ex + 1, eyeY + 1, P.ink)
    }
  }
  // 腮红
  px.rect(9, eyeY + 3, 2, 2, P.cheek)
  px.rect(21, eyeY + 3, 2, 2, P.cheek)
  // 嘴
  const mouth = o.mouth ?? 'calm'
  const my = eyeY + 5
  if (mouth === 'smile') {
    px.set(15, my, P.ink)
    px.set(16, my + 1, P.ink)
    px.set(17, my, P.ink)
  } else if (mouth === 'open' || mouth === 'chew') {
    const h = mouth === 'open' ? 3 : 2
    px.rect(15, my, 3, h, [86, 44, 52, 255])
    px.set(15, my + h - 1, [200, 120, 120, 255])
  } else {
    px.hline(15, my, 2, shade(P.body, -0.3))
  }
}

/** 帽子：leaf 叶子 / flower 花朵 / mushroom 蘑菇帽 / star 星星 */
function drawHat(px, P, type, cx, cy) {
  if (type === 'leaf') {
    px.vline(cx, cy - 2, 4, shade(P.hat, -0.3))
    px.set(cx + 1, cy - 1, P.hat)
    px.set(cx + 2, cy - 2, P.hat)
    px.set(cx - 1, cy + 1, P.hat)
    px.set(cx - 2, cy + 2, P.hat)
    px.set(cx + 2, cy - 1, shade(P.hat, 0.25))
    px.set(cx - 2, cy + 1, shade(P.hat, 0.25))
  } else if (type === 'flower') {
    px.set(cx - 1, cy - 2, P.hat)
    px.set(cx + 1, cy - 2, P.hat)
    px.set(cx, cy - 3, P.hat)
    px.set(cx - 1, cy, P.hat)
    px.set(cx + 1, cy, P.hat)
    px.set(cx, cy - 1, [255, 224, 106, 255])
    px.set(cx, cy + 1, shade(P.hat, -0.3)) // 花萼
  } else if (type === 'mushroom') {
    px.ellipse(cx, cy, 5, 3, P.hat)
    px.hline(cx - 4, cy - 2, 9, P.hat)
    px.set(cx - 3, cy - 2, [255, 244, 220, 255])
    px.set(cx + 2, cy - 3, [255, 244, 220, 255])
    px.set(cx, cy - 1, shade(P.hat, 0.3))
  } else if (type === 'star') {
    px.set(cx, cy - 3, P.hat)
    px.rect(cx - 1, cy - 2, 3, 3, P.hat)
    px.set(cx - 3, cy - 1, P.hat)
    px.set(cx + 3, cy - 1, P.hat)
    px.set(cx - 2, cy, P.hat)
    px.set(cx + 2, cy, P.hat)
    px.set(cx, cy + 1, shade(P.hat, -0.25))
    px.set(cx, cy - 2, [255, 255, 220, 255])
  }
}

/** 道具：zzz / food / book / star / note（propFrame 驱动帧间变化） */
function drawProp(px, P, o) {
  const f = o.propFrame ?? 0
  switch (o.prop) {
    case 'zzz': {
      // 睡眠 Zzz（右上，清晰的 Z 字，两档大小循环出现）
      const z = (x, y, s) => {
        const c = [236, 226, 255, 255]
        px.hline(x, y, s, c) // 顶横
        px.hline(x, y + s - 1, s, c) // 底横
        for (let k = 1; k < s - 1; k++) px.set(x + (s - 1 - k), y + k, c) // 斜杠
      }
      z(24, 7, 5)
      if (f % 2 === 0) z(21, 1, 3)
      else z(28, 2, 3)
      if (f % 4 === 3) z(19, 12, 3)
      break
    }
    case 'food': {
      // 手前小果子：帧间被"咬"掉一块
      const fx = 22
      const fy = 18 + (o.bob ?? 0)
      px.circle(fx, fy, 3, [255, 170, 76, 255])
      px.set(fx - 1, fy - 2, [255, 220, 150, 255])
      px.vline(fx + 1, fy - 4, 2, [104, 82, 48, 255]) // 果柄
      if (f % 2 === 1) px.set(fx - 2, fy, [0, 0, 0, 0]) // 咬痕（描边前抠掉）
      break
    }
    case 'book': {
      const by = 24 + (o.bob ?? 0)
      px.rect(10, by, 12, 5, [255, 248, 232, 255])
      px.vline(16, by, 5, P.ink)
      px.hline(10, by - 1, 12, P.hat) // 封面边
      if (f % 4 === 2) px.set(14, by + 1, shade(P.hat, -0.2)) // 翻页暗示
      break
    }
    case 'star': {
      const sy = 8 + [0, -1, 0, 1][f % 4]
      const draw = (x, y, c) => {
        px.set(x, y - 2, c)
        px.rect(x - 1, y - 1, 3, 3, c)
        px.set(x - 2, y, c)
        px.set(x + 2, y, c)
      }
      draw(7, 10 + (f % 3), [255, 230, 110, 255])
      draw(25, 13 - (f % 3), [255, 230, 110, 255])
      break
    }
    case 'note': {
      // 音符左右交替
      const left = f % 2 === 0
      const nx = left ? 6 : 24
      const ny = 10 + (f % 4)
      px.rect(nx, ny, 1, 4, [240, 230, 255, 255])
      px.set(nx + 1, ny, [240, 230, 255, 255])
      px.rect(nx - 1, ny + 3, 2, 2, [240, 230, 255, 255])
      break
    }
  }
}

/** 躺姿（睡觉）：身体横放，闭眼，帽子保留 */
function drawFairyLying(px, o) {
  const P = o.pal
  const f = o.propFrame ?? 0
  const bodyCy = 22
  px.ellipse(15, bodyCy, 10, 6, P.body)
  px.rect(8, bodyCy - 2, 15, 5, P.body)
  px.ellipse(15, bodyCy + 3, 7, 2, P.bodyDark) // 被侧阴影
  px.hline(9, bodyCy - 4, 5, P.bodyLight)
  // 侧脸：闭眼 + 腮红
  px.hline(11, bodyCy - 1, 2, P.ink)
  px.hline(18, bodyCy - 1, 2, P.ink)
  px.rect(9, bodyCy + 1, 2, 1, P.cheek)
  px.rect(21, bodyCy + 1, 2, 1, P.cheek)
  px.set(16, bodyCy + 2, shade(P.body, -0.3))
  // 小脚丫
  px.rect(24, bodyCy + 3, 2, 2, P.bodyDark)
  // 帽子歪在头上
  drawHat(px, P, o.hat, 8, bodyCy - 6)
  // Zzz
  drawProp(px, P, { prop: 'zzz', propFrame: f })
  px.outline(P.ink)
}

/* ---------------------------------- 动画定义 ---------------------------------- */

/** 每个动画：帧参数生成器数组 */
const ANIMS = {
  idle: [
    { bob: 0, eyes: 'open', mouth: 'calm', legs: 'stand', arms: 'down' },
    { bob: 1, eyes: 'open', mouth: 'calm', legs: 'stand', arms: 'down' },
    { bob: 1, eyes: 'closed', mouth: 'calm', legs: 'stand', arms: 'down' },
    { bob: 0, eyes: 'half', mouth: 'smile', legs: 'stand', arms: 'down' },
  ],
  walk: [
    { bob: 0, eyes: 'open', mouth: 'calm', legs: 'a', arms: 'swingA' },
    { bob: -1, eyes: 'open', mouth: 'calm', legs: 'mid', arms: 'down' },
    { bob: 0, eyes: 'open', mouth: 'calm', legs: 'b', arms: 'swingB' },
    { bob: 0, eyes: 'open', mouth: 'calm', legs: 'b', arms: 'swingB' },
    { bob: -1, eyes: 'open', mouth: 'calm', legs: 'mid', arms: 'down' },
    { bob: 0, eyes: 'open', mouth: 'calm', legs: 'a', arms: 'swingA' },
  ],
  sleep: [0, 1, 2, 3].map((f) => ({ lying: true, propFrame: f })),
  eat: [
    { bob: 0, eyes: 'half', mouth: 'open', legs: 'stand', arms: 'front', prop: 'food', propFrame: 0 },
    { bob: 1, eyes: 'closed', mouth: 'chew', legs: 'stand', arms: 'front', prop: 'food', propFrame: 1 },
    { bob: 1, eyes: 'closed', mouth: 'chew', legs: 'stand', arms: 'front', prop: 'food', propFrame: 0 },
    { bob: 0, eyes: 'happy', mouth: 'smile', legs: 'stand', arms: 'down', prop: 'food', propFrame: 1 },
  ],
  read: [
    { bob: 0, eyes: 'open', mouth: 'calm', legs: 'stand', arms: 'front', prop: 'book', propFrame: 0 },
    { bob: 1, eyes: 'half', mouth: 'calm', legs: 'stand', arms: 'front', prop: 'book', propFrame: 1 },
    { bob: 1, eyes: 'half', mouth: 'calm', legs: 'stand', arms: 'front', prop: 'book', propFrame: 0 },
    { bob: 0, eyes: 'open', mouth: 'smile', legs: 'stand', arms: 'front', prop: 'book', propFrame: 2 },
  ],
  play: [
    { bob: -2, eyes: 'open', mouth: 'open', legs: 'lift', arms: 'upA', prop: 'star', propFrame: 0 },
    { bob: 1, eyes: 'open', mouth: 'open', legs: 'mid', arms: 'upB', prop: 'star', propFrame: 1 },
    { bob: -2, eyes: 'happy', mouth: 'smile', legs: 'lift', arms: 'upA', prop: 'star', propFrame: 2 },
    { bob: 0, eyes: 'open', mouth: 'open', legs: 'a', arms: 'swingA', prop: 'star', propFrame: 3 },
    { bob: -1, eyes: 'happy', mouth: 'smile', legs: 'b', arms: 'upB', prop: 'star', propFrame: 1 },
    { bob: 0, eyes: 'open', mouth: 'open', legs: 'mid', arms: 'swingB', prop: 'star', propFrame: 2 },
  ],
  dance: [
    { bob: -1, eyes: 'happy', mouth: 'smile', legs: 'a', arms: 'upA', prop: 'note', propFrame: 0 },
    { bob: 1, eyes: 'happy', mouth: 'open', legs: 'b', arms: 'swingA', prop: 'note', propFrame: 1 },
    { bob: -1, eyes: 'happy', mouth: 'smile', legs: 'b', arms: 'upB', prop: 'note', propFrame: 0 },
    { bob: 1, eyes: 'open', mouth: 'smile', legs: 'a', arms: 'swingB', prop: 'note', propFrame: 1 },
  ],
}
const ANIM_FPS = { idle: 4, walk: 8, sleep: 2, eat: 6, read: 3, play: 8, dance: 6 }

/** 四个小精灵配色与帽子 */
const FAIRY_STYLES = {
  moss: {
    body: '#8ac926', hat: '#4f9e3f', cheek: '#ff9e9e',
    ink: '#2a2a33', bodyLight: null, bodyDark: null,
    hatType: 'leaf',
  },
  berry: {
    body: '#f28cb8', hat: '#ff6392', cheek: '#ffd3dc',
    ink: '#402a3a', hatType: 'flower',
  },
  sky: {
    body: '#6fc3df', hat: '#e05252', cheek: '#ffc3c3',
    ink: '#22333f', hatType: 'mushroom',
  },
  glow: {
    body: '#ffd166', hat: '#ffb703', cheek: '#ff9e6d',
    ink: '#4a3a1a', hatType: 'star',
  },
}

function buildPalette(style) {
  return {
    body: hex(style.body),
    bodyDark: shade(style.body, -0.22),
    bodyLight: shade(style.body, 0.28),
    hat: hex(style.hat),
    cheek: hex(style.cheek),
    ink: hex(style.ink),
  }
}

/** 生成单个精灵的横向精灵图，返回 {frames, animations} */
function buildFairySheet(style) {
  const pal = buildPalette(style)
  const names = Object.keys(ANIMS)
  const total = names.reduce((s, n) => s + ANIMS[n].length, 0)
  const sheet = new Px(FRAME * total, FRAME)
  const animations = {}
  let idx = 0
  for (const name of names) {
    const frames = ANIMS[name]
    animations[name] = { start: idx, count: frames.length, fps: ANIM_FPS[name] }
    frames.forEach((o, i) => {
      const cell = new Px(FRAME, FRAME)
      if (o.lying) drawFairyLying(cell, { pal, hat: style.hatType, ...o })
      else drawFairy(cell, { pal, hat: style.hatType, ...o })
      sheet.blit(cell, idx * FRAME, 0)
      idx++
    })
  }
  return { sheet, animations }
}

/* ---------------------------------- 场景贴图 ---------------------------------- */

const WOOD = { wall: '#4a3327', wallDark: '#3a281e', wallLight: '#5a4032', floor: '#6b4c36', floorDark: '#553b29', floorLight: '#7d5a42', ink: '#241812' }

function drawBackground(w = 480, h = 270) {
  const px = new Px(w, h)
  const r = rng(20260926)
  // 墙面竖木板
  px.rect(0, 0, w, h, hex(WOOD.wall))
  for (let x = 0; x < w; x += 32) {
    px.vline(x, 0, h, hex(WOOD.wallDark))
    // 每块板内的木纹短线
    for (let k = 0; k < 14; k++) {
      const wy = Math.floor(r() * h)
      const wx = x + 3 + Math.floor(r() * 26)
      const len = 3 + Math.floor(r() * 8)
      px.hline(wx, wy, Math.min(len, x + 30 - wx), hex(r() > 0.5 ? WOOD.wallDark : WOOD.wallLight))
    }
  }
  // 顶部树洞弧顶（三层年轮弧）
  for (let ring = 0; ring < 3; ring++) {
    const rr = 210 - ring * 26
    for (let x = 0; x < w; x++) {
      const dx = x - w / 2
      const y = Math.round(78 - ring * 14 - Math.sqrt(Math.max(0, rr * rr * 0.16 - dx * dx * 0.25)))
      if (y >= 0) px.set(x, y + ring, hex(ring % 2 ? WOOD.wallDark : WOOD.wallLight))
    }
  }
  px.rect(0, 0, w, 10, hex(WOOD.wallDark))
  // 墙上零星小藤蔓点缀
  for (let k = 0; k < 8; k++) {
    const vx = 20 + Math.floor(r() * (w - 40))
    const vy = 40 + Math.floor(r() * 90)
    px.set(vx, vy, hex('#5d7a3a'))
    px.set(vx, vy + 1, hex('#5d7a3a'))
    px.set(vx + 1, vy + 2, hex('#6f8f47'))
    if (r() > 0.5) px.set(vx - 1, vy + 3, hex('#6f8f47'))
  }
  // 地板（横向木板）
  const floorY = 208
  px.rect(0, floorY, w, h - floorY, hex(WOOD.floor))
  for (let y = floorY; y < h; y += 14) px.hline(0, y, w, hex(WOOD.floorDark))
  for (let y = floorY; y < h; y += 14) {
    const off = (y / 14) % 2 === 0 ? 0 : 48
    for (let x = off; x < w; x += 96) px.vline(x, y + 1, 13, hex(WOOD.floorDark))
  }
  // 地板高光
  px.hline(0, floorY + 1, w, hex(WOOD.floorLight))
  // 墙脚线
  px.hline(0, floorY - 2, w, hex(WOOD.floorDark))
  px.hline(0, floorY - 1, w, hex('#8a6a4e'))
  // 两侧暗角
  for (let x = 0; x < 46; x++) {
    const a = Math.round((1 - x / 46) * 70)
    for (let y = 0; y < h; y++) {
      const c = px.get(x, y)
      if (c) px.set(x, y, [c[0] - a * 0.4, c[1] - a * 0.3, c[2] - a * 0.25, 255])
    }
    for (let y = 0; y < h; y++) {
      const c = px.get(w - 1 - x, y)
      if (c) px.set(w - 1 - x, y, [c[0] - a * 0.4, c[1] - a * 0.3, c[2] - a * 0.25, 255])
    }
  }
  return px
}

function drawBed() {
  // 蘑菇床 56x38：菌盖当被檐，菌柄床体
  const px = new Px(56, 38)
  px.rect(4, 14, 48, 16, hex('#e8dcc0')) // 床垫
  px.ellipse(28, 12, 25, 7, hex('#e05252')) // 菌盖被子
  px.hline(6, 14, 45, hex('#c23e3e'))
  px.rect(10, 16, 36, 8, hex('#f2e8d4')) // 枕头区
  px.rect(6, 30, 8, 6, hex('#d8c8a8')) // 床腿
  px.rect(42, 30, 8, 6, hex('#d8c8a8'))
  px.set(14, 8, hex('#ffe8e8')) // 菌盖白点
  px.set(34, 6, hex('#ffe8e8'))
  px.set(24, 10, hex('#ffe8e8'))
  px.set(44, 9, hex('#ffe8e8'))
  px.outline(hex(WOOD.ink))
  return px
}

function drawTable() {
  // 木桌+果子盘 44x30
  const px = new Px(44, 30)
  px.rect(2, 10, 40, 5, hex('#8a5a3a'))
  px.hline(2, 10, 40, hex('#a5714a'))
  px.rect(5, 15, 4, 13, hex('#6e4630'))
  px.rect(35, 15, 4, 13, hex('#6e4630'))
  // 果盘
  px.ellipse(22, 8, 8, 3, hex('#d9c9a8'))
  px.circle(19, 5, 2, hex('#ff8c42'))
  px.circle(24, 5, 2, hex('#8ac926'))
  px.circle(22, 3, 2, hex('#f2506e'))
  px.outline(hex(WOOD.ink))
  return px
}

function drawShelf() {
  // 三层书架 38x48
  const px = new Px(38, 48)
  px.rect(0, 0, 38, 48, hex('#5a3c28'))
  px.rect(2, 2, 34, 44, hex('#3e2818'))
  const books = ['#e05252', '#4f9e3f', '#f2b134', '#5b8bd0', '#c46bd0', '#e08b4a']
  const r = rng(42)
  for (let s = 0; s < 3; s++) {
    const sy = 4 + s * 14
    px.rect(2, sy + 11, 34, 3, hex('#7a5238')) // 隔板
    let x = 4
    while (x < 33) {
      const bw = 3 + Math.floor(r() * 2)
      const bh = 8 + Math.floor(r() * 2)
      px.rect(x, sy + 9 - bh + 2, bw, bh, hex(books[Math.floor(r() * books.length)]))
      x += bw + 1
      if (r() > 0.82) x += 2 // 缺口
    }
  }
  px.outline(hex(WOOD.ink))
  return px
}

function drawLamp() {
  // 萤火灯笼 18x30
  const px = new Px(18, 30)
  px.vline(9, 0, 5, hex('#5a4630'))
  px.rect(4, 5, 11, 3, hex('#5a4630'))
  px.ellipse(9, 15, 5, 7, hex('#ffdf8e'))
  px.ellipse(9, 15, 5, 7, [255, 223, 142, 170])
  px.circle(9, 14, 3, hex('#fff6c8'))
  px.rect(4, 22, 11, 3, hex('#5a4630'))
  // 灯芯小虫
  px.set(8, 15, hex('#7a5a20'))
  px.set(10, 16, hex('#7a5a20'))
  px.outline(hex('#3a2c1a'))
  return px
}

function drawWindow() {
  // 圆窗 34x34（玻璃透明度留给运行时叠色）
  const px = new Px(34, 34)
  px.circle(17, 17, 15, hex('#8a6a4e'))
  px.circle(17, 17, 12, hex('#9ecfe8'))
  px.circle(17, 17, 12, hex('#9ecfe8'))
  px.vline(17, 5, 24, hex('#8a6a4e'))
  px.hline(5, 17, 24, hex('#8a6a4e'))
  px.set(11, 10, hex('#cdeefb'))
  px.set(12, 10, hex('#cdeefb'))
  px.set(11, 11, hex('#cdeefb'))
  px.rect(15, 32, 5, 2, hex('#6e5238')) // 窗台
  return px
}

function drawRug() {
  // 圆形条纹地毯 72x30
  const px = new Px(72, 30)
  px.ellipse(36, 15, 34, 13, hex('#b0563e'))
  px.ellipse(36, 15, 27, 10, hex('#d98a5e'))
  px.ellipse(36, 15, 19, 7, hex('#b0563e'))
  px.ellipse(36, 15, 11, 4, hex('#e8b07a'))
  return px
}

function drawStove() {
  // 小火炉 32x40
  const px = new Px(32, 40)
  px.rect(2, 4, 28, 34, hex('#7a7a82'))
  px.rect(4, 6, 24, 30, hex('#5c5c66'))
  px.rect(8, 14, 16, 14, hex('#2a2226')) // 炉膛
  px.rect(10, 20, 12, 7, hex('#e8632c')) // 火焰
  px.rect(12, 17, 8, 4, hex('#ffb13c'))
  px.rect(14, 15, 4, 3, hex('#ffe28a'))
  px.rect(4, 0, 24, 4, hex('#8a8a94')) // 炉顶
  px.vline(6, 22, 4, hex('#9a9aa4'))
  px.rect(6, 36, 20, 4, hex('#5c5c66'))
  px.outline(hex('#1e1e26'))
  return px
}

function drawPlant() {
  // 盆栽 22x28
  const px = new Px(22, 28)
  px.rect(6, 18, 10, 8, hex('#c46b3f'))
  px.rect(5, 17, 12, 2, hex('#a5552f'))
  px.vline(11, 8, 10, hex('#4f7a34'))
  px.ellipse(6, 10, 5, 4, hex('#5d8f3e'))
  px.ellipse(16, 10, 5, 4, hex('#5d8f3e'))
  px.ellipse(11, 5, 5, 4, hex('#6fa34a'))
  px.set(9, 4, hex('#8fc463'))
  px.set(14, 8, hex('#8fc463'))
  px.outline(hex('#2c3a1e'))
  return px
}

function drawBall() {
  // 玩具球 14x14
  const px = new Px(14, 14)
  px.circle(7, 7, 6, hex('#f2506e'))
  px.hline(2, 4, 10, hex('#ffe8ee'))
  px.hline(2, 9, 10, hex('#ffe8ee'))
  px.set(4, 3, hex('#fff'))
  px.outline(hex('#3a1a24'))
  return px
}

/* ---------------------------------- 主流程 ---------------------------------- */

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const manifest = { frameSize: FRAME, fairies: {}, furniture: [], background: null }

  // 精灵图
  for (const [id, style] of Object.entries(FAIRY_STYLES)) {
    const { sheet, animations } = buildFairySheet(style)
    const file = `fairy-${id}.png`
    writeFileSync(join(OUT_DIR, file), sheet.toPng())
    manifest.fairies[id] = { file, animations }
    console.log(`✓ ${file} ${sheet.w}x${sheet.h} (${Object.keys(animations).length} anims)`)
  }

  // 场景与家具
  const furnitureDrawers = [
    ['bed', drawBed], ['table', drawTable], ['shelf', drawShelf], ['lamp', drawLamp],
    ['window', drawWindow], ['rug', drawRug], ['stove', drawStove], ['plant', drawPlant], ['ball', drawBall],
  ]
  for (const [id, fn] of furnitureDrawers) {
    const px = fn()
    const file = `furniture-${id}.png`
    writeFileSync(join(OUT_DIR, file), px.toPng())
    manifest.furniture.push({ id, file, w: px.w, h: px.h })
    console.log(`✓ ${file} ${px.w}x${px.h}`)
  }

  const bg = drawBackground()
  writeFileSync(join(OUT_DIR, 'scene-bg.png'), bg.toPng())
  manifest.background = { file: 'scene-bg.png', w: bg.w, h: bg.h }
  console.log(`✓ scene-bg.png ${bg.w}x${bg.h}`)

  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`✓ manifest.json — 完成，共 ${Object.keys(manifest.fairies).length} 个精灵 / ${manifest.furniture.length} 件家具`)
}

main()
