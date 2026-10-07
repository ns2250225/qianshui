// 海洋随机事件
import { Container, Sprite } from 'pixi.js'
import type { Game } from '../core/Game'
import { tex } from '../core/tex'
import * as Art from '../world/Art'
import { save, ui, toast } from '../../store/state'
import { audio } from '../core/audio'
import { ProgressSystem } from '../../systems/ProgressSystem'
import { yToDepth, depthToY } from '../core/constants'
import { weightedPick, pick } from '../core/rng'
import { candidates } from '../biome/Biome'
import { FISH } from '../../data/fish'

interface EvCtx {
  depth: number
  night: boolean
  nearFloor: boolean
  nearVent: boolean
  polar: boolean
}

interface EventDef {
  id: string
  name: string
  icon: string
  desc: string
  duration: number
  weight(c: EvCtx): number
  start(g: Game, ev: ActiveEvent): void
  update?(g: Game, ev: ActiveEvent, dt: number): void
  end?(g: Game, ev: ActiveEvent): void
}

interface ActiveEvent {
  def: EventDef
  t: number
  data: any
}

interface Jelly {
  s: Sprite
  glow: Sprite
  x: number
  y: number
  vx: number
  t: number
  hitCd: number
}

interface Swimmer {
  s: Sprite
  x: number
  y: number
  vx: number
  t: number
  kind: 'whale' | 'dolphin'
  baseY: number
}

const EVENTS: EventDef[] = [
  {
    id: 'sardine_storm',
    name: '沙丁鱼风暴',
    icon: '🌀',
    desc: '成千上万的小鱼汇聚成巨大的鱼群！',
    duration: 50,
    weight: (c) => (c.depth < 150 ? 2.2 : 0),
    start(g, ev) {
      const p = g.player
      const ctx = g.spawn.context(p.x, p.y)
      const list = candidates(ctx).filter((c) => c.sp.school && c.sp.size.max <= 40 && !c.sp.habitat.every((h) => h === 'benthic'))
      const c = weightedPick(Math.random, list, (c) => c.w)
      const sp = c?.sp ?? FISH.find((f) => f.id === 'sardinella_gibbosa')!
      const dir = Math.random() < 0.5 ? 1 : -1
      const x = p.x - dir * (g.viewW / 2 + 200)
      const y = Math.max(p.y, 60)
      const s = g.fish.spawnSchool(sp, x, Math.min(y, g.space.floorY(x) - 60), 160 + Math.floor(Math.random() * 60), g.space)
      s.forcedVX = dir * 60
      setTimeout(() => (s.forcedVX = 0), 12000)
      ProgressSystem.unlock('super_school')
    },
  },
  {
    id: 'jellyfish',
    name: '水母群',
    icon: '🪼',
    desc: '一大群水母漂流而来，小心不要被蛰到。',
    duration: 45,
    weight: (c) => (c.depth < 1200 ? 2 : 0),
    start(g, ev) {
      ev.data.jellies = [] as Jelly[]
      const color = pick(Math.random, [0xff9ad0, 0x9ad0ff, 0xd0a0ff, 0xffd0a0])
      for (let i = 0; i < 26; i++) {
        const s = new Sprite(tex(Art.jellyfish(color, 0)))
        s.anchor.set(0.5)
        s.scale.set(2)
        g.layers.fish.addChild(s)
        const glow = new Sprite(tex(Art.glowTex(), true))
        glow.anchor.set(0.5)
        glow.tint = color
        glow.blendMode = 'add'
        glow.scale.set(0.6)
        g.layers.glow.addChild(glow)
        const side = Math.random() < 0.5 ? -1 : 1
        const x = g.player.x + side * (g.viewW / 2 + Math.random() * 400)
        const y = Math.max(30, g.player.y + (Math.random() - 0.5) * g.viewH)
        ev.data.jellies.push({ s, glow, x, y, vx: -side * (10 + Math.random() * 15), t: Math.random() * 5, hitCd: 0, color })
      }
    },
    update(g, ev, dt) {
      for (const j of ev.data.jellies as Jelly[]) {
        j.t += dt
        j.x += j.vx * dt
        j.y += Math.sin(j.t * 1.5) * 14 * dt
        j.y = Math.min(j.y, g.space.floorY(j.x) - 20)
        j.y = Math.max(j.y, 12)
        j.s.texture = tex(Art.jellyfish((j as any).color, Math.floor(j.t * 1.5) % 2))
        j.s.position.set(j.x, j.y)
        j.glow.position.set(j.x, j.y - 4)
        j.glow.alpha = 0.4 + 0.2 * Math.sin(j.t * 3)
        j.hitCd -= dt
        const d = Math.hypot(g.player.x - j.x, g.player.y - j.y)
        if (d < 22 && j.hitCd <= 0) {
          j.hitCd = 2
          g.hurtPlayer(7, j.x, j.y, '被水母蛰了！')
        }
      }
    },
    end(g, ev) {
      for (const j of ev.data.jellies as Jelly[]) {
        j.s.destroy()
        j.glow.destroy()
      }
    },
  },
  {
    id: 'migration',
    name: '大型鱼群迁徙',
    icon: '🐟',
    desc: '一支大型鱼群正在迁徙，从你身边呼啸而过。',
    duration: 40,
    weight: (c) => (c.depth < 500 ? 1.6 : 0),
    start(g) {
      const p = g.player
      const ctx = g.spawn.context(p.x, p.y)
      const list = candidates(ctx).filter((c) => c.sp.school && c.sp.size.max >= 40)
      const c = weightedPick(Math.random, list, (c) => c.w)
      if (!c) return
      const dir = Math.random() < 0.5 ? 1 : -1
      const x = p.x - dir * (g.viewW / 2 + 260)
      const s = g.fish.spawnSchool(c.sp, x, Math.min(p.y + 40, g.space.floorY(x) - 60), 24 + Math.floor(Math.random() * 20), g.space)
      s.forcedVX = dir * 140
    },
  },
  {
    id: 'whale',
    name: '鲸鱼经过',
    icon: '🐋',
    desc: '一头巨大的座头鲸缓缓游过，远处传来鲸歌。',
    duration: 40,
    weight: (c) => (c.depth < 700 && !c.nearFloor ? 1.5 : 0),
    start(g, ev) {
      const dir = Math.random() < 0.5 ? 1 : -1
      const s = new Sprite(tex(Art.whale()))
      s.anchor.set(0.5)
      s.scale.set(dir * 3, 3)
      s.alpha = 0.85
      g.layers.back.addChild(s)
      const y = Math.max(140, g.player.y + (Math.random() - 0.5) * 200)
      ev.data.sw = [{ s, x: g.player.x - dir * (g.viewW / 2 + 500), y, baseY: y, vx: dir * 70, t: 0, kind: 'whale' }] as Swimmer[]
      audio.sfx('whale')
      setTimeout(() => audio.sfx('whale'), 4000)
    },
    update: updateSwimmers,
    end: endSwimmers,
  },
  {
    id: 'dolphins',
    name: '海豚群',
    icon: '🐬',
    desc: '一群海豚嬉戏着从身边游过。',
    duration: 30,
    weight: (c) => (c.depth < 80 && !c.polar ? 1.8 : 0),
    start(g, ev) {
      const dir = Math.random() < 0.5 ? 1 : -1
      ev.data.sw = [] as Swimmer[]
      for (let i = 0; i < 6; i++) {
        const s = new Sprite(tex(Art.dolphin(0)))
        s.anchor.set(0.5)
        s.scale.set(dir * 2, 2)
        g.layers.fish.addChild(s)
        const y = Math.max(30, g.player.y - 60 + Math.random() * 120)
        ev.data.sw.push({ s, x: g.player.x - dir * (g.viewW / 2 + 100 + i * 60), y, baseY: y, vx: dir * (220 + Math.random() * 40), t: Math.random() * 3, kind: 'dolphin' })
      }
    },
    update: updateSwimmers,
    end: endSwimmers,
  },
  {
    id: 'shark',
    name: '鲨鱼经过',
    icon: '🦈',
    desc: '一条鲨鱼正在附近巡游……保持距离。',
    duration: 35,
    weight: (c) => (c.depth < 900 ? 1.4 : 0),
    start(g) {
      const p = g.player
      const ctx = g.spawn.context(p.x, p.y)
      const list = candidates(ctx).filter((c) => c.sp.art.shape === 'shark' && c.sp.danger)
      const c = weightedPick(Math.random, list, (c) => c.w)
      if (!c) return
      const x = p.x + (Math.random() < 0.5 ? -1 : 1) * (g.viewW / 2 + 120)
      g.spawn.spawnGroup(x, p.y, ctx, c.sp)
    },
  },
  {
    id: 'upwelling',
    name: '深海生物上浮',
    icon: '🌌',
    desc: '夜色中，深海生物正在向上迁徙觅食。',
    duration: 60,
    weight: (c) => (c.night && c.depth > 30 && c.depth < 1000 ? 2.5 : 0),
    start(g) {
      const p = g.player
      const ctx = g.spawn.context(p.x, p.y, { depth: yToDepth(p.y) + 600 })
      ctx.habitats.add('deep_pelagic')
      const list = candidates(ctx).filter((c) => c.sp.habitat.includes('deep_pelagic'))
      for (let i = 0; i < 4; i++) {
        const c = weightedPick(Math.random, list, (c) => c.w)
        if (!c) break
        const x = p.x + (Math.random() - 0.5) * g.viewW * 1.6
        const y = Math.min(g.space.floorY(x) - 30, p.y + (Math.random() - 0.5) * 300)
        const before = g.fish.fish.length
        g.spawn.spawnGroup(x, y, ctx, c.sp)
        for (let k = before; k < g.fish.fish.length; k++) g.fish.fish[k].minY = 20
      }
    },
  },
  {
    id: 'current',
    name: '洋流变化',
    icon: '🌊',
    desc: '一股强劲的洋流突然涌来！',
    duration: 35,
    weight: (c) => (c.depth > 40 ? 1.5 : 0),
    start(g, ev) {
      g.events.currentOverride = (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 120)
    },
    end(g) {
      g.events.currentOverride = 0
    },
  },
  {
    id: 'volcano',
    name: '海底火山活动',
    icon: '🌋',
    desc: '海底剧烈震动，岩浆碎屑向上喷涌！',
    duration: 14,
    weight: (c) => (c.depth > 700 && c.nearFloor ? 1.2 : 0),
    start(g) {
      audio.sfx('rumble')
      g.shake = 1.2
      for (const f of g.fish.fish) if (Math.hypot(f.x - g.player.x, f.y - g.player.y) < 900) f.scare(g.player.x, g.player.y)
    },
    update(g, ev, dt) {
      g.shake = Math.max(g.shake, 0.4)
      if (Math.random() < dt * 4) {
        const x = g.player.x + (Math.random() - 0.5) * g.viewW
        g.fx.debris(x, g.space.floorY(x), 6)
      }
    },
  },
  {
    id: 'vent_eruption',
    name: '热液喷口喷发',
    icon: '♨️',
    desc: '附近的热液喷口剧烈喷发，喷口生物蜂拥而出。',
    duration: 30,
    weight: (c) => (c.nearVent ? 4 : 0),
    start(g, ev) {
      const p = g.player
      ev.data.vents = g.world.featuresWithin(p.x, p.y, 1600).filter((f) => f.kind === 'vent')
      const ctx = g.spawn.context(p.x, p.y, { nearVent: true, nearFloor: true })
      ctx.habitats.add('vent')
      for (let i = 0; i < 3; i++) {
        const sp = g.spawn.pick(ctx)
        if (sp) g.spawn.spawnGroup(p.x + (Math.random() - 0.5) * 500, p.y, ctx, sp)
      }
      audio.sfx('rumble')
    },
    update(g, ev, dt) {
      for (const f of ev.data.vents ?? []) for (const v of f.vents ?? []) if (Math.random() < dt * 12) g.fx.smoke(v.x, v.y)
    },
  },
  {
    id: 'wreck_appear',
    name: '沉船出现',
    icon: '⚓',
    desc: '海底泥沙翻涌，露出了一艘从未被发现的沉船！',
    duration: 5,
    weight: (c) => (c.depth > 15 && c.depth < 3000 && c.nearFloor ? 0.8 : 0),
    start(g) {
      const x = g.player.x + (Math.random() < 0.5 ? -1 : 1) * (400 + Math.random() * 300)
      save.dynamicWrecks.push({ id: `dwreck:${Math.floor(x)}:${Date.now() % 100000}`, x, kind: 'wreck' })
      if (save.dynamicWrecks.length > 30) save.dynamicWrecks.shift()
    },
  },
  {
    id: 'night_activity',
    name: '夜间鱼类活动',
    icon: '🌙',
    desc: '夜行性鱼类纷纷离开藏身处开始觅食。',
    duration: 60,
    weight: (c) => (c.night && c.depth < 200 ? 2 : 0),
    start(g) {
      const p = g.player
      const ctx = g.spawn.context(p.x, p.y)
      for (let i = 0; i < 4; i++) {
        const sp = g.spawn.pick(ctx, (s) => s.active === 'night')
        if (sp) g.spawn.spawnGroup(p.x + (Math.random() - 0.5) * g.viewW, p.y + (Math.random() - 0.5) * 200, ctx, sp)
      }
    },
  },
  {
    id: 'rare_migration',
    name: '稀有鱼迁徙',
    icon: '✨',
    desc: '感觉附近出现了不寻常的生物……稀有鱼出现率大幅提升！',
    duration: 60,
    weight: () => 0.9,
    start(g) {
      g.events.rareBoost += 1.5
      const p = g.player
      const ctx = g.spawn.context(p.x, p.y)
      const sp = g.spawn.pick(ctx, (s) => ['rare', 'epic', 'legendary', 'mythic'].includes(s.rarity))
      if (sp) g.spawn.spawnGroup(p.x + (Math.random() < 0.5 ? -1 : 1) * (g.viewW / 2 + 100), p.y, ctx, sp)
    },
    end(g) {
      g.events.rareBoost = Math.max(0, g.events.rareBoost - 1.5)
    },
  },
  {
    id: 'whale_fall',
    name: '鲸落',
    icon: '🐋',
    desc: '附近的海底似乎躺着一头巨鲸的遗骸……',
    duration: 5,
    weight: (c) => (c.depth > 1000 && c.nearFloor ? 0.25 : 0),
    start(g) {
      const x = g.player.x + (Math.random() < 0.5 ? -1 : 1) * (500 + Math.random() * 400)
      save.dynamicWrecks.push({ id: `dwf:${Math.floor(x)}`, x, kind: 'whalefall' })
    },
  },
]

function updateSwimmers(g: Game, ev: ActiveEvent, dt: number) {
  for (const s of ev.data.sw as Swimmer[]) {
    s.t += dt
    s.x += s.vx * dt
    if (s.kind === 'dolphin') {
      s.y = s.baseY + Math.sin(s.t * 3) * 30
      s.s.texture = tex(Art.dolphin(Math.floor(s.t * 4) % 2))
      s.s.rotation = Math.cos(s.t * 3) * 0.3 * Math.sign(s.vx)
    } else {
      s.y = s.baseY + Math.sin(s.t * 0.5) * 20
    }
    s.s.position.set(s.x, s.y)
  }
}
function endSwimmers(g: Game, ev: ActiveEvent) {
  for (const s of ev.data.sw as Swimmer[]) s.s.destroy()
}

export class EventSystem {
  g: Game
  active: ActiveEvent[] = []
  timer = 35
  rareBoost = 0
  currentOverride = 0

  constructor(g: Game) {
    this.g = g
  }

  update(dt: number) {
    const g = this.g
    for (let i = this.active.length - 1; i >= 0; i--) {
      const ev = this.active[i]
      ev.t += dt
      ev.def.update?.(g, ev, dt)
      if (ev.t >= ev.def.duration) {
        ev.def.end?.(g, ev)
        this.active.splice(i, 1)
      }
    }
    if (g.mode !== 'diving' || g.interior) return
    this.timer -= dt
    if (this.timer <= 0) {
      this.timer = 50 + Math.random() * 60
      this.roll()
    }
  }

  roll() {
    const g = this.g
    const p = g.player
    const depth = yToDepth(p.y)
    const nearVent = g.world.featuresWithin(p.x, p.y, 1400).some((f) => f.kind === 'vent')
    const c: EvCtx = { depth, night: g.env.isNight, nearFloor: g.space.floorY(p.x) - p.y < 260, nearVent, polar: g.region.temp === 'polar' }
    const avail = EVENTS.filter((e) => !this.active.some((a) => a.def.id === e.id))
    const def = weightedPick(Math.random, avail, (e) => e.weight(c))
    if (!def) return
    this.trigger(def.id)
  }

  trigger(id: string) {
    const def = EVENTS.find((e) => e.id === id)
    if (!def) return
    const ev: ActiveEvent = { def, t: 0, data: {} }
    def.start(this.g, ev)
    this.active.push(ev)
    save.stats.eventsSeen++
    ui.banner = { title: def.name, desc: def.desc, icon: def.icon, until: performance.now() + 4500 }
    audio.sfx('event')
  }

  clearAll() {
    for (const ev of this.active) ev.def.end?.(this.g, ev)
    this.active = []
    this.rareBoost = 0
    this.currentOverride = 0
  }
}

export { depthToY, toast }
