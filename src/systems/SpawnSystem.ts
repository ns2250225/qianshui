import type { Game } from '../game/core/Game'
import { buildHabitats, candidates, type SpawnContext } from '../game/biome/Biome'
import { weightedPick, randInt, clamp } from '../game/core/rng'
import { yToDepth } from '../game/core/constants'
import { floorDepthAt, regionAt } from '../game/world/Terrain'
import { REGIONS } from '../data/regions/regions'
import type { FishSpecies } from '../data/fish/types'
import { rarityIndex } from '../data/fish'

const MAX_FISH = 320

export class SpawnSystem {
  timer = 0
  g: Game
  constructor(g: Game) {
    this.g = g
  }

  context(x: number, y: number, over: Partial<SpawnContext> = {}): SpawnContext {
    const g = this.g
    const inInterior = !!g.interior
    const region = inInterior ? REGIONS[g.interior!.regionId as keyof typeof REGIONS] : regionAt(x)
    const depth = inInterior ? g.interior!.depth : Math.max(0, yToDepth(y))
    const space = g.space
    const nearFloor = space.floorY(x) - y < 140
    let nearVent = false
    let whaleFall = false
    let wreck = false
    if (!inInterior) {
      for (const f of g.world.featuresWithin(x, y, 650)) {
        const d = Math.hypot(f.x - x, f.y - y)
        if (f.kind === 'vent' && d < 420) nearVent = true
        if (f.kind === 'whalefall') whaleFall = true
        if (f.kind === 'wreck' && d < 380) wreck = true
      }
    } else if (!g.interior!.isCave) wreck = true
    const base: Omit<SpawnContext, 'habitats'> = {
      region,
      depth,
      floorDepth: inInterior ? depth : floorDepthAt(x),
      nearFloor,
      night: g.env.isNight,
      nearVent,
      whaleFall,
      wreck,
      cave: inInterior && g.interior!.isCave,
      rareFind: g.stats.rareFind,
      rareBoost: g.events.rareBoost + (g.lure ? 0.6 : 0),
      weatherRare: g.env.weather.rare,
      ...over,
    }
    const ctx = { ...base, habitats: buildHabitats(base) } as SpawnContext
    if (inInterior && !g.interior!.isCave) {
      ctx.habitats.add('wreck')
      ctx.habitats.add('rocky')
    }
    return ctx
  }

  pick(ctx: SpawnContext, filter?: (sp: FishSpecies) => boolean): FishSpecies | null {
    let list = candidates(ctx)
    if (filter) list = list.filter((c) => filter(c.sp))
    // 传奇/极难发现物种同屏唯一
    const present = new Set(this.g.fish.fish.map((f) => f.sp.id))
    list = list.filter((c) => !(rarityIndex(c.sp.rarity) >= 4 && present.has(c.sp.id)))
    const c = weightedPick(Math.random, list, (c) => c.w)
    return c ? c.sp : null
  }

  spawnGroup(x: number, y: number, ctx?: SpawnContext, forced?: FishSpecies, scale = 1): number {
    const g = this.g
    const space = g.space
    ctx = ctx ?? this.context(x, y)
    const sp = forced ?? this.pick(ctx)
    if (!sp) return 0
    const benthic = ['benthic', 'camouflage', 'ambush'].includes(sp.behavior) || sp.habitat.every((h) => ['benthic', 'deep_benthic', 'sandy', 'rocky', 'vent', 'trench', 'cave', 'wreck'].includes(h))
    const fy = space.floorY(x)
    if (benthic && !g.interior && yToDepth(fy) > sp.depth.max * 1.08 + 6) return 0
    if (benthic) y = fy - 10
    y = clamp(y, space.ceilY(x) + 14, fy - 10)
    if (sp.school) {
      const n = Math.round(randInt(Math.random, sp.school[0], sp.school[1]) * scale)
      g.fish.spawnSchool(sp, x, y, Math.max(2, n), space)
      return n
    }
    const n = sp.size.max < 15 && Math.random() < 0.4 ? randInt(Math.random, 2, 3) : 1
    for (let i = 0; i < n; i++) {
      const f = g.fish.spawn(sp, x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 20)
      if (g.interior) f.inInterior = true
    }
    return n
  }

  /** 目标鱼群（组）数量 */
  targetCount(): number {
    const g = this.g
    if (g.interior) return 12
    const p = g.player
    const region = regionAt(p.x)
    const d = Math.max(0, yToDepth(p.y))
    let k = d < 200 ? 1 : d < 1000 ? 0.65 : d < 4000 ? 0.42 : d < 8000 ? 0.28 : 0.12
    if (d < 4 && g.mode !== 'diving') k = 0.6
    return Math.max(2, Math.round(18 * region.richness * k * (g.env.isNight ? 0.9 : 1)))
  }

  update(dt: number) {
    const g = this.g
    const p = g.player
    // 清理远处的鱼
    const far = g.interior ? 1e9 : 2100
    for (const f of g.fish.fish) {
      if (Math.abs(f.x - p.x) > far || Math.abs(f.y - p.y) > far * 0.8) f.dead = true
    }
    this.timer -= dt
    if (this.timer > 0) return
    this.timer = 0.25
    const count = g.fish.fish.length
    let groups = g.fish.schools.length
    for (const f of g.fish.fish) if (!f.school) groups++
    if (count >= MAX_FISH || groups >= this.targetCount()) return
    // 视野外生成
    const vw = g.viewW
    const vh = g.viewH
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.hypot(vw, vh) / 2 + 60 + Math.random() * 500
      const x = p.x + Math.cos(a) * r
      const y = p.y + Math.sin(a) * r * 0.7
      if (!this.validWater(x, y)) continue
      this.spawnGroup(x, y)
      return
    }
  }

  validWater(x: number, y: number) {
    const s = this.g.space
    if (x < s.minX + 20 || x > s.maxX - 20) return false
    return y > s.ceilY(x) + 16 && y < s.floorY(x) - 8
  }

  initialFill(n = 10) {
    const g = this.g
    const p = g.player
    for (let i = 0; i < n * 3 && n > 0; i++) {
      const x = p.x + (Math.random() - 0.5) * g.viewW * 1.4
      const y = p.y + (Math.random() - 0.3) * g.viewH * 1.2
      if (!this.validWater(x, y)) continue
      if (Math.hypot(x - p.x, y - p.y) < 120) continue
      this.spawnGroup(x, y, undefined, undefined, 0.7)
      n--
    }
  }
}
