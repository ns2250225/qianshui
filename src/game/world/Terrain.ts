// 程序化海底地形：横向无限，按海域模板生成
import { REGIONS, regionIdAtCell, type RegionDef } from '../../data/regions/regions'
import { REGION_W, depthToY, MAX_DEPTH } from '../core/constants'
import { fbm1, noise2, clamp, smoothstep, lerp } from '../core/rng'

export function cellAt(x: number): number {
  return Math.floor((x + REGION_W / 2) / REGION_W)
}

export function cellStart(cell: number): number {
  return cell * REGION_W - REGION_W / 2
}

export function regionOfCell(cell: number): RegionDef {
  return REGIONS[regionIdAtCell(cell)]
}

export function regionAt(x: number): RegionDef {
  return regionOfCell(cellAt(x))
}

function profile(cell: number, x: number): number {
  const r = regionOfCell(cell)
  const f = r.floor
  const freq = f.freq ?? 1 / 2000
  const n = fbm1(x * freq + cell * 17.31, 101, 4)
  const lx = (x - cellStart(cell)) / REGION_W
  switch (f.kind) {
    case 'noise':
      return Math.max(3, f.base + f.amp * (n - 0.5) * 2.2)
    case 'basin': {
      const k = smoothstep(0, 0.32, Math.min(lx, 1 - lx))
      const inner = f.base + f.amp * (n - 0.5) * 2
      // 海山
      const sm = fbm1(x / 900 + cell * 3.1, 202, 2)
      const seamount = sm > 0.72 ? (sm - 0.72) * 6 * f.base * 0.5 : 0
      return lerp(f.edge ?? 500, inner - seamount, k)
    }
    case 'trench': {
      const c = Math.abs(lx - 0.5)
      const v = Math.pow(Math.max(0, 1 - c / 0.3), 1.4)
      const edge = (f.edge ?? 5000) + f.amp * 3 * (n - 0.5)
      return Math.min(MAX_DEPTH, lerp(edge, f.base - f.amp * (1 - n) * (1 - v), v))
    }
  }
}

const BLEND = 1800

export function floorDepthAt(x: number): number {
  const cell = cellAt(x)
  const lx = x - cellStart(cell)
  let d = profile(cell, x)
  if (lx < BLEND) {
    const w = smoothstep(-BLEND, BLEND, lx)
    d = lerp(profile(cell - 1, x), d, w)
  } else if (lx > REGION_W - BLEND) {
    const w = smoothstep(-BLEND, BLEND, REGION_W - lx)
    d = lerp(profile(cell + 1, x), d, w)
  }
  // 起点附近保证浅滩
  if (Math.abs(x) < 1600) d = lerp(Math.min(d, 28 + 10 * fbm1(x / 300, 5)), d, smoothstep(900, 1600, Math.abs(x)))
  // 局部岩石起伏
  d += (fbm1(x / 90, 303, 2) - 0.5) * Math.min(40, 4 + d * 0.02)
  return clamp(d, 2, MAX_DEPTH)
}

const cache = new Map<number, number>()

/** 海底 y（像素），按 4px 缓存 */
export function floorY(x: number): number {
  const k = Math.floor(x / 4)
  let v = cache.get(k)
  if (v === undefined) {
    const a = depthToY(floorDepthAt(k * 4))
    v = a
    if (cache.size > 60000) cache.clear()
    cache.set(k, v)
  }
  const k2 = k + 1
  let v2 = cache.get(k2)
  if (v2 === undefined) {
    v2 = depthToY(floorDepthAt(k2 * 4))
    cache.set(k2, v2)
  }
  return lerp(v, v2, (x - k * 4) / 4)
}

/** 洋流场：返回水平速度（px/s）与等级 */
export function currentAt(x: number, y: number): { vx: number; level: number } {
  if (y < 160) return { vx: 0, level: 0 }
  const v = noise2(x / 2600, y / 700, 909)
  if (v < 0.68) return { vx: 0, level: 0 }
  const level = v > 0.86 ? 3 : v > 0.77 ? 2 : 1
  const dir = noise2(7, y / 1500, 919) > 0.5 ? 1 : -1
  return { vx: dir * level * 70, level }
}
