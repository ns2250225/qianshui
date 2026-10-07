// 确定性随机数 & 噪声工具

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type RNG = () => number

/** 整数哈希 -> [0,1) */
export function hash2(x: number, y: number, salt = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 2147483647)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h = h ^ (h >>> 16)
  return (h >>> 0) / 4294967296
}

export function hashSeed(...n: number[]): number {
  let h = 2166136261
  for (const v of n) {
    h ^= v | 0
    h = Math.imul(h, 16777619)
    h ^= h >>> 13
  }
  return h >>> 0
}

export function strHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function smooth(t: number) {
  return t * t * (3 - 2 * t)
}

/** 1D 值噪声 [0,1) */
export function noise1(x: number, salt = 0): number {
  const i = Math.floor(x)
  const f = x - i
  const a = hash2(i, 0, salt)
  const b = hash2(i + 1, 0, salt)
  return a + (b - a) * smooth(f)
}

/** 分形 1D 噪声 [0,1) */
export function fbm1(x: number, salt = 0, oct = 4): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let o = 0; o < oct; o++) {
    sum += noise1(x * freq, salt + o * 31) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.03
  }
  return sum / norm
}

/** 2D 值噪声 [0,1) */
export function noise2(x: number, y: number, salt = 0): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = smooth(x - ix)
  const fy = smooth(y - iy)
  const a = hash2(ix, iy, salt)
  const b = hash2(ix + 1, iy, salt)
  const c = hash2(ix, iy + 1, salt)
  const d = hash2(ix + 1, iy + 1, salt)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

export function pick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length]
}

export function weightedPick<T>(rng: RNG, items: readonly T[], weight: (t: T) => number): T | null {
  let total = 0
  for (const it of items) total += Math.max(0, weight(it))
  if (total <= 0) return null
  let r = rng() * total
  for (const it of items) {
    r -= Math.max(0, weight(it))
    if (r <= 0) return it
  }
  return items[items.length - 1]
}

export function randRange(rng: RNG, a: number, b: number) {
  return a + (b - a) * rng()
}

export function randInt(rng: RNG, a: number, b: number) {
  return Math.floor(a + (b - a + 1) * rng())
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255
  return (Math.round(lerp(r1, r2, t)) << 16) | (Math.round(lerp(g1, g2, t)) << 8) | Math.round(lerp(b1, b2, t))
}

export function hexToNum(h: string): number {
  return parseInt(h.replace('#', ''), 16)
}

export function numToCss(n: number): string {
  return '#' + n.toString(16).padStart(6, '0')
}

export function shade(c: number, f: number): number {
  // f<1 变暗，f>1 变亮
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255
  if (f < 1) return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f)
  const k = f - 1
  return (Math.round(r + (255 - r) * k) << 16) | (Math.round(g + (255 - g) * k) << 8) | Math.round(b + (255 - b) * k)
}
