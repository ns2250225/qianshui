// 全球海域定义

export type RegionId =
  | 'tropical_coral'
  | 'caribbean'
  | 'seagrass'
  | 'mangrove'
  | 'open_ocean'
  | 'north_pacific'
  | 'north_atlantic'
  | 'antarctic'
  | 'arctic'
  | 'hydrothermal'
  | 'trench'

export type OceanId = 'pacific' | 'atlantic' | 'indian' | 'arctic' | 'southern'

export const OCEAN_NAMES: Record<OceanId, string> = {
  pacific: '太平洋',
  atlantic: '大西洋',
  indian: '印度洋',
  arctic: '北冰洋',
  southern: '南大洋',
}

/** 鱼类分布区域标签 */
export type FishRegionTag =
  | 'indo_pacific'
  | 'western_pacific'
  | 'eastern_pacific'
  | 'north_pacific'
  | 'indian_ocean'
  | 'north_atlantic'
  | 'mediterranean'
  | 'caribbean'
  | 'arctic'
  | 'southern_ocean'
  | 'global'
  | 'global_tropical'
  | 'global_temperate'

export const FISH_REGION_NAMES: Record<FishRegionTag, string> = {
  indo_pacific: '印度-太平洋',
  western_pacific: '西太平洋',
  eastern_pacific: '东太平洋',
  north_pacific: '北太平洋',
  indian_ocean: '印度洋',
  north_atlantic: '北大西洋',
  mediterranean: '地中海',
  caribbean: '加勒比海',
  arctic: '北冰洋',
  southern_ocean: '南大洋',
  global: '全球海域',
  global_tropical: '全球热带海域',
  global_temperate: '全球温带海域',
}

export const FISH_REGION_OCEANS: Record<FishRegionTag, OceanId[]> = {
  indo_pacific: ['pacific', 'indian'],
  western_pacific: ['pacific'],
  eastern_pacific: ['pacific'],
  north_pacific: ['pacific'],
  indian_ocean: ['indian'],
  north_atlantic: ['atlantic'],
  mediterranean: ['atlantic'],
  caribbean: ['atlantic'],
  arctic: ['arctic'],
  southern_ocean: ['southern'],
  global: ['pacific', 'atlantic', 'indian', 'arctic', 'southern'],
  global_tropical: ['pacific', 'atlantic', 'indian'],
  global_temperate: ['pacific', 'atlantic'],
}

export interface RegionDef {
  id: RegionId
  name: string
  desc: string
  ocean: OceanId
  /** 海底轮廓 */
  floor: { kind: 'noise' | 'basin' | 'trench'; base: number; amp: number; edge?: number; freq?: number }
  temp: 'warm' | 'temperate' | 'cold' | 'polar'
  /** 需要的温控等级 1=极地保温 2=耐热 */
  needThermal?: number
  needThermalBelow?: number
  waterTint: number
  tintStrength: number
  fishRegions: FishRegionTag[]
  coral: number
  kelp: number
  seagrass: number
  mangrove: boolean
  ice: boolean
  vents: number
  caves: number
  wrecks: number
  richness: number
}

export const REGIONS: Record<RegionId, RegionDef> = {
  tropical_coral: {
    id: 'tropical_coral',
    name: '热带珊瑚海',
    desc: '印度洋—太平洋珊瑚三角区，鱼类数量极多，是图鉴收集的起点。',
    ocean: 'pacific',
    floor: { kind: 'noise', base: 55, amp: 40, freq: 1 / 1800 },
    temp: 'warm',
    waterTint: 0x1fd1c8,
    tintStrength: 0.18,
    fishRegions: ['indo_pacific', 'western_pacific', 'indian_ocean', 'global_tropical', 'global'],
    coral: 1,
    kelp: 0,
    seagrass: 0.15,
    mangrove: false,
    ice: false,
    vents: 0,
    caves: 0.5,
    wrecks: 0.35,
    richness: 1.4,
  },
  caribbean: {
    id: 'caribbean',
    name: '加勒比海',
    desc: '大西洋热带海域，拥有独特的珊瑚礁鱼类。',
    ocean: 'atlantic',
    floor: { kind: 'noise', base: 70, amp: 50, freq: 1 / 1600 },
    temp: 'warm',
    waterTint: 0x2ad6e8,
    tintStrength: 0.16,
    fishRegions: ['caribbean', 'global_tropical', 'global'],
    coral: 0.85,
    kelp: 0,
    seagrass: 0.3,
    mangrove: false,
    ice: false,
    vents: 0,
    caves: 0.45,
    wrecks: 0.6,
    richness: 1.2,
  },
  seagrass: {
    id: 'seagrass',
    name: '海草床',
    desc: '浅而平缓的海草草甸，是海马与幼鱼的育儿所。',
    ocean: 'indian',
    floor: { kind: 'noise', base: 22, amp: 12, freq: 1 / 2200 },
    temp: 'warm',
    waterTint: 0x6ad18a,
    tintStrength: 0.2,
    fishRegions: ['indo_pacific', 'indian_ocean', 'mediterranean', 'global_tropical', 'global'],
    coral: 0.1,
    kelp: 0,
    seagrass: 1,
    mangrove: false,
    ice: false,
    vents: 0,
    caves: 0.1,
    wrecks: 0.25,
    richness: 1.1,
  },
  mangrove: {
    id: 'mangrove',
    name: '红树林',
    desc: '咸淡水交汇的河口，红树根系中藏着大量幼鱼与弹涂鱼。',
    ocean: 'indian',
    floor: { kind: 'noise', base: 9, amp: 5, freq: 1 / 1500 },
    temp: 'warm',
    waterTint: 0x8a9a4a,
    tintStrength: 0.3,
    fishRegions: ['indo_pacific', 'western_pacific', 'indian_ocean', 'caribbean', 'global_tropical'],
    coral: 0,
    kelp: 0,
    seagrass: 0.4,
    mangrove: true,
    ice: false,
    vents: 0,
    caves: 0,
    wrecks: 0.1,
    richness: 1,
  },
  open_ocean: {
    id: 'open_ocean',
    name: '热带外海',
    desc: '一望无际的蓝水区，下方是深邃的深海平原。',
    ocean: 'pacific',
    floor: { kind: 'basin', base: 4900, amp: 400, edge: 900, freq: 1 / 2500 },
    temp: 'warm',
    waterTint: 0x1060d0,
    tintStrength: 0.12,
    fishRegions: ['global_tropical', 'global', 'indo_pacific', 'western_pacific'],
    coral: 0,
    kelp: 0,
    seagrass: 0,
    mangrove: false,
    ice: false,
    vents: 0.05,
    caves: 0.15,
    wrecks: 0.3,
    richness: 0.7,
  },
  north_pacific: {
    id: 'north_pacific',
    name: '北太平洋',
    desc: '冷水海域，海藻森林与鲑鱼洄游之地，大型鱼类众多。',
    ocean: 'pacific',
    floor: { kind: 'noise', base: 200, amp: 320, freq: 1 / 2600 },
    temp: 'cold',
    waterTint: 0x2f7a8a,
    tintStrength: 0.2,
    fishRegions: ['north_pacific', 'eastern_pacific', 'western_pacific', 'global_temperate', 'global'],
    coral: 0,
    kelp: 1,
    seagrass: 0.1,
    mangrove: false,
    ice: false,
    vents: 0,
    caves: 0.4,
    wrecks: 0.4,
    richness: 1,
  },
  north_atlantic: {
    id: 'north_atlantic',
    name: '北大西洋',
    desc: '鳕鱼、鲭鱼与比目鱼的故乡，大陆坡下潜藏深水鱼。',
    ocean: 'atlantic',
    floor: { kind: 'noise', base: 280, amp: 420, freq: 1 / 2400 },
    temp: 'cold',
    waterTint: 0x3a6f7a,
    tintStrength: 0.2,
    fishRegions: ['north_atlantic', 'mediterranean', 'global_temperate', 'global'],
    coral: 0,
    kelp: 0.4,
    seagrass: 0.2,
    mangrove: false,
    ice: false,
    vents: 0,
    caves: 0.35,
    wrecks: 0.7,
    richness: 1,
  },
  antarctic: {
    id: 'antarctic',
    name: '南极海域',
    desc: '冰山与浮冰覆盖的极寒海水，生活着血液透明的冰鱼。',
    ocean: 'southern',
    floor: { kind: 'noise', base: 420, amp: 1200, freq: 1 / 3000 },
    temp: 'polar',
    needThermal: 1,
    waterTint: 0x9ad8f0,
    tintStrength: 0.22,
    fishRegions: ['southern_ocean', 'global'],
    coral: 0,
    kelp: 0,
    seagrass: 0,
    mangrove: false,
    ice: true,
    vents: 0,
    caves: 0.3,
    wrecks: 0.2,
    richness: 0.8,
  },
  arctic: {
    id: 'arctic',
    name: '北极海域',
    desc: '终年浮冰的北冰洋，需要极地潜水装备才能进入。',
    ocean: 'arctic',
    floor: { kind: 'noise', base: 300, amp: 950, freq: 1 / 2800 },
    temp: 'polar',
    needThermal: 1,
    waterTint: 0x8cc8d8,
    tintStrength: 0.22,
    fishRegions: ['arctic', 'global'],
    coral: 0,
    kelp: 0.2,
    seagrass: 0,
    mangrove: false,
    ice: true,
    vents: 0,
    caves: 0.3,
    wrecks: 0.3,
    richness: 0.8,
  },
  hydrothermal: {
    id: 'hydrothermal',
    name: '深海热泉',
    desc: '黑暗中矗立的热液喷口与矿物烟柱，孕育了独特的化能生态。',
    ocean: 'pacific',
    floor: { kind: 'basin', base: 2700, amp: 450, edge: 1200, freq: 1 / 1800 },
    temp: 'temperate',
    needThermal: 2,
    needThermalBelow: 1500,
    waterTint: 0x204a6a,
    tintStrength: 0.12,
    fishRegions: ['eastern_pacific', 'global'],
    coral: 0,
    kelp: 0,
    seagrass: 0,
    mangrove: false,
    ice: false,
    vents: 1,
    caves: 0.3,
    wrecks: 0.1,
    richness: 0.8,
  },
  trench: {
    id: 'trench',
    name: '马里亚纳海沟',
    desc: '游戏终极探索区域。完全黑暗、极高压力，却可能藏着极其稀有的鱼类。',
    ocean: 'pacific',
    floor: { kind: 'trench', base: 10935, amp: 200, edge: 5200, freq: 1 / 1400 },
    temp: 'temperate',
    waterTint: 0x0a2a6a,
    tintStrength: 0.1,
    fishRegions: ['western_pacific', 'global'],
    coral: 0,
    kelp: 0,
    seagrass: 0,
    mangrove: false,
    ice: false,
    vents: 0.1,
    caves: 0.2,
    wrecks: 0.1,
    richness: 0.5,
  },
}

export const REGION_LIST = Object.values(REGIONS)

/** 海域排布：起点附近固定，其余按种子打乱 */
const FIXED: Record<number, RegionId> = {
  [-2]: 'mangrove',
  [-1]: 'seagrass',
  0: 'tropical_coral',
  1: 'open_ocean',
  2: 'trench',
}
const POS_SEQ: RegionId[] = ['north_pacific', 'hydrothermal', 'arctic', 'open_ocean', 'north_atlantic', 'antarctic', 'caribbean', 'tropical_coral', 'trench', 'open_ocean']
const NEG_SEQ: RegionId[] = ['caribbean', 'open_ocean', 'north_atlantic', 'antarctic', 'hydrothermal', 'north_pacific', 'trench', 'arctic', 'seagrass', 'tropical_coral']

export function regionIdAtCell(cell: number): RegionId {
  if (FIXED[cell]) return FIXED[cell]
  if (cell > 0) {
    const i = cell - 3
    return POS_SEQ[((i % POS_SEQ.length) + POS_SEQ.length) % POS_SEQ.length]
  }
  const i = -cell - 3
  return NEG_SEQ[((i % NEG_SEQ.length) + NEG_SEQ.length) % NEG_SEQ.length]
}
