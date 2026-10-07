import { reactive } from 'vue'
import type { EquipCat } from '../data/equipment/equipment'
import { EQUIPMENT } from '../data/equipment/equipment'

export interface CaughtFish {
  uid: string
  speciesId: string
  size: number // cm
  weight: number // kg
  quality: number // 0-4
  regionId: string
  depth: number
  time: number
}

export interface EncEntry {
  caught: number
  photographed: boolean
  maxSize: number
  firstFound: { region: string; depth: number; day: number; how: 'catch' | 'photo' | 'trap' }
  firstTs: number
}

export interface MapMarker {
  id: string
  x: number
  y: number
  type: string
  label?: string
}

export interface FeatureRecord {
  id: string
  kind: string
  name: string
  x: number
  y: number
}

export interface TrapRecord {
  id: string
  x: number
  y: number
  placedAt: number // 游戏总分钟
  regionId: string
  depth: number
  tier: number
}

export interface SaveData {
  version: number
  seed: number
  money: number
  research: number
  parts: number
  lures: number
  equipment: Record<EquipCat, number>
  encyclopedia: Record<string, EncEntry>
  bag: CaughtFish[]
  explored: Record<string, 1>
  features: Record<string, FeatureRecord>
  markers: MapMarker[]
  achievements: Record<string, number>
  collectibles: Record<string, number>
  looted: Record<string, 1>
  regionsFound: Record<string, 1>
  traps: TrapRecord[]
  dynamicWrecks: { id: string; x: number; kind?: string }[]
  totalMinutes: number
  boatX: number
  market: { day: number; mods: Record<string, number>; sold: Record<string, number> }
  stats: {
    dives: number
    maxDepth: number
    fishCaught: number
    totalEarned: number
    eventsSeen: number
    photos: number
    records: number
  }
  settings: { music: number; sfx: number; mute: boolean; showFps: boolean; lampOn: boolean; encyclopediaSpoilers: boolean; godMode: boolean }
}

export function defaultEquipment(): Record<EquipCat, number> {
  const e = {} as Record<EquipCat, number>
  for (const c of EQUIPMENT) e[c.id] = c.starter ? 0 : -1
  return e
}

export function newSave(): SaveData {
  return {
    version: 1,
    seed: Math.floor(Math.random() * 1e9),
    money: 100,
    research: 0,
    parts: 0,
    lures: 1,
    equipment: defaultEquipment(),
    encyclopedia: {},
    bag: [],
    explored: {},
    features: {},
    markers: [],
    achievements: {},
    collectibles: {},
    looted: {},
    regionsFound: {},
    traps: [],
    dynamicWrecks: [],
    totalMinutes: 8 * 60,
    boatX: 0,
    market: { day: -1, mods: {}, sold: {} },
    stats: { dives: 0, maxDepth: 0, fishCaught: 0, totalEarned: 0, eventsSeen: 0, photos: 0, records: 0 },
    settings: { music: 0.6, sfx: 0.8, mute: false, showFps: false, lampOn: true, encyclopediaSpoilers: false, godMode: false },
  }
}

/** 合并旧存档，补齐缺失字段 */
export function normalizeSave(raw: any): SaveData {
  const base = newSave()
  const s = { ...base, ...(raw || {}) } as SaveData
  s.equipment = { ...base.equipment, ...(raw?.equipment || {}) }
  s.stats = { ...base.stats, ...(raw?.stats || {}) }
  s.settings = { ...base.settings, ...(raw?.settings || {}) }
  s.market = { ...base.market, ...(raw?.market || {}) }
  for (const k of ['encyclopedia', 'explored', 'features', 'achievements', 'collectibles', 'looted', 'regionsFound'] as const) {
    if (typeof (s as any)[k] !== 'object' || Array.isArray((s as any)[k])) (s as any)[k] = {}
  }
  for (const k of ['bag', 'markers', 'traps', 'dynamicWrecks'] as const) {
    if (!Array.isArray((s as any)[k])) (s as any)[k] = []
  }
  return s
}

export type Panel = null | 'shop' | 'sell' | 'encyclopedia' | 'bag' | 'map' | 'achievements' | 'settings' | 'collection'

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'good' | 'warn' | 'bad' | 'record'
}

export interface NewSpeciesInfo {
  speciesId: string
  how: 'catch' | 'photo' | 'trap'
  reward: number
  points: number
}

export const save = reactive<SaveData>(newSave())

export const ui = reactive({
  loaded: false,
  mode: 'boat' as 'boat' | 'jumping' | 'diving' | 'interior' | 'traveling',
  panel: null as Panel,
  encyclopediaFocus: null as string | null,
  hud: {
    depth: 0,
    x: 0,
    regionName: '',
    regionId: '',
    zoneName: '海面',
    hp: 100,
    maxHp: 100,
    timeText: '08:00',
    phase: '白天',
    weather: '晴天',
    weatherIcon: '☀️',
    warning: '',
    hint: '',
    sonarCd: 0,
    sonarReady: false,
    cameraCd: 0,
    hasSonar: false,
    hasCamera: false,
    hasThruster: false,
    hasTrap: false,
    lampOn: true,
    detector: null as null | { text: string; dist: number; dir: string },
    fps: 0,
    current: 0,
    stunned: false,
    temp: '',
  },
  toasts: [] as Toast[],
  newSpecies: [] as NewSpeciesInfo[],
  banner: null as null | { title: string; desc: string; icon: string; until: number },
  achievementPop: null as null | { name: string; icon: string; until: number },
  fade: 0,
  isTouch: false,
})

let toastId = 1
export function toast(text: string, kind: Toast['kind'] = 'info', ms = 2600) {
  const t = { id: toastId++, text, kind }
  ui.toasts.push(t)
  if (ui.toasts.length > 6) ui.toasts.shift()
  setTimeout(() => {
    const i = ui.toasts.findIndex((x) => x.id === t.id)
    if (i >= 0) ui.toasts.splice(i, 1)
  }, ms)
}

/** 上帝模式：无限金钱和素材 */
export function applyGodMode() {
  if (!save.settings.godMode) return
  if (save.money < 99_999_999) save.money = 99_999_999
  if (save.parts < 9_999) save.parts = 9_999
  if (save.lures < 999) save.lures = 999
}

export function bagCapacity(): number {
  const tier = save.equipment.bag
  return [10, 25, 50, 100, 200][Math.max(0, tier)] ?? 10
}
