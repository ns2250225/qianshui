// 程序化像素美术：装饰、沉船、角色、船只等
import { mulberry32, shade, lerpColor, hash2 } from '../core/rng'

export class Canvas {
  w: number
  h: number
  cv: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  constructor(w: number, h: number) {
    this.w = Math.ceil(w)
    this.h = Math.ceil(h)
    this.cv = document.createElement('canvas')
    this.cv.width = this.w
    this.cv.height = this.h
    this.ctx = this.cv.getContext('2d')!
  }
  px(x: number, y: number, c: number, a = 1) {
    this.ctx.globalAlpha = a
    this.ctx.fillStyle = '#' + (c & 0xffffff).toString(16).padStart(6, '0')
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
    this.ctx.globalAlpha = 1
  }
  rect(x: number, y: number, w: number, h: number, c: number, a = 1) {
    this.ctx.globalAlpha = a
    this.ctx.fillStyle = '#' + (c & 0xffffff).toString(16).padStart(6, '0')
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    this.ctx.globalAlpha = 1
  }
  disc(cx: number, cy: number, r: number, c: number, a = 1) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3) this.px(x, y, c, a)
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number, a = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a)
  }
}

const cache = new Map<string, HTMLCanvasElement>()
function cached(key: string, fn: () => HTMLCanvasElement) {
  let c = cache.get(key)
  if (!c) {
    c = fn()
    cache.set(key, c)
  }
  return c
}

export const CORAL_COLORS = [0xff6b8a, 0xff9f43, 0xf368e0, 0xfeca57, 0x48dbfb, 0xff6b6b, 0xa29bfe, 0x1dd1a1, 0xee5a24, 0xc56cf0]

export function coralBranch(color: number, seed: number) {
  return cached(`cb${color}-${seed}`, () => {
    const c = new Canvas(18, 22)
    const rng = mulberry32(seed)
    const grow = (x: number, y: number, ang: number, len: number, depth: number) => {
      for (let i = 0; i < len; i++) {
        x += Math.cos(ang)
        y += Math.sin(ang)
        c.px(x, y, i % 3 === 0 ? shade(color, 0.8) : color)
        c.px(x + 1, y, shade(color, 0.7))
      }
      c.px(x, y - 1, shade(color, 1.3))
      if (depth > 0) {
        grow(x, y, ang - 0.5 - rng() * 0.3, len * 0.7, depth - 1)
        grow(x, y, ang + 0.5 + rng() * 0.3, len * 0.7, depth - 1)
      }
    }
    grow(8, 21, -Math.PI / 2, 7, 3)
    return c.cv
  })
}

export function coralBrain(color: number) {
  return cached(`br${color}`, () => {
    const c = new Canvas(16, 9)
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 16; x++) {
        const dx = (x - 7.5) / 8
        const dy = (y - 8.5) / 8.5
        if (dx * dx + dy * dy <= 1) c.px(x, y, (x + Math.round(Math.sin(y * 1.3) * 2)) % 3 === 0 ? shade(color, 0.7) : color)
      }
    return c.cv
  })
}

export function coralFan(color: number) {
  return cached(`fan${color}`, () => {
    const c = new Canvas(20, 20)
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.28
      c.line(10, 19, 10 + Math.cos(a) * 9, 19 + Math.sin(a) * 18, i % 2 ? color : shade(color, 0.8))
    }
    for (let r = 5; r < 18; r += 4)
      for (let i = -4; i <= 4; i++) {
        const a = -Math.PI / 2 + i * 0.28
        c.px(10 + Math.cos(a) * (r / 2), 19 + Math.sin(a) * r, shade(color, 1.2))
      }
    return c.cv
  })
}

export function coralTable(color: number) {
  return cached(`tb${color}`, () => {
    const c = new Canvas(26, 12)
    c.rect(11, 4, 3, 8, shade(color, 0.7))
    for (let x = 0; x < 26; x++) {
      const h = 3 + Math.round(Math.sin(x * 0.5))
      c.rect(x, 4 - h + 2, 1, h, x % 2 ? color : shade(color, 1.15))
    }
    return c.cv
  })
}

export function anemone(color: number, frame: number) {
  return cached(`an${color}-${frame}`, () => {
    const c = new Canvas(16, 12)
    c.rect(4, 8, 8, 4, shade(color, 0.6))
    for (let i = 0; i < 9; i++) {
      const x = 2 + i * 1.5
      const sw = Math.sin(i + frame * 2) * 1.5
      c.line(x, 9, x + sw, 1 + (i % 2), i % 2 ? color : shade(color, 1.2))
      c.px(x + sw, 1 + (i % 2), shade(color, 1.4))
    }
    return c.cv
  })
}

export function sponge(color: number) {
  return cached(`sp${color}`, () => {
    const c = new Canvas(12, 18)
    for (const [x, h] of [[2, 12], [6, 17], [9, 9]]) {
      c.rect(x, 18 - h, 3, h, color)
      c.rect(x, 18 - h, 1, h, shade(color, 1.2))
      c.px(x + 1, 18 - h, 0x221111)
    }
    return c.cv
  })
}

export function seaweed(color: number, h: number) {
  return cached(`sw${color}-${h}`, () => {
    const c = new Canvas(8, h)
    for (let y = 0; y < h; y++) {
      const x = 3 + Math.round(Math.sin(y * 0.35) * 1.5)
      c.rect(x, y, 2, 1, y % 4 === 0 ? shade(color, 1.2) : color)
      if (y % 6 === 2) c.px(x + 2, y, shade(color, 0.8))
      if (y % 6 === 5) c.px(x - 1, y, shade(color, 0.8))
    }
    return c.cv
  })
}

export function kelp(h: number) {
  return cached(`kelp${h}`, () => {
    const c = new Canvas(14, h)
    const col = 0x8a7a2a
    for (let y = 0; y < h; y++) {
      const x = 6 + Math.round(Math.sin(y * 0.08) * 2)
      c.px(x, y, 0x6a5a1a)
      if (y % 9 === 0) {
        const side = (y / 9) % 2 ? 1 : -1
        for (let k = 1; k < 6; k++) c.px(x + side * k, y + k * 0.6, k < 5 ? col : 0x9a8a3a)
        c.disc(x + side, y, 1, 0xa08a30)
      }
    }
    return c.cv
  })
}

export function seagrass(seed: number) {
  return cached(`sg${seed}`, () => {
    const c = new Canvas(14, 20)
    const rng = mulberry32(seed)
    for (let i = 0; i < 6; i++) {
      const x = 1 + i * 2 + rng()
      const h = 10 + rng() * 9
      for (let y = 0; y < h; y++) c.px(x + Math.sin(y * 0.3) * 0.8, 19 - y, y > h - 3 ? 0x8fd16a : i % 2 ? 0x4aa04a : 0x3a8a3a)
    }
    return c.cv
  })
}

export function rock(seed: number, base: number) {
  return cached(`rk${seed}-${base}`, () => {
    const rng = mulberry32(seed)
    const w = 10 + Math.floor(rng() * 14)
    const h = 6 + Math.floor(rng() * 8)
    const c = new Canvas(w, h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2)
        const dy = (y - h) / h
        if (dx * dx + dy * dy * 1.1 < 1 - hash2(x, y, seed) * 0.12) c.px(x, y, lerpColor(shade(base, 1.15), shade(base, 0.7), y / h + (hash2(x, y, 3) - 0.5) * 0.3))
      }
    return c.cv
  })
}

export function mangroveRoot(seed: number) {
  return cached(`mr${seed}`, () => {
    const c = new Canvas(40, 70)
    const rng = mulberry32(seed)
    c.rect(18, 0, 5, 30, 0x5a3a20)
    for (let i = 0; i < 5; i++) {
      let x = 20
      let y = 20 + i * 3
      const dir = i % 2 ? 1 : -1
      const spread = 3 + rng() * 14
      for (let k = 0; k < 50; k++) {
        x += dir * (spread / 50) * (1 + Math.cos(k / 50 * Math.PI))
        y += 1
        c.rect(x, y, 2, 1, k % 7 ? 0x6a4a2a : 0x4a2a10)
        if (y > 69) break
      }
    }
    return c.cv
  })
}

export function iceBlock(seed: number) {
  return cached(`ice${seed}`, () => {
    const rng = mulberry32(seed)
    const w = 50 + Math.floor(rng() * 70)
    const above = 6 + Math.floor(rng() * 10)
    const below = 20 + Math.floor(rng() * 60)
    const c = new Canvas(w, above + below)
    for (let y = 0; y < above + below; y++) {
      const t = y < above ? y / above : 1 - (y - above) / below
      const half = (w / 2) * Math.pow(Math.max(0.05, y < above ? 0.6 + 0.4 * t : t), 0.6)
      for (let x = Math.round(w / 2 - half); x < w / 2 + half; x++) {
        const col = y < above ? (y < 2 ? 0xffffff : 0xe8f6ff) : lerpColor(0xc8ecff, 0x7ac0e8, (y - above) / below)
        c.px(x, y, (hash2(x, y, 4) > 0.95 ? 0xffffff : col), y < above ? 1 : 0.85)
      }
    }
    return c.cv
  })
}

export function ventChimney(seed: number) {
  return cached(`vent${seed}`, () => {
    const rng = mulberry32(seed)
    const h = 30 + Math.floor(rng() * 40)
    const c = new Canvas(18, h)
    for (let y = 0; y < h; y++) {
      const w = 4 + (y / h) * 8 + Math.sin(y * 0.7) * 1.2
      for (let x = 9 - w / 2; x < 9 + w / 2; x++) c.px(x, y, hash2(Math.round(x), y, 6) > 0.7 ? 0x4a3a30 : 0x2a2420)
    }
    c.rect(7, 0, 4, 2, 0xff7a2a)
    c.px(8, 2, 0xffaa4a)
    // 管虫
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 4
      c.rect(x, h - 6, 1, 6, 0xeeeeee)
      c.rect(x, h - 7, 2, 2, 0xff3a3a)
    }
    return c.cv
  })
}

export function whaleSkeleton() {
  return cached('whalebones', () => {
    const c = new Canvas(130, 34)
    // 头骨
    for (let x = 100; x < 128; x++) {
      const h = 6 + Math.sin(((x - 100) / 28) * Math.PI) * 6
      c.rect(x, 30 - h, 1, h, 0xe8e0d0)
    }
    // 脊椎
    for (let x = 6; x < 100; x += 4) {
      c.rect(x, 22, 3, 3, 0xd8d0c0)
      const rib = 16 * Math.sin(((x - 6) / 94) * Math.PI)
      if (x > 30 && x < 95) {
        c.line(x + 1, 22, x - 2, 22 - rib * 0.6, 0xe0d8c8)
        c.line(x + 1, 25, x - 2, 30, 0xd0c8b8)
      }
    }
    c.rect(0, 26, 130, 8, 0x2a2420, 0.5)
    // 白色菌毯
    for (let i = 0; i < 40; i++) c.px(10 + Math.random() * 115, 28 + Math.random() * 4, 0xfff8e0)
    return c.cv
  })
}

export type WreckKind = 'wood' | 'fishing' | 'cargo' | 'modern' | 'submarine' | 'plane'
export const WRECK_NAMES: Record<WreckKind, string> = {
  wood: '木制沉船',
  fishing: '渔船残骸',
  cargo: '货船残骸',
  modern: '现代沉船',
  submarine: '潜艇残骸',
  plane: '飞机残骸',
}

export function wreck(kind: WreckKind) {
  return cached(`wreck-${kind}`, () => {
    const rng = mulberry32(kind.length * 977)
    const rust = (x: number, y: number, base: number) => (hash2(x, y, 8) > 0.82 ? shade(base, 0.6) : hash2(x, y, 9) > 0.9 ? 0x8a4a2a : base)
    if (kind === 'plane') {
      const c = new Canvas(110, 40)
      for (let x = 10; x < 100; x++) {
        const h = x < 20 ? (x - 10) * 0.5 + 3 : 8
        c.rect(x, 26 - h / 2, 1, h, rust(x, 0, 0x7a8a7a))
      }
      c.rect(40, 18, 30, 4, 0x6a7a6a)
      c.rect(48, 30, 30, 4, 0x5a6a5a)
      c.rect(92, 14, 4, 12, 0x6a7a6a)
      c.rect(98, 22, 3, 8, 0x3a3a3a)
      c.rect(0, 34, 110, 6, 0x2a2420, 0.5)
      return c.cv
    }
    if (kind === 'submarine') {
      const c = new Canvas(140, 36)
      for (let x = 5; x < 135; x++) {
        const t = (x - 5) / 130
        const h = 16 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.5) * 2, 6)))
        for (let y = 0; y < h; y++) c.px(x, 24 - h / 2 + y, rust(x, y, y < 3 ? 0x5a6a70 : 0x3a4a50))
      }
      c.rect(60, 6, 18, 10, 0x3a4a50)
      c.rect(66, 2, 2, 4, 0x2a3a40)
      c.rect(0, 30, 140, 6, 0x2a2420, 0.5)
      return c.cv
    }
    const W = kind === 'cargo' ? 190 : kind === 'modern' ? 150 : kind === 'wood' ? 120 : 84
    const H = kind === 'cargo' ? 70 : kind === 'wood' ? 70 : 50
    const c = new Canvas(W, H)
    const hull = kind === 'wood' ? 0x6a4a2a : kind === 'fishing' ? 0x4a6a8a : kind === 'cargo' ? 0x7a3a2a : 0xd0d0d0
    const hullTop = H * 0.45
    for (let x = 0; x < W; x++) {
      const t = x / W
      const bow = t > 0.8 ? (t - 0.8) / 0.2 : 0
      const stern = t < 0.08 ? (0.08 - t) / 0.08 : 0
      const bottom = H - 6 - (bow * H * 0.25 + stern * H * 0.15)
      for (let y = hullTop - bow * 6; y < bottom; y++) {
        let col = rust(x, Math.round(y), hull)
        if (kind === 'wood' && Math.round(y) % 4 === 0) col = shade(hull, 0.7)
        if (kind === 'cargo' && y > bottom - 8) col = rust(x, Math.round(y), 0x3a2a2a)
        c.px(x, y, col)
      }
    }
    // 破洞
    const holes = 2 + Math.floor(rng() * 3)
    for (let i = 0; i < holes; i++) c.disc(W * (0.2 + rng() * 0.6), H * 0.65, 3 + rng() * 4, 0x0a0a0a)
    // 上层建筑
    if (kind === 'wood') {
      c.rect(W * 0.45, 4, 3, hullTop - 4, 0x5a3a1a)
      c.line(W * 0.45, 8, W * 0.2, hullTop, 0x5a3a1a, 0.5)
      c.rect(W * 0.7, 14, 3, hullTop - 14, 0x5a3a1a)
    } else if (kind === 'fishing') {
      c.rect(W * 0.55, hullTop - 12, 18, 12, 0xe0e0d0)
      c.rect(W * 0.58, hullTop - 9, 4, 4, 0x1a2a3a)
      c.rect(W * 0.3, 4, 2, hullTop - 4, 0x6a6a6a)
    } else if (kind === 'cargo') {
      c.rect(W * 0.08, hullTop - 22, 30, 22, rust(1, 1, 0xd0c8b0))
      for (let i = 0; i < 4; i++) c.rect(W * 0.3 + i * 28, hullTop - 14, 24, 14, [0x2a6a9a, 0xb03a2a, 0x3a8a4a, 0xd0a020][i])
    } else {
      c.rect(W * 0.3, hullTop - 18, W * 0.4, 18, 0xe8e8e8)
      for (let i = 0; i < 6; i++) c.rect(W * 0.32 + i * 9, hullTop - 14, 5, 4, 0x1a2a3a)
    }
    // 珊瑚/藤壶附着
    for (let i = 0; i < 30; i++) c.px(rng() * W, hullTop + rng() * (H - hullTop - 6), [0xff6b8a, 0xfeca57, 0x1dd1a1, 0xe8e0d0][i % 4])
    c.rect(0, H - 6, W, 6, 0x2a2420, 0.5)
    return c.cv
  })
}

export type CaveKind = 'cave' | 'crack' | 'tunnel' | 'channel'
export const CAVE_NAMES: Record<CaveKind, string> = { cave: '海底洞穴', crack: '海底裂缝', tunnel: '海底隧道', channel: '地下水道' }

export function caveEntrance(kind: CaveKind, rockColor: number) {
  return cached(`cave-${kind}-${rockColor}`, () => {
    const W = kind === 'crack' ? 40 : 70
    const H = kind === 'tunnel' ? 46 : 52
    const c = new Canvas(W, H)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = (x - W / 2) / (W / 2)
        const dy = (H - y) / H
        if (dx * dx + dy * dy * 0.9 < 1 + (hash2(x, y, 2) - 0.5) * 0.2) c.px(x, y, lerpColor(shade(rockColor, 1.1), shade(rockColor, 0.6), y / H))
      }
    // 洞口
    const ow = kind === 'crack' ? 8 : 26
    const oh = kind === 'crack' ? 38 : 28
    for (let y = H - oh; y < H; y++) {
      const t = (y - (H - oh)) / oh
      const w = ow * (kind === 'crack' ? 0.5 + t * 0.5 : Math.sqrt(t))
      c.rect(W / 2 - w / 2, y, w, 1, 0x05070a)
    }
    return c.cv
  })
}

export function chest(open: boolean) {
  return cached(`chest${open}`, () => {
    const c = new Canvas(14, 12)
    c.rect(1, 5, 12, 7, 0x7a4a1a)
    c.rect(1, 7, 12, 1, 0xd0a020)
    if (!open) {
      c.rect(1, 2, 12, 4, 0x8a5a2a)
      c.rect(6, 5, 2, 3, 0xffd84a)
    } else {
      c.rect(1, 0, 12, 2, 0x8a5a2a)
      c.rect(3, 4, 8, 2, 0xffe060)
    }
    return c.cv
  })
}

export function trapArt(full: boolean) {
  return cached(`trap${full}`, () => {
    const c = new Canvas(14, 12)
    for (let x = 0; x < 14; x += 3) c.rect(x, 1, 1, 11, 0xa08050)
    for (let y = 1; y < 12; y += 3) c.rect(0, y, 14, 1, 0xa08050)
    c.rect(6, 0, 2, 1, 0xff4a4a)
    if (full) c.rect(4, 5, 6, 3, 0xffb84a)
    return c.cv
  })
}

export function beacon() {
  return cached('beacon', () => {
    const c = new Canvas(10, 20)
    c.rect(4, 4, 2, 16, 0x8a8a8a)
    c.rect(2, 16, 6, 4, 0x5a5a5a)
    c.rect(3, 0, 4, 4, 0xffe04a)
    return c.cv
  })
}

export function glowTex() {
  return cached('glow', () => {
    const c = new Canvas(64, 64)
    const g = c.ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.5)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.ctx.fillStyle = g
    c.ctx.fillRect(0, 0, 64, 64)
    return c.cv
  })
}

export function darknessTex() {
  return cached('dark', () => {
    const S = 256
    const c = new Canvas(S, S)
    const g = c.ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.55, 'rgba(0,0,0,0.15)')
    g.addColorStop(0.85, 'rgba(0,0,0,0.75)')
    g.addColorStop(1, 'rgba(0,0,0,1)')
    c.ctx.fillStyle = g
    c.ctx.fillRect(0, 0, S, S)
    return c.cv
  })
}

export function particle() {
  return cached('p', () => {
    const c = new Canvas(2, 2)
    c.rect(0, 0, 2, 2, 0xffffff)
    return c.cv
  })
}

export function bubble() {
  return cached('bub', () => {
    const c = new Canvas(5, 5)
    c.px(1, 0, 0xffffff)
    c.px(2, 0, 0xffffff)
    c.px(3, 0, 0xffffff)
    c.px(0, 1, 0xffffff)
    c.px(4, 1, 0xffffff)
    c.px(0, 2, 0xffffff)
    c.px(4, 2, 0xffffff)
    c.px(0, 3, 0xffffff)
    c.px(4, 3, 0xffffff)
    c.px(1, 4, 0xffffff)
    c.px(2, 4, 0xffffff)
    c.px(3, 4, 0xffffff)
    c.px(1, 1, 0xffffff)
    return c.cv
  })
}

export function jellyfish(color: number, frame: number) {
  return cached(`jf${color}${frame}`, () => {
    const c = new Canvas(14, 20)
    const squash = frame ? 1 : 0
    for (let y = 0; y < 7 - squash; y++) {
      const w = 12 * Math.sqrt(1 - Math.pow((7 - squash - y) / (7 - squash), 2)) + squash * 2
      c.rect(7 - w / 2, y, w, 1, y < 2 ? shade(color, 1.3) : color, 0.85)
    }
    for (let i = 0; i < 5; i++) {
      const x = 3 + i * 2
      for (let y = 7; y < 18; y++) c.px(x + Math.sin(y * 0.6 + i + frame * 2) * 0.8, y, color, 0.6)
    }
    return c.cv
  })
}

export function gull(frame: number) {
  return cached(`gull${frame}`, () => {
    const c = new Canvas(9, 5)
    const col = 0xf0f0f0
    if (frame === 0) {
      c.line(0, 1, 3, 3, col)
      c.line(4, 3, 8, 1, col)
    } else {
      c.line(0, 3, 3, 3, col)
      c.line(4, 3, 8, 3, col)
    }
    c.px(4, 3, 0x888888)
    return c.cv
  })
}

export function dolphin(frame: number) {
  return cached(`dol${frame}`, () => {
    const c = new Canvas(44, 16)
    for (let x = 4; x < 40; x++) {
      const t = (x - 4) / 36
      const h = 5 * Math.sin(Math.min(1, t * 1.15) * Math.PI) + 1
      for (let y = -h; y < h * 0.8; y++) c.px(x, 8 + y + (frame && t < 0.2 ? 1 : 0), y > 1 ? 0xc8d0d8 : 0x6a7a8a)
    }
    c.rect(40, 8, 4, 2, 0x6a7a8a)
    c.line(20, 3, 16, 0, 0x5a6a7a)
    c.line(2, 6 + frame * 2, 4, 9, 0x5a6a7a)
    c.line(2, 12 - frame * 2, 4, 9, 0x5a6a7a)
    c.px(36, 7, 0x111111)
    return c.cv
  })
}

export function whale() {
  return cached('whale', () => {
    const c = new Canvas(240, 70)
    for (let x = 20; x < 230; x++) {
      const t = (x - 20) / 210
      const h = 26 * Math.pow(Math.sin(Math.min(1, t * 1.05) * Math.PI), 0.7) + 2
      for (let y = -h; y < h * 0.85; y++) c.px(x, 35 + y, y > h * 0.3 && t > 0.5 ? 0x8a9aa8 : 0x2a3a4a)
    }
    c.line(0, 22, 22, 35, 0x2a3a4a)
    c.line(0, 48, 22, 36, 0x2a3a4a)
    c.rect(0, 20, 6, 30, 0x2a3a4a)
    c.line(150, 50, 120, 68, 0x3a4a5a)
    c.line(152, 51, 124, 69, 0x3a4a5a)
    c.px(215, 33, 0x0a0a0a)
    return c.cv
  })
}

export function boatArt() {
  return cached('boat', () => {
    const c = new Canvas(72, 44)
    // 船体
    for (let x = 0; x < 72; x++) {
      const t = x / 72
      const top = 28
      const bottom = 40 - (t > 0.75 ? (t - 0.75) * 40 : 0) - (t < 0.1 ? (0.1 - t) * 30 : 0)
      for (let y = top; y < bottom; y++) c.px(x, y, y < top + 2 ? 0xffffff : y < top + 5 ? 0xd84a3a : 0xf0f0e8)
    }
    c.rect(0, 26, 66, 2, 0x8a5a2a)
    // 船舱
    c.rect(14, 12, 26, 14, 0xf8f4e8)
    c.rect(12, 10, 30, 3, 0x3a6aa0)
    c.rect(18, 16, 6, 5, 0x6ac8ff)
    c.rect(28, 16, 6, 5, 0x6ac8ff)
    // 桅杆 & 旗
    c.rect(50, 0, 2, 26, 0x6a4a2a)
    c.rect(52, 1, 10, 6, 0xffd84a)
    c.px(56, 3, 0xff4a4a)
    // 救生圈
    c.disc(46, 20, 3, 0xff6a3a)
    c.disc(46, 20, 1.2, 0xf8f4e8)
    return c.cv
  })
}

export function islandArt(seed: number) {
  return cached(`isl${seed}`, () => {
    const rng = mulberry32(seed)
    const W = 80 + Math.floor(rng() * 120)
    const H = 18 + Math.floor(rng() * 30)
    const c = new Canvas(W, H)
    for (let x = 0; x < W; x++) {
      const t = x / W
      const h = H * Math.pow(Math.sin(t * Math.PI), 0.8) * (0.7 + 0.3 * Math.sin(t * 9 + seed))
      c.rect(x, H - h, 1, h, 0x3a5a6a)
    }
    if (rng() > 0.4) {
      const px = W * (0.3 + rng() * 0.4)
      c.rect(px, 2, 1, H * 0.6, 0x2a4a5a)
      c.line(px, 2, px - 6, 5, 0x2a4a5a)
      c.line(px, 2, px + 6, 5, 0x2a4a5a)
    }
    return c.cv
  })
}

export function cloudArt(seed: number) {
  return cached(`cl${seed}`, () => {
    const rng = mulberry32(seed)
    const W = 40 + Math.floor(rng() * 50)
    const c = new Canvas(W, 18)
    for (let i = 0; i < 6; i++) c.disc(6 + rng() * (W - 12), 10 + rng() * 3, 4 + rng() * 5, 0xffffff)
    c.rect(4, 13, W - 8, 5, 0xffffff)
    for (let x = 0; x < W; x++) c.px(x, 17, 0xd8e4f0)
    return c.cv
  })
}

/** 潜水员像素图：swim 帧 0/1，stand */
export function diverArt(pose: 'swim0' | 'swim1' | 'stand', suit: number) {
  return cached(`diver-${pose}-${suit}`, () => {
    const suitC = [0x2a2a3a, 0x2a4a8a, 0x3a6a5a, 0x5a5a6a, 0x8a5a2a, 0x4a2a6a, 0xd0a020][suit] ?? 0x2a2a3a
    const accent = [0xffd84a, 0xff8a3a, 0xffffff, 0x4ad0ff, 0xffffff, 0xff4aa0, 0x2a2a2a][suit] ?? 0xffd84a
    const skin = 0xf0c8a0
    if (pose === 'stand') {
      const c = new Canvas(12, 24)
      c.rect(4, 0, 5, 5, skin)
      c.rect(3, 1, 7, 3, 0x2a2a2a)
      c.rect(4, 2, 5, 1, 0x6ad0ff)
      c.rect(3, 5, 7, 9, suitC)
      c.rect(1, 6, 2, 7, suitC)
      c.rect(10, 6, 2, 7, suitC)
      c.rect(0, 6, 2, 6, 0xf0c040)
      c.rect(3, 9, 7, 1, accent)
      c.rect(3, 14, 3, 8, suitC)
      c.rect(7, 14, 3, 8, suitC)
      c.rect(2, 22, 4, 2, 0x2a6aff)
      c.rect(7, 22, 4, 2, 0x2a6aff)
      return c.cv
    }
    const c = new Canvas(28, 12)
    const k = pose === 'swim1' ? 1 : 0
    // 气瓶
    c.rect(8, 1, 9, 3, 0xf0c040)
    c.rect(17, 1, 1, 3, 0x8a8a8a)
    // 身体
    c.rect(6, 4, 14, 5, suitC)
    c.rect(8, 6, 10, 1, accent)
    // 头
    c.rect(20, 3, 5, 5, skin)
    c.rect(21, 3, 5, 3, 0x2a2a2a)
    c.rect(22, 4, 3, 1, 0x6ad0ff)
    c.rect(19, 2, 2, 2, 0x8a8a8a)
    // 手臂
    c.rect(19, 8, 4, 2, suitC)
    // 腿 & 脚蹼
    c.rect(1, 4 + k, 6, 2, suitC)
    c.rect(1, 7 - k, 6, 2, suitC)
    c.rect(0, 3 + k * 2, 2, 4, 0x2a6aff)
    c.rect(0, 6 - k * 2 + 1, 2, 4, 0x2a6aff)
    return c.cv
  })
}

/** 地形颜色 */
export function floorColor(regionId: string, depth: number, x: number): number {
  let base: number
  if (regionId === 'tropical_coral' || regionId === 'caribbean' || regionId === 'seagrass') base = depth < 150 ? 0xe0cf98 : 0x8a7a60
  else if (regionId === 'mangrove') base = 0x6a5a3a
  else if (regionId === 'antarctic' || regionId === 'arctic') base = 0x7a8a98
  else if (regionId === 'hydrothermal') base = 0x3a3030
  else base = depth < 200 ? 0xa09070 : 0x5a5a60
  if (depth > 1000) base = lerpColor(base, 0x2a2a34, Math.min(1, (depth - 1000) / 3000))
  return base
}
