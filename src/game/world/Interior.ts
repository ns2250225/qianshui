// 沉船 / 洞穴内部空间
import { Container, Graphics, Sprite } from 'pixi.js'
import type { Space } from './Space'
import type { Feature } from './World'
import { mulberry32, fbm1, shade, pick } from '../core/rng'
import { tex } from '../core/tex'
import * as Art from './Art'
import { save } from '../../store/state'

export const INTERIOR_OY = 60000

export interface Chest {
  id: string
  x: number
  y: number
  sprite: Sprite
  looted: boolean
}

export class Interior implements Space {
  root = new Container()
  feature: Feature
  depth: number
  regionId: string
  w: number
  h: number
  minX = 0
  maxX: number
  ox = 0
  oy = INTERIOR_OY
  chests: Chest[] = []
  exit: { x: number; y: number }
  isCave: boolean
  private seed: number
  private wallColor: number

  constructor(feature: Feature, depth: number, regionId: string, glowLayer: Container) {
    this.feature = feature
    this.depth = depth
    this.regionId = regionId
    this.isCave = feature.kind === 'cave'
    this.seed = feature.seed * 7919 + 13
    const rng = mulberry32(this.seed)
    this.w = 1500 + Math.floor(rng() * 1300)
    this.h = 520 + Math.floor(rng() * 300)
    this.maxX = this.w
    this.wallColor = this.isCave ? shade(Art.floorColor(regionId, depth, 0), 0.75) : feature.sub === 'wood' ? 0x4a3420 : 0x4a4a52
    const g = new Graphics()
    this.root.addChild(g)
    for (let x = -200; x < this.w + 200; x += 8) {
      const c = this.ceilY(x)
      const f = this.floorY(x)
      g.rect(x, this.oy - 400, 8, c - (this.oy - 400)).fill(shade(this.wallColor, 0.7))
      g.rect(x, c - 4, 8, 4).fill(shade(this.wallColor, 1.15))
      g.rect(x, f, 8, 4).fill(shade(this.wallColor, 1.2))
      g.rect(x, f + 4, 8, this.oy + this.h + 400 - f).fill(shade(this.wallColor, 0.8))
    }
    // 背景墙
    const back = new Graphics()
    this.root.addChildAt(back, 0)
    back.rect(-200, this.oy - 400, this.w + 400, this.h + 800).fill(shade(this.wallColor, 0.32))
    if (!this.isCave) {
      // 船舱结构
      for (let x = 120; x < this.w; x += 180) {
        back.rect(x, this.oy, 10, this.h).fill(shade(this.wallColor, 0.45))
        back.circle(x + 90, this.oy + this.h * 0.35, 14).fill(0x0a1a2a)
        back.circle(x + 90, this.oy + this.h * 0.35, 14).stroke({ width: 3, color: 0x8a7a5a })
      }
      for (let i = 0; i < 12; i++) {
        const x = rng() * this.w
        const fy = this.floorY(x)
        g.rect(x, fy - 8 - rng() * 14, 20 + rng() * 40, 8).fill(shade(this.wallColor, 0.9 + rng() * 0.3))
      }
    } else {
      // 钟乳石 & 发光藻
      for (let i = 0; i < 26; i++) {
        const x = rng() * this.w
        const c = this.ceilY(x)
        const len = 10 + rng() * 40
        for (let k = 0; k < len; k += 4) g.rect(x - (1 - k / len) * 5, c + k, (1 - k / len) * 10 + 2, 4).fill(shade(this.wallColor, 1 - k / len * 0.3))
      }
      for (let i = 0; i < 40; i++) {
        const x = rng() * this.w
        const top = rng() < 0.5
        const y = top ? this.ceilY(x) + 6 : this.floorY(x) - 2
        const s = new Sprite(tex(Art.glowTex(), true))
        s.anchor.set(0.5)
        s.scale.set(0.15 + rng() * 0.2)
        s.tint = pick(rng, [0x4affd0, 0x6ab0ff, 0xb06aff])
        s.blendMode = 'add'
        s.alpha = 0.7
        s.position.set(x, y)
        glowLayer.addChild(s)
        this.root.on('destroyed', () => s.destroy())
      }
    }
    // 出口
    this.exit = { x: 70, y: (this.ceilY(70) + this.floorY(70)) / 2 }
    const door = new Graphics()
    door.rect(10, this.exit.y - 50, 50, 100).fill(0x0a2a4a)
    door.rect(10, this.exit.y - 50, 50, 100).stroke({ width: 3, color: 0x6ad0ff, alpha: 0.6 })
    this.root.addChild(door)
    const eg = new Sprite(tex(Art.glowTex(), true))
    eg.anchor.set(0.5)
    eg.tint = 0x6ad0ff
    eg.alpha = 0.5
    eg.scale.set(1.5)
    eg.blendMode = 'add'
    eg.position.set(35, this.exit.y)
    glowLayer.addChild(eg)
    this.root.on('destroyed', () => eg.destroy())
    // 宝箱
    const n = 2 + Math.floor(rng() * 3)
    for (let i = 0; i < n; i++) {
      const x = 300 + ((this.w - 400) * (i + rng() * 0.6)) / n
      const y = this.floorY(x)
      const id = `${feature.id}:c${i}`
      const looted = !!save.looted[id]
      const s = new Sprite(tex(Art.chest(looted)))
      s.anchor.set(0.5, 1)
      s.scale.set(2)
      s.position.set(x, y + 2)
      this.root.addChild(s)
      if (!looted) {
        const cg = new Sprite(tex(Art.glowTex(), true))
        cg.anchor.set(0.5)
        cg.tint = 0xffd84a
        cg.alpha = 0.45
        cg.blendMode = 'add'
        cg.position.set(x, y - 10)
        glowLayer.addChild(cg)
        this.root.on('destroyed', () => cg.destroy())
        ;(s as any)._glow = cg
      }
      this.chests.push({ id, x, y: y - 10, sprite: s, looted })
    }
  }

  ceilY(x: number) {
    const base = this.oy + 30
    const n = fbm1(x / 140, this.seed % 1000, 3)
    let v = base + n * (this.isCave ? 120 : 40)
    if (x < 140) v = Math.min(v, this.oy + this.h / 2 - 80)
    return v
  }

  floorY(x: number) {
    const base = this.oy + this.h - 30
    const n = fbm1(x / 160, (this.seed % 1000) + 50, 3)
    let v = base - n * (this.isCave ? 120 : 30)
    if (x < 140) v = Math.max(v, this.oy + this.h / 2 + 80)
    return Math.max(v, this.ceilY(x) + 160)
  }

  floorColor(_x: number) {
    return this.wallColor
  }

  openChest(c: Chest) {
    c.looted = true
    save.looted[c.id] = 1
    c.sprite.texture = tex(Art.chest(true))
    ;(c.sprite as any)._glow?.destroy()
  }

  destroy() {
    this.root.destroy({ children: true })
  }
}
