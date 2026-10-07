import type { FishRegionTag } from '../regions/regions'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
export const RARITY_NAMES: Record<Rarity, string> = {
  common: '常见',
  uncommon: '较少见',
  rare: '稀有',
  epic: '非常稀有',
  legendary: '传奇',
  mythic: '极难发现',
}
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#c8d6e5',
  uncommon: '#55efc4',
  rare: '#74b9ff',
  epic: '#a29bfe',
  legendary: '#fdcb6e',
  mythic: '#ff7675',
}

export type Habitat =
  | 'coral_reef'
  | 'seagrass'
  | 'mangrove'
  | 'estuary'
  | 'coastal'
  | 'rocky'
  | 'kelp'
  | 'sandy'
  | 'pelagic'
  | 'benthic'
  | 'deep_pelagic'
  | 'deep_benthic'
  | 'vent'
  | 'trench'
  | 'polar'
  | 'cave'
  | 'wreck'

export const HABITAT_NAMES: Record<Habitat, string> = {
  coral_reef: '珊瑚礁',
  seagrass: '海草床',
  mangrove: '红树林',
  estuary: '河口',
  coastal: '近岸',
  rocky: '岩礁',
  kelp: '海藻森林',
  sandy: '沙地',
  pelagic: '外海',
  benthic: '海底',
  deep_pelagic: '深海水层',
  deep_benthic: '深海海底',
  vent: '热液喷口',
  trench: '海沟',
  polar: '极地冰下',
  cave: '洞穴',
  wreck: '沉船',
}

export type Behavior =
  | 'shy'
  | 'curious'
  | 'school'
  | 'ambush'
  | 'benthic'
  | 'nocturnal'
  | 'territorial'
  | 'fast'
  | 'slow'
  | 'camouflage'
  | 'drifter'

export const BEHAVIOR_NAMES: Record<Behavior, string> = {
  shy: '胆小型',
  curious: '好奇型',
  school: '群游型',
  ambush: '伏击型',
  benthic: '底栖型',
  nocturnal: '夜行型',
  territorial: '领域型',
  fast: '快速型',
  slow: '缓慢型',
  camouflage: '伪装型',
  drifter: '深海漂浮型',
}

export type BodyShape =
  | 'oval'
  | 'deep'
  | 'disc'
  | 'fusiform'
  | 'slender'
  | 'arrow'
  | 'eel'
  | 'ribbon'
  | 'robust'
  | 'globe'
  | 'box'
  | 'flat'
  | 'shark'
  | 'ray'
  | 'sunfish'
  | 'seahorse'
  | 'angler'
  | 'hatchet'
  | 'gulper'
  | 'tapered'
  | 'tadpole'

export type TailShape = 'fork' | 'lunate' | 'round' | 'truncate' | 'pointed' | 'none' | 'hetero' | 'lyre'
export type FinShape = 'none' | 'small' | 'tall' | 'spiny' | 'long' | 'crest' | 'sail'
export type Pattern =
  | 'plain'
  | 'stripes_v'
  | 'stripes_h'
  | 'spots'
  | 'dots_dark'
  | 'gradient'
  | 'bands_white'
  | 'eyespot'
  | 'mottled'
  | 'reticulated'
  | 'saddle'
  | 'mask'
  | 'half'

export interface ArtSpec {
  shape: BodyShape
  tail: TailShape
  fin: FinShape
  pattern: Pattern
  c1: string
  c2: string
  c3: string
  features: string[]
}

export interface FishSpecies {
  id: string
  scientificName: string
  commonName: string
  englishName: string
  family: string
  genus: string
  habitat: Habitat[]
  depth: { min: number; max: number }
  region: FishRegionTag[]
  size: { min: number; max: number }
  rarity: Rarity
  behavior: Behavior
  captureDifficulty: number
  price: number
  art: ArtSpec
  /** 生物发光颜色 */
  glow?: string
  photoOnly?: boolean
  caveOnly?: boolean
  wreck?: boolean
  /** 昼夜垂直迁移：夜间上浮 */
  dvm?: boolean
  danger?: number
  active?: 'day' | 'night' | 'any'
  school?: [number, number]
  whaleFall?: boolean
  note?: string
}
