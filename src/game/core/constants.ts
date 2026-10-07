// 世界坐标常量与深度映射
// 世界 y=0 为海面，y 向下为正。深度采用分段线性映射，让浅海更宽敞、深海可快速穿越。

export const CHUNK = 512
export const PX_PER_M_X = 8 // 水平：8px = 1m
export const MAX_DEPTH = 10935
export const REGION_W = 16000 // 每个海域的水平宽度（px）

const TABLE: [number, number][] = [
  [0, 0],
  [200, 1600], // 0-200m: 8px/m
  [1000, 4000], // 200-1000m: 3px/m
  [4000, 7000], // 1000-4000m: 1px/m
  [11000, 10500], // 4000-11000m: 0.5px/m
]

export function depthToY(d: number): number {
  if (d <= 0) return d * 8
  for (let i = 1; i < TABLE.length; i++) {
    const [d1, y1] = TABLE[i]
    const [d0, y0] = TABLE[i - 1]
    if (d <= d1) return y0 + ((d - d0) / (d1 - d0)) * (y1 - y0)
  }
  return TABLE[TABLE.length - 1][1]
}

export function yToDepth(y: number): number {
  if (y <= 0) return y / 8
  for (let i = 1; i < TABLE.length; i++) {
    const [d1, y1] = TABLE[i]
    const [d0, y0] = TABLE[i - 1]
    if (y <= y1) return d0 + ((y - y0) / (y1 - y0)) * (d1 - d0)
  }
  return TABLE[TABLE.length - 1][0]
}

export const WORLD_BOTTOM_Y = depthToY(11000)

/** 游戏内 1 秒现实时间 = 2 游戏分钟 */
export const GAME_MIN_PER_SEC = 2

export const DEPTH_ZONES = [
  { id: 'surface', name: '海面', min: -999, max: 1 },
  { id: 'shallow', name: '浅海', min: 1, max: 50 },
  { id: 'shelf', name: '大陆架', min: 50, max: 200 },
  { id: 'twilight', name: '暮光带', min: 200, max: 1000 },
  { id: 'midnight', name: '午夜带', min: 1000, max: 4000 },
  { id: 'abyss', name: '深渊带', min: 4000, max: 6000 },
  { id: 'hadal', name: '超深渊带', min: 6000, max: 10000 },
  { id: 'trench', name: '海沟', min: 10000, max: 99999 },
] as const

export type ZoneId = (typeof DEPTH_ZONES)[number]['id']

export function zoneOfDepth(d: number) {
  for (const z of DEPTH_ZONES) if (d < z.max) return z
  return DEPTH_ZONES[DEPTH_ZONES.length - 1]
}
