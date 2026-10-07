import { FISH, FISH_MAP } from '../data/fish'
import { EQUIP_MAP, CONSUMABLES, type EquipCat } from '../data/equipment/equipment'
import { save, toast, type CaughtFish } from '../store/state'
import { mulberry32, hashSeed } from '../game/core/rng'
import { ProgressSystem } from './ProgressSystem'
import { audio } from '../game/core/audio'

export const QUALITY_NAMES = ['普通', '优秀', '大型', '巨型', '纪录级']
export const QUALITY_COLORS = ['#c8d6e5', '#55efc4', '#74b9ff', '#a29bfe', '#fdcb6e']
const QUALITY_MULT = [1, 1.2, 1.5, 2, 3]

export function qualityOf(sizeFrac: number): number {
  if (sizeFrac >= 0.97) return 4
  if (sizeFrac >= 0.88) return 3
  if (sizeFrac >= 0.7) return 2
  if (sizeFrac >= 0.45) return 1
  return 0
}

export const EconomySystem = {
  currentDay() {
    return Math.floor(save.totalMinutes / 1440)
  },

  ensureMarket() {
    const day = this.currentDay()
    if (save.market.day === day) return
    const rng = mulberry32(hashSeed(save.seed, day, 77))
    const mods: Record<string, number> = {}
    const discovered = Object.keys(save.encyclopedia).filter((id) => FISH_MAP[id] && !FISH_MAP[id].photoOnly)
    const pool = discovered.length >= 6 ? discovered : FISH.filter((f) => f.rarity === 'common' || f.rarity === 'uncommon').map((f) => f.id)
    const picks = new Set<string>()
    let guard = 0
    while (picks.size < Math.min(5, pool.length) && guard++ < 100) picks.add(pool[Math.floor(rng() * pool.length)])
    let i = 0
    for (const id of picks) {
      if (i < 3) mods[id] = Math.round((1.2 + rng() * 0.6) * 100) / 100
      else mods[id] = Math.round((0.6 + rng() * 0.2) * 100) / 100
      i++
    }
    save.market = { day, mods, sold: {} }
  },

  priceOf(f: CaughtFish): number {
    const sp = FISH_MAP[f.speciesId]
    if (!sp) return 0
    const frac = Math.max(0, Math.min(1.1, (f.size - sp.size.min) / Math.max(0.01, sp.size.max - sp.size.min)))
    const mod = save.market.mods[f.speciesId] ?? 1
    return Math.max(1, Math.round(sp.price * (0.75 + 0.5 * frac) * QUALITY_MULT[f.quality] * mod))
  },

  /** 计算出售时的价格（考虑当日市场饱和） */
  quote(list: CaughtFish[]): { lines: { speciesId: string; count: number; total: number }[]; total: number } {
    const sold: Record<string, number> = { ...save.market.sold }
    const map = new Map<string, { speciesId: string; count: number; total: number }>()
    let total = 0
    for (const f of list) {
      const n = sold[f.speciesId] ?? 0
      const sat = Math.max(0.4, 1 - n * 0.03)
      sold[f.speciesId] = n + 1
      const p = Math.round(this.priceOf(f) * sat)
      total += p
      const l = map.get(f.speciesId) ?? { speciesId: f.speciesId, count: 0, total: 0 }
      l.count++
      l.total += p
      map.set(f.speciesId, l)
    }
    return { lines: [...map.values()].sort((a, b) => b.total - a.total), total }
  },

  sellAll(): number {
    if (!save.bag.length) return 0
    this.ensureMarket()
    const q = this.quote(save.bag)
    for (const f of save.bag) save.market.sold[f.speciesId] = (save.market.sold[f.speciesId] ?? 0) + 1
    save.money += q.total
    save.stats.totalEarned += q.total
    save.bag.splice(0, save.bag.length)
    audio.sfx('coin')
    toast(`💰 出售鱼获 +$${q.total.toLocaleString()}`, 'good', 3000)
    ProgressSystem.checkMoney()
    return q.total
  },

  release(uid: string) {
    const i = save.bag.findIndex((f) => f.uid === uid)
    if (i >= 0) {
      save.bag.splice(i, 1)
      ProgressSystem.addResearch(2)
    }
  },

  nextTier(cat: EquipCat) {
    const c = EQUIP_MAP[cat]
    const cur = save.equipment[cat]
    return c.tiers[cur + 1] ?? null
  },

  canBuy(cat: EquipCat): { ok: boolean; reason?: string } {
    const t = this.nextTier(cat)
    if (!t) return { ok: false, reason: '已满级' }
    if (save.money < t.price) return { ok: false, reason: '金币不足' }
    if ((t.parts ?? 0) > save.parts) return { ok: false, reason: '装备零件不足' }
    return { ok: true }
  },

  buy(cat: EquipCat): boolean {
    const chk = this.canBuy(cat)
    const t = this.nextTier(cat)
    if (!chk.ok || !t) {
      toast(chk.reason ?? '无法购买', 'warn')
      audio.sfx('fail')
      return false
    }
    save.money -= t.price
    save.parts -= t.parts ?? 0
    save.equipment[cat]++
    audio.sfx('buy')
    toast(`✅ 已装备：${t.name}`, 'good')
    return true
  },

  buyConsumable(id: string, n = 1): boolean {
    const c = CONSUMABLES.find((x) => x.id === id)
    if (!c) return false
    if (save.money < c.price * n) {
      toast('金币不足', 'warn')
      audio.sfx('fail')
      return false
    }
    save.money -= c.price * n
    if (id === 'lure') save.lures += n
    audio.sfx('buy')
    return true
  },
}
