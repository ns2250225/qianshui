import { ACHIEVEMENTS } from '../data/progress'
import { levelOf } from '../data/progress'
import { save, ui, toast } from '../store/state'
import { audio } from '../game/core/audio'

export const ProgressSystem = {
  addResearch(points: number, reason?: string) {
    if (points <= 0) return
    const before = levelOf(save.research).index
    save.research += Math.round(points)
    const after = levelOf(save.research)
    if (reason) toast(`+${Math.round(points)} 图鉴点 · ${reason}`, 'good', 2200)
    if (after.index > before) {
      toast(`🎉 探索等级提升：Lv.${after.level} ${after.name}`, 'record', 4000)
      audio.sfx('levelup')
    }
  },

  unlock(id: string) {
    if (save.achievements[id]) return
    const def = ACHIEVEMENTS.find((a) => a.id === id)
    if (!def) return
    save.achievements[id] = Date.now()
    save.money += def.reward
    ui.achievementPop = { name: def.name, icon: def.icon, until: performance.now() + 3500 }
    toast(`🏅 成就解锁：${def.name}  +$${def.reward.toLocaleString()}`, 'record', 4000)
    audio.sfx('achievement')
  },

  discoveredCount(): number {
    return Object.keys(save.encyclopedia).length
  },

  checkSpecies() {
    const n = this.discoveredCount()
    if (n >= 10) this.unlock('species_10')
    if (n >= 50) this.unlock('species_50')
    if (n >= 100) this.unlock('species_100')
    if (n >= 200) this.unlock('species_200')
    if (n >= 1000) this.unlock('species_1000')
    if (n >= 5000) this.unlock('species_5000')
    const photos = Object.values(save.encyclopedia).filter((e) => e.photographed).length
    if (photos >= 10) this.unlock('photo_10')
  },

  checkDepth(d: number) {
    if (d > save.stats.maxDepth) save.stats.maxDepth = Math.round(d)
    if (d >= 200) this.unlock('depth_200')
    if (d >= 1000) this.unlock('depth_1000')
    if (d >= 4000) this.unlock('depth_4000')
    if (d >= 6000) this.unlock('depth_6000')
    if (d >= 10800) this.unlock('depth_trench')
  },

  checkMoney() {
    if (save.stats.totalEarned >= 100000) this.unlock('rich')
  },

  checkRegions() {
    if (Object.keys(save.regionsFound).length >= 11) this.unlock('all_regions')
  },
}
