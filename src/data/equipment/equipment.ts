// 潜水装备数据

export type EquipCat =
  | 'suit'
  | 'thermal'
  | 'mask'
  | 'fins'
  | 'thruster'
  | 'net'
  | 'bag'
  | 'lamp'
  | 'sonar'
  | 'detector'
  | 'camera'
  | 'trap'

export interface EquipStats {
  maxDepth?: number
  hp?: number
  stealth?: number
  thermal?: number
  vision?: number
  rareFind?: number
  speed?: number
  turn?: number
  sprint?: number
  currentResist?: number
  netRange?: number
  netCooldown?: number
  netPower?: number
  netClass?: number
  netMulti?: number
  capacity?: number
  light?: number
  sonarRange?: number
  sonarCooldown?: number
  detectRange?: number
  detectRarity?: number
  photoRange?: number
  photoCooldown?: number
  traps?: number
}

export interface EquipTier {
  id: string
  name: string
  price: number
  parts?: number
  desc: string
  stats: EquipStats
}

export interface EquipCategory {
  id: EquipCat
  name: string
  icon: string
  desc: string
  /** 初始是否拥有第 0 级 */
  starter: boolean
  tiers: EquipTier[]
}

export const EQUIPMENT: EquipCategory[] = [
  {
    id: 'suit',
    name: '潜水服',
    icon: '🤿',
    desc: '决定最大深度、耐压能力与耐久。',
    starter: true,
    tiers: [
      { id: 'suit0', name: '普通潜水服', price: 0, desc: '适合浅海休闲潜水。', stats: { maxDepth: 60, hp: 100, stealth: 0 } },
      { id: 'suit1', name: '专业潜水服', price: 900, desc: '可抵达大陆架边缘。', stats: { maxDepth: 220, hp: 120, stealth: 0.05 } },
      { id: 'suit2', name: '深潜服', price: 4200, desc: '进入暮光带的必备装备。', stats: { maxDepth: 1050, hp: 140, stealth: 0.08 } },
      { id: 'suit3', name: '强化耐压服', price: 15000, parts: 3, desc: '可抵御午夜带的巨大水压。', stats: { maxDepth: 4100, hp: 170, stealth: 0.1 } },
      { id: 'suit4', name: '深海潜水服', price: 42000, parts: 6, desc: '深渊带探索服。', stats: { maxDepth: 6100, hp: 200, stealth: 0.12 } },
      { id: 'suit5', name: '深渊潜水服', price: 110000, parts: 10, desc: '超深渊带的极限装备。', stats: { maxDepth: 10050, hp: 240, stealth: 0.15 } },
      { id: 'suit6', name: '海沟探索服', price: 260000, parts: 16, desc: '可抵达地球最深处。', stats: { maxDepth: 11000, hp: 300, stealth: 0.18 } },
    ],
  },
  {
    id: 'thermal',
    name: '温控模块',
    icon: '🌡️',
    desc: '极端温度环境适应。',
    starter: false,
    tiers: [
      { id: 'th0', name: '极地保温层', price: 6000, parts: 2, desc: '可进入南极、北极等极寒海域。', stats: { thermal: 1 } },
      { id: 'th1', name: '全域温控层', price: 30000, parts: 5, desc: '额外耐受热液喷口附近的高温海水。', stats: { thermal: 2 } },
    ],
  },
  {
    id: 'mask',
    name: '面镜',
    icon: '🥽',
    desc: '提升视野与稀有鱼发现率。',
    starter: true,
    tiers: [
      { id: 'mask0', name: '普通面镜', price: 0, desc: '基础视野。', stats: { vision: 0, rareFind: 0 } },
      { id: 'mask1', name: '防雾面镜', price: 500, desc: '视野更清晰。', stats: { vision: 20, rareFind: 0.1 } },
      { id: 'mask2', name: '广角面镜', price: 2600, desc: '更宽的视野。', stats: { vision: 40, rareFind: 0.2 } },
      { id: 'mask3', name: 'HUD 智能面镜', price: 12000, parts: 2, desc: '增强现实辅助识别。', stats: { vision: 60, rareFind: 0.35 } },
      { id: 'mask4', name: '深海增感面镜', price: 45000, parts: 6, desc: '微光增强，稀有鱼无所遁形。', stats: { vision: 90, rareFind: 0.55 } },
    ],
  },
  {
    id: 'fins',
    name: '脚蹼',
    icon: '🦶',
    desc: '提高游泳速度与转向速度。',
    starter: true,
    tiers: [
      { id: 'fins0', name: '橡胶脚蹼', price: 0, desc: '基础游速。', stats: { speed: 120, turn: 5, stealth: 0 } },
      { id: 'fins1', name: '长脚蹼', price: 350, desc: '游得更快。', stats: { speed: 150, turn: 6, stealth: 0.02 } },
      { id: 'fins2', name: '碳纤维脚蹼', price: 2200, desc: '轻盈而有力。', stats: { speed: 180, turn: 7.5, stealth: 0.05 } },
      { id: 'fins3', name: '静音脚蹼', price: 9000, parts: 1, desc: '减少惊扰鱼类。', stats: { speed: 210, turn: 9, stealth: 0.15 } },
      { id: 'fins4', name: '仿生鳍', price: 36000, parts: 5, desc: '像鱼一样游动。', stats: { speed: 250, turn: 11, stealth: 0.25 } },
    ],
  },
  {
    id: 'thruster',
    name: '推进器',
    icon: '🚀',
    desc: 'Shift 冲刺时高速移动，并抵抗洋流。',
    starter: false,
    tiers: [
      { id: 'dpv1', name: 'DPV-I', price: 1500, desc: '入门水下推进器。', stats: { sprint: 320, currentResist: 1 } },
      { id: 'dpv2', name: 'DPV-II', price: 8000, desc: '可抵抗中等洋流。', stats: { sprint: 430, currentResist: 2 } },
      { id: 'dpv3', name: 'DPV-III', price: 30000, parts: 4, desc: '高速推进，可逆强洋流而上。', stats: { sprint: 560, currentResist: 3 } },
      { id: 'dpv4', name: '深海推进器', price: 90000, parts: 10, desc: '专为深海长途航行设计。', stats: { sprint: 720, currentResist: 4 } },
    ],
  },
  {
    id: 'net',
    name: '捕捞网',
    icon: '🥅',
    desc: 'Space 挥网捕获，提升范围、速度与成功率。',
    starter: true,
    tiers: [
      { id: 'net0', name: '普通网', price: 0, desc: '可捕获 1m 以下的鱼。', stats: { netRange: 62, netCooldown: 0.7, netPower: 0.72, netClass: 2, netMulti: 1 } },
      { id: 'net1', name: '轻量网', price: 600, desc: '挥动更快。', stats: { netRange: 72, netCooldown: 0.55, netPower: 0.78, netClass: 2, netMulti: 2 } },
      { id: 'net2', name: '快速网', price: 3500, desc: '可捕获 2.5m 以下的鱼。', stats: { netRange: 84, netCooldown: 0.45, netPower: 0.84, netClass: 3, netMulti: 3 } },
      { id: 'net3', name: '大型网', price: 14000, parts: 2, desc: '可捕获 6m 以下的大型鱼类。', stats: { netRange: 104, netCooldown: 0.45, netPower: 0.9, netClass: 4, netMulti: 5 } },
      { id: 'net4', name: '专业采集网', price: 52000, parts: 6, desc: '科研级采集网。', stats: { netRange: 128, netCooldown: 0.35, netPower: 0.96, netClass: 5, netMulti: 8 } },
    ],
  },
  {
    id: 'bag',
    name: '背包',
    icon: '🎒',
    desc: '决定一次能够携带多少鱼。',
    starter: true,
    tiers: [
      { id: 'bag0', name: '小型采集箱', price: 0, desc: '容量 10。', stats: { capacity: 10 } },
      { id: 'bag1', name: '标准采集箱', price: 700, desc: '容量 25。', stats: { capacity: 25 } },
      { id: 'bag2', name: '大型采集箱', price: 4000, desc: '容量 50。', stats: { capacity: 50 } },
      { id: 'bag3', name: '专业采集箱', price: 16000, parts: 2, desc: '容量 100。', stats: { capacity: 100 } },
      { id: 'bag4', name: '研究采集箱', price: 60000, parts: 6, desc: '容量 200。', stats: { capacity: 200 } },
    ],
  },
  {
    id: 'lamp',
    name: '水下灯',
    icon: '🔦',
    desc: '深海核心装备，决定照明范围。L 键开关。',
    starter: true,
    tiers: [
      { id: 'lamp0', name: '普通灯', price: 0, desc: '照明半径较小。', stats: { light: 120 } },
      { id: 'lamp1', name: '强光灯', price: 1200, desc: '更亮更远。', stats: { light: 175 } },
      { id: 'lamp2', name: '广角灯', price: 5500, desc: '大范围照明。', stats: { light: 240 } },
      { id: 'lamp3', name: '深海灯', price: 20000, parts: 3, desc: '穿透深海的黑暗。', stats: { light: 320 } },
      { id: 'lamp4', name: '超远距离灯', price: 70000, parts: 8, desc: '照亮整片深渊。', stats: { light: 430 } },
    ],
  },
  {
    id: 'sonar',
    name: '声呐',
    icon: '📡',
    desc: 'R 键发出声呐脉冲，短暂显示周围生物。',
    starter: false,
    tiers: [
      { id: 'sonar0', name: '便携声呐', price: 2500, desc: '探测范围 600px。', stats: { sonarRange: 600, sonarCooldown: 8 } },
      { id: 'sonar1', name: '多波束声呐', price: 14000, parts: 2, desc: '探测范围 1000px。', stats: { sonarRange: 1000, sonarCooldown: 6 } },
      { id: 'sonar2', name: '深海相控声呐', price: 55000, parts: 6, desc: '探测范围 1600px。', stats: { sonarRange: 1600, sonarCooldown: 4 } },
    ],
  },
  {
    id: 'detector',
    name: '稀有鱼探测器',
    icon: '🧭',
    desc: '不会直接告诉你鱼在哪，只显示距离与方向。',
    starter: false,
    tiers: [
      { id: 'det0', name: '稀有探测器', price: 9000, parts: 1, desc: '探测稀有及以上物种。', stats: { detectRange: 1400, detectRarity: 2 } },
      { id: 'det1', name: '高灵敏探测器', price: 40000, parts: 5, desc: '探测范围更远。', stats: { detectRange: 2400, detectRarity: 2 } },
      { id: 'det2', name: '传奇物种雷达', price: 120000, parts: 12, desc: '超远距离探测非常稀有及以上物种。', stats: { detectRange: 4000, detectRarity: 3 } },
    ],
  },
  {
    id: 'camera',
    name: '水下相机',
    icon: '📷',
    desc: 'C 键拍摄，部分极稀有物种拍摄即可解锁图鉴。',
    starter: false,
    tiers: [
      { id: 'cam0', name: '防水卡片机', price: 1800, desc: '拍摄距离 220px。', stats: { photoRange: 220, photoCooldown: 2 } },
      { id: 'cam1', name: '专业水下单反', price: 12000, parts: 2, desc: '拍摄距离 340px。', stats: { photoRange: 340, photoCooldown: 1.2 } },
      { id: 'cam2', name: '深海科研相机', price: 48000, parts: 6, desc: '拍摄距离 480px，可在黑暗中成像。', stats: { photoRange: 480, photoCooldown: 0.8 } },
    ],
  },
  {
    id: 'trap',
    name: '鱼笼',
    icon: '🪤',
    desc: 'T 键布置鱼笼，一段时间后回来收取。',
    starter: false,
    tiers: [
      { id: 'trap0', name: '竹制鱼笼', price: 1200, desc: '可同时布置 1 个。', stats: { traps: 1 } },
      { id: 'trap1', name: '金属鱼笼', price: 6000, desc: '可同时布置 2 个。', stats: { traps: 2 } },
      { id: 'trap2', name: '深海诱捕笼', price: 26000, parts: 3, desc: '可同时布置 3 个，捕获更好的鱼。', stats: { traps: 3 } },
    ],
  },
]

export const EQUIP_MAP: Record<EquipCat, EquipCategory> = Object.fromEntries(EQUIPMENT.map((c) => [c.id, c])) as any

export const CONSUMABLES = [
  { id: 'lure', name: '诱鱼器', icon: '✨', price: 180, desc: 'G 键投放，吸引附近鱼类靠近 20 秒，并提高稀有鱼出现率。' },
] as const

export const STAT_LABELS: Partial<Record<keyof EquipStats, [string, (v: number) => string]>> = {
  maxDepth: ['最大深度', (v) => `${v}m`],
  hp: ['耐久', (v) => `${v}`],
  stealth: ['隐蔽', (v) => `${Math.round(v * 100)}%`],
  thermal: ['温控', (v) => (v >= 2 ? '极寒+高温' : '极寒')],
  vision: ['视野加成', (v) => `+${v}`],
  rareFind: ['稀有发现', (v) => `+${Math.round(v * 100)}%`],
  speed: ['游速', (v) => `${v}`],
  turn: ['转向', (v) => `${v}`],
  sprint: ['冲刺速度', (v) => `${v}`],
  currentResist: ['抗洋流', (v) => `Lv.${v}`],
  netRange: ['范围', (v) => `${v}`],
  netCooldown: ['挥网间隔', (v) => `${v}s`],
  netPower: ['捕获能力', (v) => `${Math.round(v * 100)}%`],
  netClass: ['可捕体型', (v) => ['', '<30cm', '<1m', '<2.5m', '<6m', '任意'][v]],
  netMulti: ['单次最多', (v) => `${v} 条`],
  capacity: ['容量', (v) => `${v}`],
  light: ['照明', (v) => `${v}`],
  sonarRange: ['声呐范围', (v) => `${v}`],
  sonarCooldown: ['冷却', (v) => `${v}s`],
  detectRange: ['探测距离', (v) => `${v}`],
  detectRarity: ['探测等级', (v) => (v >= 3 ? '非常稀有+' : '稀有+')],
  photoRange: ['拍摄距离', (v) => `${v}`],
  photoCooldown: ['冷却', (v) => `${v}s`],
  traps: ['鱼笼数量', (v) => `${v}`],
}
