import { FISH, FISH_MAP, rarityIndex, type FishSpecies } from '../data/fish'
import { save, ui, toast } from '../store/state'
import { ProgressSystem } from './ProgressSystem'
import { audio } from '../game/core/audio'
import { FAMILIES } from '../data/fish/families'

const REWARD_MONEY = [60, 200, 800, 3000, 10000, 25000]
const REWARD_POINTS = [20, 50, 120, 300, 800, 2000]

export interface RegisterResult {
  isNew: boolean
  record: boolean
}

export const EncyclopediaSystem = {
  isDiscovered(id: string) {
    return !!save.encyclopedia[id]
  },

  register(sp: FishSpecies, size: number, how: 'catch' | 'photo' | 'trap', regionName: string, depth: number): RegisterResult {
    let e = save.encyclopedia[sp.id]
    const isNew = !e
    let record = false
    if (!e) {
      e = save.encyclopedia[sp.id] = {
        caught: 0,
        photographed: false,
        maxSize: 0,
        firstFound: { region: regionName, depth: Math.round(depth), day: Math.floor(save.totalMinutes / 1440) + 1, how },
        firstTs: Date.now(),
      }
    }
    if (how === 'photo') {
      if (!e.photographed) {
        e.photographed = true
        save.stats.photos++
      }
    } else {
      e.caught++
      if (size > e.maxSize) {
        if (e.maxSize > 0) record = true
        e.maxSize = Math.round(size * 10) / 10
      }
    }
    if (isNew) {
      const ri = rarityIndex(sp.rarity)
      const factor = how === 'photo' && !sp.photoOnly ? 0.6 : 1
      const money = Math.round(REWARD_MONEY[ri] * factor)
      const points = Math.round(REWARD_POINTS[ri] * factor)
      save.money += money
      save.stats.totalEarned += money
      ProgressSystem.addResearch(points)
      ui.newSpecies.push({ speciesId: sp.id, how, reward: money, points })
      audio.sfx('newspecies')
      if (ri >= 4) ProgressSystem.unlock('miracle')
      ProgressSystem.checkSpecies()
      ProgressSystem.checkMoney()
    } else if (record) {
      toast(`🏆 个人最大记录！${sp.commonName} ${e.maxSize}cm`, 'record', 3000)
      ProgressSystem.addResearch(10)
      save.stats.records++
    }
    return { isNew, record }
  },

  totalDB() {
    return FISH.length
  },

  get(id: string) {
    return FISH_MAP[id]
  },

  familyCount() {
    return Object.keys(FAMILIES).length
  },
}
