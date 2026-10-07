import { EQUIPMENT, type EquipCat, type EquipStats } from '../../data/equipment/equipment'
import { save } from '../../store/state'

export interface PlayerStats {
  maxDepth: number
  hp: number
  stealth: number
  thermal: number
  vision: number
  rareFind: number
  speed: number
  turn: number
  sprint: number
  currentResist: number
  netRange: number
  netCooldown: number
  netPower: number
  netClass: number
  netMulti: number
  capacity: number
  light: number
  sonarRange: number
  sonarCooldown: number
  detectRange: number
  detectRarity: number
  photoRange: number
  photoCooldown: number
  traps: number
  tiers: Record<EquipCat, number>
}

export function computeStats(): PlayerStats {
  const s: PlayerStats = {
    maxDepth: 60,
    hp: 100,
    stealth: 0,
    thermal: 0,
    vision: 0,
    rareFind: 0,
    speed: 120,
    turn: 5,
    sprint: 0,
    currentResist: 0,
    netRange: 60,
    netCooldown: 0.7,
    netPower: 0.7,
    netClass: 2,
    netMulti: 1,
    capacity: 10,
    light: 0,
    sonarRange: 0,
    sonarCooldown: 0,
    detectRange: 0,
    detectRarity: 9,
    photoRange: 0,
    photoCooldown: 0,
    traps: 0,
    tiers: { ...save.equipment },
  }
  for (const cat of EQUIPMENT) {
    const t = save.equipment[cat.id]
    if (t == null || t < 0) continue
    const tier = cat.tiers[Math.min(t, cat.tiers.length - 1)]
    for (const [k, v] of Object.entries(tier.stats) as [keyof EquipStats, number][]) {
      if (k === 'stealth') s.stealth += v
      else (s as any)[k] = v
    }
  }
  if (s.sprint === 0) s.sprint = s.speed * 1.45
  s.stealth = Math.min(0.6, s.stealth)
  return s
}
