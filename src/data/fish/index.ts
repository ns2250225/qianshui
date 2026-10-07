import { RAW_FISH } from './species'
import type { ArtSpec, Behavior, FishSpecies, Habitat, Rarity } from './types'
import { RARITY_ORDER } from './types'
import type { FishRegionTag } from '../regions/regions'

export * from './types'

const RARITY_CODE: Record<string, Rarity> = {
  c: 'common',
  u: 'uncommon',
  r: 'rare',
  e: 'epic',
  l: 'legendary',
  m: 'mythic',
}

const RARITY_BASE: Record<Rarity, number> = {
  common: 14,
  uncommon: 38,
  rare: 120,
  epic: 380,
  legendary: 1400,
  mythic: 4200,
}

function parseArt(s: string): ArtSpec {
  const [shape, tail, fin, pattern, c1, c2, c3, feat] = s.split(' ')
  return {
    shape: shape as ArtSpec['shape'],
    tail: tail as ArtSpec['tail'],
    fin: fin as ArtSpec['fin'],
    pattern: pattern as ArtSpec['pattern'],
    c1: '#' + c1,
    c2: '#' + c2,
    c3: '#' + c3,
    features: feat ? feat.split(',') : [],
  }
}

export function sizeClass(cm: number): number {
  if (cm < 30) return 1
  if (cm < 100) return 2
  if (cm < 250) return 3
  if (cm < 600) return 4
  return 5
}

function build(): FishSpecies[] {
  const list: FishSpecies[] = []
  const seen = new Set<string>()
  for (const r of RAW_FISH) {
    const [id, sci, cn, en, family, hab, dmin, dmax, reg, smin, smax, rc, beh, art, ext = {}] = r
    if (!id || seen.has(id)) continue
    seen.add(id)
    const rarity = RARITY_CODE[rc] ?? 'common'
    const behavior = beh as Behavior
    const ri = RARITY_ORDER.indexOf(rarity)
    const sizeF = Math.min(6, Math.max(0.6, Math.sqrt(smax / 20)))
    const deepF = 1 + dmin / 2500
    const price = ext.price ?? Math.max(5, Math.round((RARITY_BASE[rarity] * sizeF * deepF) / 5) * 5)
    let diff = 1 + ri * 1.5
    if (behavior === 'fast') diff += 2
    else if (behavior === 'shy') diff += 1
    else if (behavior === 'slow' || behavior === 'drifter') diff -= 0.5
    if (behavior === 'camouflage') diff += 0.5
    const captureDifficulty = ext.diff ?? Math.max(1, Math.min(10, Math.round(diff)))
    const species: FishSpecies = {
      id,
      scientificName: sci,
      commonName: cn,
      englishName: en,
      family,
      genus: sci.split(' ')[0],
      habitat: hab.split(' ') as Habitat[],
      depth: { min: dmin, max: dmax },
      region: reg.split(' ') as FishRegionTag[],
      size: { min: smin, max: smax },
      rarity,
      behavior,
      captureDifficulty,
      price,
      art: parseArt(art),
      glow: ext.g,
      photoOnly: ext.photo,
      caveOnly: ext.cave,
      wreck: ext.wreck,
      dvm: ext.dvm,
      danger: ext.danger,
      active: ext.act ?? (behavior === 'nocturnal' ? 'night' : 'any'),
      school: ext.school ?? (behavior === 'school' ? [6, 14] : undefined),
      whaleFall: ext.wf,
      note: ext.note,
    }
    list.push(species)
  }
  return list
}

export const FISH: FishSpecies[] = build()
export const FISH_MAP: Record<string, FishSpecies> = Object.fromEntries(FISH.map((f) => [f.id, f]))
export const FISH_COUNT = FISH.length

export function rarityIndex(r: Rarity) {
  return RARITY_ORDER.indexOf(r)
}

export function rarityStars(r: Rarity): string {
  const n = Math.min(5, rarityIndex(r) + 1)
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
