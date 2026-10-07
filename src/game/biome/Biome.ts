import type { RegionDef } from '../../data/regions/regions'
import type { FishSpecies, Habitat } from '../../data/fish/types'
import { FISH } from '../../data/fish'
import { rarityIndex } from '../../data/fish'
import { zoneOfDepth } from '../core/constants'

export interface SpawnContext {
  region: RegionDef
  depth: number
  floorDepth: number
  nearFloor: boolean
  night: boolean
  nearVent: boolean
  whaleFall: boolean
  wreck: boolean
  cave: boolean
  rareFind: number
  rareBoost: number
  weatherRare: number
  habitats: Set<Habitat>
}

export function buildHabitats(ctx: Omit<SpawnContext, 'habitats'>): Set<Habitat> {
  const h = new Set<Habitat>()
  const { region: r, depth: d, floorDepth: fd, nearFloor } = ctx
  if (ctx.cave) {
    h.add('cave')
    h.add('rocky')
    if (d >= 200) h.add('deep_benthic')
    return h
  }
  if (ctx.wreck) h.add('wreck')
  if (d < 200) {
    if (nearFloor) {
      h.add('benthic')
      h.add('sandy')
      h.add('rocky')
    }
    h.add('pelagic')
    if (fd < 260) h.add('coastal')
  } else {
    h.add('deep_pelagic')
    if (d < 1000) h.add('pelagic')
    if (nearFloor) h.add('deep_benthic')
  }
  if (r.coral > 0.5 && d < 150) h.add('coral_reef')
  if (r.seagrass > 0.3 && d < 60) h.add('seagrass')
  if (r.mangrove) {
    h.add('mangrove')
    h.add('estuary')
    h.add('coastal')
  }
  if (r.kelp > 0 && fd < 120 && d < 100) {
    h.add('kelp')
    h.add('rocky')
  }
  if (r.temp === 'polar') h.add('polar')
  if (ctx.nearVent) h.add('vent')
  if (r.id === 'trench' && d > 6000) h.add('trench')
  return h
}

const RARITY_W = [100, 34, 11, 4, 1.5, 0.5]
const regionCache = new Map<string, FishSpecies[]>()

function regionPool(r: RegionDef): FishSpecies[] {
  let p = regionCache.get(r.id)
  if (!p) {
    const tags = new Set<string>(r.fishRegions)
    p = FISH.filter((f) => f.region.some((t) => tags.has(t)))
    regionCache.set(r.id, p)
  }
  return p
}

export function depthRangeOf(sp: FishSpecies, night: boolean): [number, number] {
  let min = sp.depth.min
  if (sp.dvm && night) min = 0
  return [min, sp.depth.max]
}

export interface Candidate {
  sp: FishSpecies
  w: number
}

export function candidates(ctx: SpawnContext, opts: { allowPhoto?: boolean; maxClass?: number } = {}): Candidate[] {
  const out: Candidate[] = []
  for (const sp of regionPool(ctx.region)) {
    const [dmin, dmax] = depthRangeOf(sp, ctx.night)
    if (ctx.depth < dmin * 0.9 - 4 || ctx.depth > dmax * 1.08 + 6) continue
    if (!sp.habitat.some((h) => ctx.habitats.has(h))) continue
    if (sp.caveOnly && !ctx.cave) continue
    if (opts.allowPhoto === false && sp.photoOnly) continue
    // 极地限制：非极地鱼不出现在极地浅水
    if (ctx.region.temp === 'polar' && !sp.habitat.includes('polar') && ctx.depth < 200) continue
    const ri = rarityIndex(sp.rarity)
    let w = RARITY_W[ri]
    if (ri >= 2) w *= 1 + ctx.rareFind + ctx.rareBoost + ctx.weatherRare
    if (sp.active === 'night' && !ctx.night) w *= ctx.cave ? 0.6 : 0.08
    if (sp.active === 'night' && ctx.night) w *= 2
    if (sp.whaleFall && ctx.whaleFall) w *= 10
    if (sp.wreck && ctx.wreck) w *= 3
    if (sp.habitat.includes('vent') && ctx.nearVent) w *= 6
    if (sp.habitat.includes('trench') && ctx.habitats.has('trench')) w *= 4
    if (ctx.cave && sp.habitat.includes('cave')) w *= 4
    if (ctx.habitats.has('coral_reef') && sp.habitat.includes('coral_reef')) w *= 1.6
    if (ctx.habitats.has('seagrass') && sp.habitat.includes('seagrass')) w *= 1.8
    if (ctx.habitats.has('mangrove') && sp.habitat.includes('mangrove')) w *= 2
    if (ctx.habitats.has('kelp') && sp.habitat.includes('kelp')) w *= 2
    // 底栖鱼只在近底出现
    const benthicOnly = sp.habitat.every((h) => ['benthic', 'deep_benthic', 'sandy', 'rocky', 'vent', 'trench', 'cave', 'wreck'].includes(h))
    if (benthicOnly && !ctx.nearFloor) continue
    if (sp.size.max > 1000 && ctx.depth < 6) w *= 0.3
    out.push({ sp, w })
  }
  return out
}

export function zoneMusicFor(depth: number, region: RegionDef, cave: boolean): import('../core/audio').MusicZone {
  if (cave) return 'cave'
  if (depth < 1) return 'surface'
  if (depth < 200) {
    if (region.coral > 0.5 && depth < 120) return 'reef'
    if (region.floor.kind !== 'noise' || region.floor.base > 300) return 'open'
    return 'shallow'
  }
  if (depth < 1000) return 'twilight'
  if (depth < 6000) return 'deep'
  return 'trench'
}

export function zoneNameFor(depth: number, region: RegionDef): string {
  if (depth < 1) return '海面'
  if (region.coral > 0.5 && depth < 150 && depth > 10) return '珊瑚礁'
  if (region.id === 'trench' && depth > 6000) return depth > 10000 ? '海沟' : '超深渊带'
  return zoneOfDepth(depth).name
}
