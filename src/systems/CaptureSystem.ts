import type { Game } from '../game/core/Game'
import type { Fish } from '../game/fish/Fish'
import { sizeClass, FISH_MAP } from '../data/fish'
import type { FishSpecies } from '../data/fish/types'
import { save, toast, bagCapacity, type CaughtFish } from '../store/state'
import { EncyclopediaSystem } from './EncyclopediaSystem'
import { ProgressSystem } from './ProgressSystem'
import { QUALITY_NAMES } from './EconomySystem'
import { audio } from '../game/core/audio'
import { clamp } from '../game/core/rng'
import { candidates } from '../game/biome/Biome'
import { weightedPick } from '../game/core/rng'
import { FishManager } from '../game/fish/Fish'
import { yToDepth } from '../game/core/constants'

let uidN = Date.now() % 100000

function angleDiff(a: number, b: number) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return Math.abs(d)
}

export class CaptureSystem {
  g: Game
  private warnCd = 0
  constructor(g: Game) {
    this.g = g
  }

  addToBag(sp: FishSpecies, size: number, quality: number, how: 'catch' | 'trap'): boolean {
    const g = this.g
    if (save.bag.length >= bagCapacity()) return false
    const cf: CaughtFish = {
      uid: `f${uidN++}`,
      speciesId: sp.id,
      size,
      weight: Math.round(0.000012 * Math.pow(size, 3) * (sp.art.shape === 'eel' || sp.art.shape === 'ribbon' ? 0.15 : 1) * 1000) / 1000,
      quality,
      regionId: g.regionId,
      depth: Math.round(g.depth),
      time: save.totalMinutes,
    }
    save.bag.push(cf)
    save.stats.fishCaught++
    ProgressSystem.unlock('first_fish')
    if (quality >= 4) ProgressSystem.unlock('record')
    const res = EncyclopediaSystem.register(sp, size, how, g.regionName, g.depth)
    if (!res.isNew) toast(`✨ 捕获成功！${sp.commonName} ${size}cm · ${QUALITY_NAMES[quality]}`, quality >= 3 ? 'record' : 'good', 2200)
    else g.slowmo = 0.9
    return true
  }

  swing() {
    const g = this.g
    const p = g.player
    const s = g.stats
    if (p.netCd > 0 || p.stunT > 0) return
    p.netCd = s.netCooldown
    p.swingT = 0.28
    audio.sfx('swing')
    const full = save.bag.length >= bagCapacity()
    const aim = Math.atan2(p.aimY, p.aimX)
    const range = s.netRange
    const targets: { f: Fish; d: number }[] = []
    for (const f of g.fish.fish) {
      if (f.dying > 0 || f.dead) continue
      const dx = f.x - p.x
      const dy = f.y - p.y
      const d = Math.hypot(dx, dy) - Math.min(f.halfLen * 0.5, 40)
      if (d > range) continue
      if (d > 18 && angleDiff(Math.atan2(dy, dx), aim) > 1.0) continue
      targets.push({ f, d: Math.max(0, d) })
    }
    targets.sort((a, b) => a.d - b.d)
    let caught = 0
    let msg = ''
    for (const { f, d } of targets) {
      if (caught >= s.netMulti) break
      const sp = f.sp
      if (sp.photoOnly) {
        msg = `${EncyclopediaSystem.isDiscovered(sp.id) ? sp.commonName : '这种生物'}无法用网捕获，试试用相机拍摄（C）`
        f.scare(p.x, p.y)
        continue
      }
      if (sizeClass(f.size) > s.netClass) {
        msg = '网太小了！需要更大的捕捞网'
        f.scare(p.x, p.y)
        continue
      }
      if (full) {
        msg = '背包已满！返回船上出售鱼获'
        break
      }
      const diffMod = clamp(1.12 - (sp.captureDifficulty - 1) * 0.075 + s.tiers.net * 0.035, 0.12, 1.05)
      const distMod = 1 - 0.35 * (d / range)
      const alertMod = f.state === 'flee' ? 0.5 : f.alert > 0.3 ? 0.75 : f.state === 'rest' ? 1.15 : 1
      const camoMod = f.camo && !f.revealed ? 0.6 : 1
      const prob = clamp(s.netPower * diffMod * distMod * alertMod * camoMod, 0.03, 0.98)
      if (Math.random() < prob) {
        if (this.addToBag(sp, f.size, f.quality, 'catch')) {
          f.catchAnim()
          g.fx.sparkle(f.x, f.y, f.quality >= 4 ? 30 : 14, f.quality >= 4 ? 0xffd84a : 0xbff4ff)
          caught++
        }
      } else {
        f.scare(p.x, p.y)
        msg = `差一点！${EncyclopediaSystem.isDiscovered(sp.id) ? sp.commonName : '鱼'}逃走了`
      }
    }
    if (caught > 0) audio.sfx('catch')
    else if (msg && this.warnCd <= 0) {
      toast(msg, 'warn', 1800)
      audio.sfx('fail')
    }
    if (caught === 0 && msg) this.warnCd = 0.8
    if (full && targets.length && !msg) toast('背包已满！返回船上出售鱼获', 'warn')
  }

  update(dt: number) {
    this.warnCd -= dt
  }

  photo() {
    const g = this.g
    const p = g.player
    const s = g.stats
    if (s.tiers.camera < 0) {
      toast('需要先在装备商店购买水下相机', 'warn')
      return
    }
    if (g.photoCd > 0) return
    g.photoCd = s.photoCooldown
    g.flash = 0.6
    audio.sfx('photo')
    const aim = Math.atan2(p.aimY, p.aimX)
    const seen = new Set<string>()
    let newCount = 0
    let any = 0
    const lightR = g.lightRadius
    for (const f of g.fish.fish) {
      if (f.dying > 0) continue
      const dx = f.x - p.x
      const dy = f.y - p.y
      const d = Math.hypot(dx, dy)
      if (d > s.photoRange) continue
      if (d > 30 && angleDiff(Math.atan2(dy, dx), aim) > 0.7) continue
      const visible = g.darkAlpha < 0.5 || d < lightR * 1.05 || !!f.sp.glow || s.tiers.camera >= 2
      if (!visible) continue
      if (f.camo && !f.revealed) f.revealed = true
      if (seen.has(f.sp.id)) continue
      seen.add(f.sp.id)
      any++
      const e = save.encyclopedia[f.sp.id]
      if (!e || !e.photographed) {
        const res = EncyclopediaSystem.register(f.sp, f.size, 'photo', g.regionName, g.depth)
        if (res.isNew) g.slowmo = 0.9
        newCount++
      }
    }
    if (newCount > 0) toast(`📷 拍摄记录：${newCount} 种鱼类已存档`, 'good')
    else if (any > 0) toast('📷 照片已保存（无新记录）', 'info', 1500)
    else toast('📷 画面中没有鱼', 'info', 1200)
    ProgressSystem.checkSpecies()
  }

  placeTrap() {
    const g = this.g
    const p = g.player
    const s = g.stats
    if (s.tiers.trap < 0) {
      toast('需要先在装备商店购买鱼笼', 'warn')
      return
    }
    if (g.interior) {
      toast('无法在这里布置鱼笼', 'warn')
      return
    }
    if (save.traps.length >= s.traps) {
      toast(`最多同时布置 ${s.traps} 个鱼笼`, 'warn')
      return
    }
    const fy = g.space.floorY(p.x)
    if (fy - p.y > 90) {
      toast('需要靠近海底才能布置鱼笼', 'warn')
      return
    }
    save.traps.push({ id: `trap${Date.now()}`, x: p.x, y: fy, placedAt: save.totalMinutes, regionId: g.regionId, depth: Math.round(yToDepth(fy)), tier: s.tiers.trap })
    audio.sfx('interact')
    toast('🪤 鱼笼已布置，过一段时间再来收取', 'good')
  }

  collectTrap(id: string) {
    const g = this.g
    const i = save.traps.findIndex((t) => t.id === id)
    if (i < 0) return
    const t = save.traps[i]
    const elapsed = save.totalMinutes - t.placedAt
    if (elapsed < 60) {
      toast(`鱼笼还是空的，再等等吧（约 ${Math.ceil((60 - elapsed) / 2)} 秒）`, 'info')
      return
    }
    const ctx = g.spawn.context(t.x, t.y - 10, { nearFloor: true })
    const list = candidates(ctx, { allowPhoto: false }).filter((c) => sizeClass(c.sp.size.max * 0.8) <= 2 + t.tier)
    const n = Math.min(2 + t.tier * 2, 1 + Math.floor(elapsed / 90))
    let got = 0
    for (let k = 0; k < n; k++) {
      const c = weightedPick(Math.random, list, (c) => c.w)
      if (!c) break
      const r = FishManager.rollSize(c.sp, t.tier * 0.1)
      if (!this.addToBag(c.sp, r.size, r.quality, 'trap')) {
        toast('背包已满，部分鱼获被放生', 'warn')
        break
      }
      got++
    }
    save.traps.splice(i, 1)
    audio.sfx('chest')
    toast(got ? `🪤 收取鱼笼：获得 ${got} 条鱼` : '🪤 鱼笼里什么也没有', got ? 'good' : 'info')
  }
}

export { FISH_MAP }
