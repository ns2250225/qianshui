import { Container, Graphics, Sprite } from 'pixi.js'
import { CHUNK, depthToY, yToDepth, REGION_W } from '../core/constants'
import { floorY, floorDepthAt, regionAt, cellAt, cellStart } from './Terrain'
import { mulberry32, hashSeed, pick, shade } from '../core/rng'
import { tex } from '../core/tex'
import * as Art from './Art'
import type { Space } from './Space'
import { save } from '../../store/state'

export type FeatureKind = 'wreck' | 'cave' | 'vent' | 'whalefall' | 'abyss'

export interface Feature {
  id: string
  kind: FeatureKind
  sub: string
  name: string
  x: number
  y: number
  enterable: boolean
  seed: number
  /** 交互范围（精灵包围盒） */
  w?: number
  h?: number
  view?: Container
  vents?: { x: number; y: number }[]
}

interface Sway {
  s: Sprite
  phase: number
  amp: number
}

interface ChunkObj {
  key: string
  root: Container
  front: Container
  sways: Sway[]
}

const SLOT = 1400

export class World implements Space {
  root = new Container()
  terrain = new Container()
  decorBack = new Container()
  features = new Container()
  decorFront = new Container()
  glowLayer: Container
  chunks = new Map<string, ChunkObj>()
  featureMap = new Map<string, Feature>()
  minX = -1e12
  maxX = 1e12
  seed = 1

  constructor(glowLayer: Container) {
    this.glowLayer = glowLayer
    this.root.addChild(this.terrain, this.decorBack, this.features)
  }

  floorY(x: number) {
    return floorY(x)
  }
  ceilY(_x: number) {
    return 4
  }
  floorColor(x: number) {
    const fy = floorY(x)
    return Art.floorColor(regionAt(x).id, yToDepth(fy), x)
  }

  update(camX: number, camY: number, vw: number, vh: number, time: number) {
    const cx0 = Math.floor((camX - vw / 2) / CHUNK) - 1
    const cx1 = Math.floor((camX + vw / 2) / CHUNK) + 1
    const cy0 = Math.floor((camY - vh / 2) / CHUNK) - 1
    const cy1 = Math.floor((camY + vh / 2) / CHUNK) + 1
    const need = new Set<string>()
    let built = 0
    for (let cy = cy0; cy <= cy1; cy++)
      for (let cx = cx0; cx <= cx1; cx++) {
        const k = `${cx},${cy}`
        need.add(k)
        if (!this.chunks.has(k) && built < 3) {
          // 仅水面以下或包含水面的区块
          if ((cy + 1) * CHUNK < -200) continue
          this.chunks.set(k, this.buildChunk(cx, cy))
          built++
        }
      }
    for (const [k, c] of this.chunks) {
      if (!need.has(k)) {
        c.root.destroy({ children: true })
        c.front.destroy({ children: true })
        this.chunks.delete(k)
      }
    }
    // 摆动
    for (const c of this.chunks.values())
      for (const s of c.sways) s.s.skew.x = Math.sin(time * 1.3 + s.phase) * s.amp
    this.updateFeatures(camX, vw)
  }

  private buildChunk(cx: number, cy: number): ChunkObj {
    const x0 = cx * CHUNK
    const y0 = cy * CHUNK
    const x1 = x0 + CHUNK
    const y1 = y0 + CHUNK
    const root = new Container()
    const front = new Container()
    const sways: Sway[] = []
    const g = new Graphics()
    root.addChild(g)
    const rng = mulberry32(hashSeed(this.seed, cx, cy, 1))
    let surfaceInChunk = false
    let allBelow = true
    for (let x = x0; x < x1; x += 4) {
      const fy = floorY(x + 2)
      if (fy >= y0) allBelow = false
    }
    if (allBelow) {
      const col = shade(Art.floorColor(regionAt(x0).id, yToDepth(y0), x0), 0.45)
      g.rect(x0, y0, CHUNK, CHUNK).fill(col)
    } else {
      for (let x = x0; x < x1; x += 4) {
        const fy = floorY(x + 2)
        if (fy >= y1) continue
        const region = regionAt(x)
        const d = yToDepth(fy)
        const base = Art.floorColor(region.id, d, x)
        if (fy >= y0) {
          surfaceInChunk = true
          const top = Math.round(fy)
          g.rect(x, top, 4, 3).fill(shade(base, 1.18))
          g.rect(x, top + 3, 4, Math.min(24, y1 - top - 3)).fill(base)
          if (top + 27 < y1) g.rect(x, top + 27, 4, y1 - top - 27).fill(shade(base, 0.62))
          if (rng() < 0.25) g.rect(x + Math.floor(rng() * 3), top + 5 + rng() * 15, 2, 2).fill(shade(base, 0.8))
        } else {
          g.rect(x, y0, 4, CHUNK).fill(shade(base, 0.55))
        }
      }
    }
    // 冰层
    const reg0 = regionAt(x0 + CHUNK / 2)
    if (reg0.ice && y0 <= 0 && y1 > 0) {
      for (let x = x0; x < x1; x += 90 + rng() * 120) {
        const s = new Sprite(tex(Art.iceBlock(Math.floor(rng() * 9))))
        s.anchor.set(0.5, 0.15)
        s.scale.set(2)
        s.position.set(x, 0)
        front.addChild(s)
      }
    }
    // 红树林根系
    if (reg0.mangrove && y0 <= 0 && y1 > 0) {
      for (let x = x0; x < x1; x += 50 + rng() * 60) {
        const s = new Sprite(tex(Art.mangroveRoot(Math.floor(rng() * 6))))
        s.anchor.set(0.5, 0.1)
        s.scale.set(2)
        s.position.set(x, -10)
        root.addChild(s)
      }
    }
    if (surfaceInChunk) this.decorate(x0, x1, y0, y1, rng, root, front, sways)
    this.terrain.addChild(root)
    this.decorFront.addChild(front)
    return { key: `${cx},${cy}`, root, front, sways }
  }

  private decorate(x0: number, x1: number, y0: number, y1: number, rng: () => number, root: Container, front: Container, sways: Sway[]) {
    const place = (cv: HTMLCanvasElement, x: number, scale: number, layer: Container, sway = 0, sink = 1) => {
      const fy = floorY(x)
      if (fy < y0 || fy >= y1) return null
      const s = new Sprite(tex(cv))
      s.anchor.set(0.5, 1)
      s.scale.set(scale)
      s.position.set(Math.round(x), Math.round(fy + sink))
      layer.addChild(s)
      if (sway) sways.push({ s, phase: rng() * 6, amp: sway })
      return s
    }
    let x = x0 + rng() * 20
    while (x < x1) {
      const region = regionAt(x)
      const fy = floorY(x)
      const d = yToDepth(fy)
      const r = rng()
      if (region.coral > 0 && d < 120 && r < region.coral * 0.9) {
        const col = pick(rng, Art.CORAL_COLORS)
        const t = rng()
        const layer = rng() < 0.3 ? front : root
        if (t < 0.32) place(Art.coralBranch(col, Math.floor(rng() * 6)), x, 2, layer)
        else if (t < 0.5) place(Art.coralBrain(col), x, 2, layer)
        else if (t < 0.65) place(Art.coralFan(col), x, 2, layer, 0.05)
        else if (t < 0.75) place(Art.coralTable(col), x, 2, layer)
        else if (t < 0.88) place(Art.anemone(col, 0), x, 2, layer, 0.12)
        else place(Art.sponge(pick(rng, [0xff9f43, 0xa29bfe, 0xfeca57])), x, 2, layer)
        x += 10 + rng() * 22
        continue
      }
      if (region.seagrass > 0.25 && d < 60 && r < region.seagrass) {
        place(Art.seagrass(Math.floor(rng() * 5)), x, 2, rng() < 0.4 ? front : root, 0.18)
        x += 12 + rng() * 14
        continue
      }
      if (region.kelp > 0 && d < 100 && r < region.kelp * 0.6) {
        const h = Math.min(180, Math.max(30, Math.floor((fy - 20) / 2)))
        place(Art.kelp(Math.floor(h / 10) * 10), x, 2, rng() < 0.3 ? front : root, 0.06)
        x += 26 + rng() * 40
        continue
      }
      if (d < 90 && r < 0.35) {
        place(Art.seaweed(pick(rng, [0x2a8a4a, 0x3aa05a, 0x5a8a2a, 0x8a3a5a]), 14 + Math.floor(rng() * 4) * 4), x, 2, root, 0.15)
      } else if (r < 0.5) {
        place(Art.rock(Math.floor(rng() * 12), Art.floorColor(region.id, d, x)), x, 2, root, 0, 3)
      } else if (d > 800 && r < 0.62) {
        place(Art.sponge(pick(rng, [0xe8e0d0, 0xd0d8e0, 0xc8a0a0])), x, 2, root)
      }
      if (d < 40 && rng() < 0.5) {
        const s = new Sprite(tex(Art.glowTex(), true))
        s.anchor.set(0.5)
        s.scale.set(0.5 + rng() * 0.5, 0.15)
        s.alpha = 0.18
        s.blendMode = 'add'
        s.position.set(x, fy + 2)
        front.addChild(s)
        sways.push({ s, phase: rng() * 6, amp: 0.4 })
      }
      x += 30 + rng() * 60
    }
  }

  private slotCache = new Map<number, Feature | null>()

  featureForSlot(s: number): Feature | null {
    if (this.slotCache.has(s)) {
      const f = this.slotCache.get(s)!
      return f ? { ...f, view: undefined, vents: undefined } : null
    }
    const f = this.computeSlot(s)
    if (this.slotCache.size > 4000) this.slotCache.clear()
    this.slotCache.set(s, f)
    return f ? { ...f } : null
  }

  /** 计算槽位中的地形特征 */
  private computeSlot(s: number): Feature | null {
    const rng = mulberry32(hashSeed(this.seed, s, 555))
    const sx = s * SLOT
    // 海沟最深处
    const cell = cellAt(sx + SLOT / 2)
    const region = regionAt(sx + SLOT / 2)
    if (region.id === 'trench') {
      const cx = cellStart(cell) + REGION_W / 2
      if (cx >= sx && cx < sx + SLOT) {
        let best = cx
        let bd = 0
        for (let x = cx - 600; x <= cx + 600; x += 20) {
          const d = floorDepthAt(x)
          if (d > bd) {
            bd = d
            best = x
          }
        }
        return { id: `abyss:${cell}`, kind: 'abyss', sub: 'abyss', name: '挑战者深渊', x: best, y: floorY(best), enterable: false, seed: s }
      }
    }
    const x = sx + 250 + rng() * (SLOT - 500)
    if (Math.abs(x) < 500) return null
    const fd = floorDepthAt(x)
    const roll = rng()
    // 沉船 / 洞穴密度（每个槽位的概率）
    const wreckP = Math.max(0.14, region.wrecks * 0.5)
    const caveP = Math.max(0.12, region.caves * 0.5)
    let f: Feature | null = null
    if (region.vents > 0 && fd > 1200 && roll < region.vents * 0.75) {
      f = { id: `vent:${s}`, kind: 'vent', sub: 'vent', name: '热液喷口群', x, y: floorY(x), enterable: false, seed: s }
    } else if (fd > 1000 && roll > 0.965) {
      f = { id: `whalefall:${s}`, kind: 'whalefall', sub: 'whalefall', name: '鲸落', x, y: floorY(x), enterable: false, seed: s }
    } else if (roll < wreckP) {
      const kinds: Art.WreckKind[] = fd < 60 ? ['wood', 'fishing'] : fd < 400 ? ['wood', 'fishing', 'cargo', 'modern', 'plane'] : ['cargo', 'modern', 'submarine', 'plane']
      const k = pick(rng, kinds)
      f = { id: `wreck:${s}`, kind: 'wreck', sub: k, name: Art.WRECK_NAMES[k], x, y: floorY(x), enterable: true, seed: s }
    } else if (roll < wreckP + caveP) {
      const k = pick(rng, ['cave', 'crack', 'tunnel', 'channel'] as Art.CaveKind[])
      f = { id: `cave:${s}`, kind: 'cave', sub: k, name: Art.CAVE_NAMES[k], x, y: floorY(x), enterable: true, seed: s }
    }
    return f
  }

  private updateFeatures(camX: number, vw: number) {
    const s0 = Math.floor((camX - vw - 1500) / SLOT)
    const s1 = Math.floor((camX + vw + 1500) / SLOT)
    const keep = new Set<string>()
    for (let s = s0; s <= s1; s++) {
      const f = this.featureForSlot(s)
      if (f) {
        keep.add(f.id)
        if (!this.featureMap.has(f.id)) this.addFeature(f)
      }
    }
    for (const dw of save.dynamicWrecks) {
      if (Math.abs(dw.x - camX) < vw + 2000) {
        keep.add(dw.id)
        if (!this.featureMap.has(dw.id)) {
          const kind = (dw.kind as FeatureKind) || 'wreck'
          const fy = floorY(dw.x)
          let f: Feature
          if (kind === 'whalefall') f = { id: dw.id, kind, sub: 'whalefall', name: '鲸落', x: dw.x, y: fy, enterable: false, seed: dw.id.length }
          else {
            const k: Art.WreckKind = yToDepth(fy) < 400 ? 'wood' : 'cargo'
            f = { id: dw.id, kind: 'wreck', sub: k, name: Art.WRECK_NAMES[k], x: dw.x, y: fy, enterable: true, seed: Math.floor(dw.x) }
          }
          this.addFeature(f)
        }
      }
    }
    for (const [id, f] of this.featureMap) {
      if (!keep.has(id)) {
        f.view?.destroy({ children: true })
        this.featureMap.delete(id)
      }
    }
  }

  private addFeature(f: Feature) {
    const c = new Container()
    const rng = mulberry32(f.seed * 31 + 7)
    if (f.kind === 'wreck') {
      const s = new Sprite(tex(Art.wreck(f.sub as Art.WreckKind)))
      s.anchor.set(0.5, 1)
      s.scale.set(2)
      s.position.set(f.x, f.y + 6)
      s.rotation = (rng() - 0.5) * 0.12
      c.addChild(s)
      f.w = s.width
      f.h = s.height
      if (f.enterable) {
        const g = new Sprite(tex(Art.glowTex(), true))
        g.anchor.set(0.5)
        g.tint = 0xffd84a
        g.alpha = 0.25
        g.scale.set(1.2)
        g.blendMode = 'add'
        g.position.set(f.x, f.y - 30)
        this.glowLayer.addChild(g)
        c.on('destroyed', () => g.destroy())
      }
    } else if (f.kind === 'cave') {
      const fd = yToDepth(f.y)
      const s = new Sprite(tex(Art.caveEntrance(f.sub as Art.CaveKind, Art.floorColor(regionAt(f.x).id, fd, f.x))))
      s.anchor.set(0.5, 1)
      s.scale.set(2)
      s.position.set(f.x, f.y + 4)
      c.addChild(s)
      f.w = s.width
      f.h = s.height
    } else if (f.kind === 'vent') {
      f.vents = []
      const n = 3 + Math.floor(rng() * 3)
      for (let i = 0; i < n; i++) {
        const vx = f.x + (i - n / 2) * (40 + rng() * 40)
        const vy = floorY(vx)
        const s = new Sprite(tex(Art.ventChimney(Math.floor(rng() * 5))))
        s.anchor.set(0.5, 1)
        s.scale.set(2)
        s.position.set(vx, vy + 4)
        c.addChild(s)
        f.vents.push({ x: vx, y: vy - s.height })
        const g = new Sprite(tex(Art.glowTex(), true))
        g.anchor.set(0.5)
        g.tint = 0xff7a2a
        g.alpha = 0.6
        g.scale.set(1.4)
        g.blendMode = 'add'
        g.position.set(vx, vy - s.height + 6)
        this.glowLayer.addChild(g)
        c.on('destroyed', () => g.destroy())
      }
    } else if (f.kind === 'whalefall') {
      const s = new Sprite(tex(Art.whaleSkeleton()))
      s.anchor.set(0.5, 1)
      s.scale.set(2)
      s.position.set(f.x, f.y + 6)
      c.addChild(s)
      const g = new Sprite(tex(Art.glowTex(), true))
      g.anchor.set(0.5)
      g.tint = 0xfff0c0
      g.alpha = 0.18
      g.scale.set(3, 1)
      g.blendMode = 'add'
      g.position.set(f.x, f.y - 20)
      this.glowLayer.addChild(g)
      c.on('destroyed', () => g.destroy())
    } else if (f.kind === 'abyss') {
      const s = new Sprite(tex(Art.beacon()))
      s.anchor.set(0.5, 1)
      s.scale.set(2)
      s.position.set(f.x, f.y + 2)
      c.addChild(s)
      const g = new Sprite(tex(Art.glowTex(), true))
      g.anchor.set(0.5)
      g.tint = 0xffe04a
      g.alpha = 0.7
      g.blendMode = 'add'
      g.position.set(f.x, f.y - 36)
      this.glowLayer.addChild(g)
      c.on('destroyed', () => g.destroy())
    }
    f.view = c
    this.features.addChild(c)
    this.featureMap.set(f.id, f)
  }

  nearestFeature(x: number, y: number, r: number): Feature | null {
    let best: Feature | null = null
    let bd = r
    for (const f of this.featureMap.values()) {
      // 沉船 / 洞穴：整个精灵范围内都可以互动
      if (f.w && f.h && Math.abs(x - f.x) < f.w / 2 + 24 && y > f.y - f.h - 30 && y < f.y + 30) {
        const d = Math.abs(x - f.x) * 0.1
        if (d < bd || !best?.enterable) {
          bd = d
          best = f
        }
        continue
      }
      const d = Math.hypot(f.x - x, f.y - 30 - y)
      if (d < bd) {
        bd = d
        best = f
      }
    }
    return best
  }

  featuresWithin(x: number, y: number, r: number): Feature[] {
    const out: Feature[] = []
    for (const f of this.featureMap.values()) if (Math.hypot(f.x - x, f.y - y) < r) out.push(f)
    return out
  }

  setVisible(v: boolean) {
    this.root.visible = v
    this.decorFront.visible = v
    for (const f of this.featureMap.values()) f.view && (f.view.visible = v)
  }

  clearAll() {
    for (const c of this.chunks.values()) {
      c.root.destroy({ children: true })
      c.front.destroy({ children: true })
    }
    this.chunks.clear()
    for (const f of this.featureMap.values()) f.view?.destroy({ children: true })
    this.featureMap.clear()
  }
}

export { depthToY }
