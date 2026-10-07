import { Application, Container, Graphics, Sprite, Text, TextureSource } from 'pixi.js'
import { World, type Feature } from '../world/World'
import { Interior } from '../world/Interior'
import type { Space } from '../world/Space'
import { FishManager, type Fish, type FishEnv } from '../fish/Fish'
import { Effects } from '../ocean/Effects'
import { Surface } from '../ocean/Surface'
import { Darkness } from '../ocean/Darkness'
import { Env } from '../ocean/Env'
import { Player } from '../player/Player'
import { input, type Action } from './input'
import { audio } from './audio'
import { computeStats, type PlayerStats } from '../equipment/stats'
import { SpawnSystem } from '../../systems/SpawnSystem'
import { CaptureSystem } from '../../systems/CaptureSystem'
import { EventSystem } from '../events/EventSystem'
import { ProgressSystem } from '../../systems/ProgressSystem'
import { EconomySystem } from '../../systems/EconomySystem'
import { SaveSystem } from '../../systems/SaveSystem'
import { save, ui, toast, bagCapacity, applyGodMode } from '../../store/state'
import { depthToY, yToDepth, PX_PER_M_X, CHUNK } from './constants'
import { regionAt, currentAt, floorY } from '../world/Terrain'
import { REGIONS, type RegionDef } from '../../data/regions/regions'
import { zoneMusicFor, zoneNameFor } from '../biome/Biome'
import { clamp, lerp, lerpColor, shade, mulberry32, pick } from './rng'
import { tex } from './tex'
import * as Art from '../world/Art'
import { rarityIndex } from '../../data/fish'
import { EncyclopediaSystem } from '../../systems/EncyclopediaSystem'
import { COLLECTIBLES } from '../../data/progress'

export type GameMode = 'boat' | 'jumping' | 'diving' | 'traveling'

const WATER_STOPS: [number, number][] = [
  [0, 0x2aa6d8],
  [50, 0x1a88c4],
  [200, 0x0f5596],
  [1000, 0x082a58],
  [4000, 0x03142e],
  [11000, 0x01050c],
]

function waterColor(d: number): number {
  for (let i = 1; i < WATER_STOPS.length; i++) {
    if (d <= WATER_STOPS[i][0]) {
      const [d0, c0] = WATER_STOPS[i - 1]
      const [d1, c1] = WATER_STOPS[i]
      return lerpColor(c0, c1, (d - d0) / (d1 - d0))
    }
  }
  return WATER_STOPS[WATER_STOPS.length - 1][1]
}

const QMARK = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..']
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗']

export class Game {
  app!: Application
  layers!: {
    bg: Graphics
    world: Container
    back: Container
    interior: Container
    traps: Container
    fish: Container
    fx: Container
    glow: Container
    lure: Container
    screenFx: Graphics
  }
  world!: World
  interior: Interior | null = null
  fish!: FishManager
  fx!: Effects
  surface!: Surface
  darkness!: Darkness
  env = new Env()
  player = new Player()
  spawn!: SpawnSystem
  capture!: CaptureSystem
  events!: EventSystem
  stats: PlayerStats = computeStats()
  mode: GameMode = 'boat'
  cam = { x: 0, y: -40 }
  zoom = 1
  sw = 800
  sh = 600
  time = 0
  slowmo = 0
  shake = 0
  flash = 0
  hurtFlash = 0
  lightRadius = 120
  darkAlpha = 0
  depth = 0
  region: RegionDef = REGIONS.tropical_coral
  regionId = 'tropical_coral'
  regionName = '热带珊瑚海'
  photoCd = 0
  sonarCd = 0
  sonarT = -1
  sonarG = new Graphics()
  lure: { x: number; y: number; t: number; s: Sprite } | null = null
  jump = { t: 0, x0: 0, y0: 0, x1: 0 }
  returnPos = { x: 0, y: 0 }
  private started = false
  private hudT = 0
  private slowT = 0
  private saveT = 20
  private exploreT = 0
  private detectT = 0
  private warnT = 0
  private hurtMsgT = 0
  private sightT = 0
  private trapSprites = new Map<string, Sprite>()
  private interact: { hint: string; act: () => void } | null = null
  private travelT = 0
  private travelTarget = 0
  private revealToastT = 0
  private prevX = 0
  private prevY = 0
  private fishEnv!: FishEnv
  private floatTexts: { t: Text; life: number }[] = []

  floatText(text: string, x: number, y: number, color = 0xffffff, size = 22) {
    const t = new Text({ text, style: { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: size, fill: color, fontWeight: 'bold', stroke: { color: 0x031020, width: 4 } } })
    t.anchor.set(0.5)
    t.position.set(x, y)
    this.layers.fx.addChild(t)
    this.floatTexts.push({ t, life: 1.4 })
  }

  get space(): Space {
    return this.interior ?? this.world
  }
  get viewW() {
    return this.sw / this.zoom
  }
  get viewH() {
    return this.sh / this.zoom
  }

  async init(el: HTMLElement) {
    if (this.started) return
    this.started = true
    TextureSource.defaultOptions.scaleMode = 'nearest'
    const app = new Application()
    await app.init({ resizeTo: el, background: 0x0a2a4a, antialias: false, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true })
    this.app = app
    el.appendChild(app.canvas)
    const stage = app.stage
    const bg = new Graphics()
    const worldC = new Container()
    const glowC = new Container()
    this.layers = {
      bg,
      world: worldC,
      back: new Container(),
      interior: new Container(),
      traps: new Container(),
      fish: new Container(),
      fx: new Container(),
      glow: glowC,
      lure: new Container(),
      screenFx: new Graphics(),
    }
    this.world = new World(glowC)
    this.world.seed = save.seed
    this.surface = new Surface(worldC)
    this.fx = new Effects(this.layers.fx, glowC)
    this.darkness = new Darkness()
    this.fish = new FishManager(this.layers.fish, glowC)
    stage.addChild(bg, this.surface.far, worldC, this.darkness.root, glowC, this.surface.overlay, this.layers.screenFx)
    worldC.addChild(
      this.fx.rays,
      this.layers.back,
      this.world.root,
      this.layers.interior,
      this.layers.traps,
      this.layers.fish,
      this.player.root,
      this.layers.fx,
      this.surface.boatLayer,
      this.surface.waves,
      this.world.decorFront,
      this.layers.lure,
    )
    glowC.addChild(this.sonarG)
    this.spawn = new SpawnSystem(this)
    this.capture = new CaptureSystem(this)
    this.events = new EventSystem(this)
    this.surface.boatX = save.boatX
    this.fishEnv = {
      px: 0,
      py: 0,
      pvx: 0,
      pvy: 0,
      sprinting: false,
      stealth: 0,
      night: false,
      hidden: false,
      lure: null,
      space: this.world,
      dt: 0,
      time: 0,
      onHit: (f) => this.onFishHit(f),
      onReveal: (f) => this.onReveal(f),
    }
    this.refreshStats()
    this.player.hp = this.player.maxHp
    this.placeOnBoat()
    input.attach()
    input.onAction((a) => this.onAction(a))
    EconomySystem.ensureMarket()
    this.env.rollWeather()
    this.resize()
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('beforeunload', () => {
      save.boatX = this.surface.boatX
      SaveSystem.saveSync()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        save.boatX = this.surface.boatX
        SaveSystem.save()
      }
    })
    app.ticker.add((t) => this.loop(Math.min(0.05, t.deltaMS / 1000)))
  }

  resize() {
    if (!this.app) return
    this.sw = this.app.screen.width
    this.sh = this.app.screen.height
    this.zoom = clamp(Math.min(this.sw, this.sh) / 720, 0.55, 1.6)
  }

  refreshStats() {
    this.stats = computeStats()
    this.player.maxHp = this.stats.hp
    this.player.hp = Math.min(this.player.hp, this.player.maxHp)
    this.player.setSuit(Math.max(0, save.equipment.suit))
  }

  // ─────────────────────────── 输入
  private onAction(a: Action) {
    audio.unlock()
    if (!ui.loaded) return
    if (a === 'escape') {
      if (ui.panel) ui.panel = null
      return
    }
    if (a === 'encyclopedia') {
      ui.panel = ui.panel === 'encyclopedia' ? null : 'encyclopedia'
      return
    }
    if (a === 'bag') {
      ui.panel = ui.panel === 'bag' ? null : 'bag'
      return
    }
    if (a === 'map') {
      ui.panel = ui.panel === 'map' ? null : 'map'
      return
    }
  }

  action(a: Action) {
    input.fire(a)
  }

  // ─────────────────────────── 船 / 跳水
  placeOnBoat() {
    this.mode = 'boat'
    ui.mode = 'boat'
    const p = this.player
    p.standing = true
    p.vx = p.vy = 0
    p.facing = 1
    p.hp = p.maxHp
    p.stunT = 0
    this.followBoat()
    this.cam.x = this.surface.boatX
    this.cam.y = -60
  }

  private followBoat() {
    const p = this.player
    const s = this.surface
    p.x = s.boatX + 40 * Math.sign(s.boat.scale.x || 1)
    p.y = s.boatY - 40
  }

  startJump() {
    if (this.mode !== 'boat' || ui.panel) return
    audio.unlock()
    this.mode = 'jumping'
    ui.mode = 'jumping'
    this.jump = { t: 0, x0: this.player.x, y0: this.player.y, x1: this.player.x + 80 }
    this.player.facing = 1
  }

  private enterWater() {
    const p = this.player
    this.mode = 'diving'
    ui.mode = 'diving'
    p.standing = false
    p.vx = 40
    p.vy = 160
    p.y = 12
    this.fx.splash(p.x, 0, 50)
    this.floatText('扑通！', p.x, -50, 0xffffff, 26)
    audio.sfx('splash')
    save.stats.dives++
    ProgressSystem.unlock('first_dive')
    if (this.env.isNight) ProgressSystem.unlock('night_dive')
    if (this.env.weather.thunder) ProgressSystem.unlock('storm_dive')
    this.spawn.initialFill(8)
  }

  boardBoat() {
    if (save.bag.length >= bagCapacity()) ProgressSystem.unlock('full_bag')
    this.events.clearAll()
    this.lure?.s.destroy()
    this.lure = null
    this.placeOnBoat()
    audio.sfx('interact')
    toast(save.bag.length ? `⛵ 已返回船上，鱼获箱中有 ${save.bag.length} 条鱼` : '⛵ 已返回船上', 'info')
    save.boatX = this.surface.boatX
    SaveSystem.save()
  }

  /** 一键回到船上：小船驶来接应，鱼获不受损失 */
  returnToBoat() {
    if (this.mode !== 'diving') return
    if (this.interior) this.exitInterior(true)
    this.fish.clear()
    this.surface.boatX = this.player.x
    this.surface.boatTargetX = null
    this.world.clearAll()
    ui.fade = 1
    this.boardBoat()
  }

  travelTo(x: number) {
    if (this.mode !== 'boat') {
      toast('需要先回到船上才能航行', 'warn')
      return
    }
    const r = regionAt(x)
    if (r.needThermal && !r.needThermalBelow && this.stats.thermal < r.needThermal) {
      toast(`${r.name}海水过冷，需要「极地保温层」才能前往`, 'warn')
      return
    }
    this.mode = 'traveling'
    ui.mode = 'traveling'
    this.travelT = 0
    this.travelTarget = x
    ui.panel = null
  }

  private emergencyReturn() {
    if (this.interior) this.exitInterior(true)
    const lose = Math.ceil(save.bag.length * 0.35)
    for (let i = 0; i < lose; i++) save.bag.splice(Math.floor(Math.random() * save.bag.length), 1)
    this.player.hp = this.player.maxHp
    this.player.stunT = 0
    this.events.clearAll()
    this.fish.clear()
    ui.fade = 1
    this.placeOnBoat()
    toast(`⚠ 受到大量伤害，已自动紧急返航！${lose ? `损失了 ${lose} 条鱼获` : ''}`, 'bad', 4500)
    SaveSystem.save()
  }

  hurtPlayer(dmg: number, fx: number, fy: number, msg: string) {
    if (this.mode !== 'diving') return
    if (!this.player.hurt(dmg, fx, fy)) return
    audio.sfx('hurt')
    this.shake = Math.max(this.shake, 0.3)
    this.hurtFlash = 0.5
    if (this.hurtMsgT <= 0) {
      toast(msg, 'bad', 1800)
      this.hurtMsgT = 1.5
    }
    if (this.player.hp <= 0) this.emergencyReturn()
  }

  private onFishHit(f: Fish) {
    const d = f.sp.danger ?? 1
    const venom = ['camouflage', 'slow', 'ambush'].includes(f.sp.behavior) && f.sp.art.shape !== 'shark'
    const name = EncyclopediaSystem.isDiscovered(f.sp.id) ? f.sp.commonName : '危险生物'
    this.hurtPlayer(d * 9 + Math.min(12, f.size / 40), f.x, f.y, venom ? `被${name}的毒刺刺中！` : `被${name}撞击！`)
  }

  private onReveal(f: Fish) {
    if (this.revealToastT <= 0) {
      toast('❗ 原来这里有条鱼！', 'info', 1600)
      this.revealToastT = 6
    }
  }

  // ─────────────────────────── 洞穴 / 沉船
  enterInterior(f: Feature) {
    this.events.clearAll()
    this.fish.clear()
    const depth = yToDepth(f.y)
    const region = regionAt(f.x)
    this.returnPos = { x: f.x, y: f.y - 50 }
    this.interior = new Interior(f, depth, region.id, this.layers.glow)
    this.layers.interior.addChild(this.interior.root)
    this.world.setVisible(false)
    const p = this.player
    p.x = this.interior.exit.x + 70
    p.y = this.interior.exit.y
    p.vx = p.vy = 0
    this.cam.x = p.x
    this.cam.y = p.y
    this.fishEnv.space = this.interior
    if (f.kind === 'cave') ProgressSystem.unlock('first_cave')
    this.discoverFeature(f)
    toast(`进入${f.name}`, 'info')
    audio.sfx('interact')
    // 内部鱼类
    const rng = mulberry32(f.seed + Math.floor(save.totalMinutes / 600))
    const n = 7 + Math.floor(rng() * 5)
    for (let i = 0; i < n; i++) {
      const x = 250 + Math.random() * (this.interior.w - 300)
      const y = (this.interior.ceilY(x) + this.interior.floorY(x)) / 2 + (Math.random() - 0.5) * 100
      this.spawn.spawnGroup(x, y, undefined, undefined, 0.6)
    }
    if (rng() < 0.6) {
      const ctx = this.spawn.context(p.x, p.y)
      const sp = this.spawn.pick(ctx, (s) => rarityIndex(s.rarity) >= 2)
      if (sp) this.spawn.spawnGroup(this.interior.w * (0.5 + Math.random() * 0.4), p.y, ctx, sp)
    }
  }

  exitInterior(silent = false) {
    if (!this.interior) return
    this.fish.clear()
    this.interior.destroy()
    this.interior = null
    this.world.setVisible(true)
    this.fishEnv.space = this.world
    const p = this.player
    p.x = this.returnPos.x
    p.y = Math.min(this.returnPos.y, floorY(this.returnPos.x) - 30)
    p.vx = p.vy = 0
    this.cam.x = p.x
    this.cam.y = p.y
    if (!silent) {
      this.spawn.initialFill(6)
      audio.sfx('interact')
    }
  }

  private openChest(c: import('../world/Interior').Chest) {
    const it = this.interior!
    it.openChest(c)
    const rng = Math.random
    const depthMul = 1 + it.depth / 300
    const coins = Math.round((150 + rng() * 350) * depthMul)
    save.money += coins
    save.stats.totalEarned += coins
    const parts: string[] = [`$${coins.toLocaleString()}`]
    if (rng() < (it.isCave ? 0.35 : 0.55)) {
      const n = 1 + (it.depth > 1000 ? 1 : 0) + (rng() < 0.3 ? 1 : 0)
      save.parts += n
      parts.push(`装备零件 ×${n}`)
    }
    if (rng() < 0.38) {
      let pool: string[]
      if (it.isCave) pool = it.depth > 2000 ? ['manganese', 'ammonite', 'pearl'] : ['pearl', 'ammonite', 'bottle']
      else if (it.feature.sub === 'plane') pool = ['propeller', 'compass', 'pocket_watch']
      else if (it.feature.sub === 'wood') pool = ['amphora', 'gold_coin', 'ship_bell', 'spyglass', 'compass']
      else pool = ['pocket_watch', 'ship_bell', 'helmet', 'bottle', 'compass', 'spyglass']
      if (it.regionId === 'hydrothermal') pool.push('black_smoker')
      const id = pick(rng, pool)
      save.collectibles[id] = (save.collectibles[id] ?? 0) + 1
      const def = COLLECTIBLES.find((c) => c.id === id)
      if (def) parts.push(`${def.icon} ${def.name}`)
    }
    audio.sfx('chest')
    toast(`🎁 打开宝箱：${parts.join('，')}`, 'good', 3500)
    ProgressSystem.addResearch(15)
    ProgressSystem.checkMoney()
  }

  private discoverFeature(f: Feature) {
    if (save.features[f.id]) return
    save.features[f.id] = { id: f.id, kind: f.kind, name: f.name, x: Math.round(f.x), y: Math.round(f.y) }
    const xp: Record<string, number> = { wreck: 100, cave: 80, vent: 300, whalefall: 500, abyss: 1500 }
    toast(`📍 发现：${f.name}`, 'good', 3000)
    ProgressSystem.addResearch(xp[f.kind] ?? 50, f.name)
    if (f.kind === 'wreck') ProgressSystem.unlock('first_wreck')
    if (f.kind === 'vent') ProgressSystem.unlock('vent')
    if (f.kind === 'whalefall') ProgressSystem.unlock('whale_fall')
  }

  // ─────────────────────────── 主循环
  private loop(rawDt: number) {
    const paused = !!ui.panel || !ui.loaded
    this.time += rawDt
    if (this.slowmo > 0) {
      this.slowmo -= rawDt
    }
    const dt = paused ? 0 : rawDt * (this.slowmo > 0 ? 0.25 : 1)
    if (ui.fade > 0) ui.fade = Math.max(0, ui.fade - rawDt * 0.8)
    audio.update(rawDt)
    applyGodMode()

    if (!paused) {
      this.env.update(dt, () => this.surface.playThunder())
      this.refreshTimer(rawDt)
      switch (this.mode) {
        case 'boat':
          this.updateBoat(dt)
          break
        case 'jumping':
          this.updateJump(dt)
          break
        case 'diving':
          this.updateDiving(dt)
          break
        case 'traveling':
          this.updateTravel(rawDt)
          break
      }
    }
    input.clearPressed()
    this.render(rawDt, dt)
  }

  private statT = 0
  private refreshTimer(dt: number) {
    this.statT -= dt
    if (this.statT <= 0) {
      this.statT = 0.5
      this.refreshStats()
      applyGodMode()
      EconomySystem.ensureMarket()
      audio.setVolumes(save.settings.music, save.settings.sfx, save.settings.mute)
    }
    this.saveT -= dt
    if (this.saveT <= 0) {
      this.saveT = 20
      save.boatX = this.surface.boatX
      SaveSystem.save()
    }
  }

  private updateBoat(dt: number) {
    this.sightT -= dt
    if (this.sightT <= 0) {
      this.sightT = 0.5
      this.sight(this.surface.boatX)
    }
    if (input.consume('jump')) this.startJump()
    this.cam.x += (this.surface.boatX - this.cam.x) * Math.min(1, dt * 3)
    this.cam.y += (-60 - this.cam.y) * Math.min(1, dt * 3)
    this.updateCommon(dt)
    this.setHint('')
  }

  private updateJump(dt: number) {
    const j = this.jump
    j.t += dt
    const u = Math.min(1, j.t / 0.75)
    const p = this.player
    p.standing = u < 0.3
    p.x = lerp(j.x0, j.x1, u)
    p.y = lerp(j.y0, 14, u) - Math.sin(u * Math.PI) * 60
    p.vx = 100
    p.vy = u > 0.5 ? 300 : -100
    p.draw(0, this.time)
    if (u >= 1) this.enterWater()
    this.cam.x += (p.x - this.cam.x) * Math.min(1, dt * 3)
    this.cam.y += (p.y - this.cam.y) * Math.min(1, dt * 2)
    this.updateCommon(dt)
  }

  private updateTravel(dt: number) {
    this.travelT += dt
    ui.fade = Math.min(1, this.travelT / 0.5)
    if (this.travelT >= 0.6 && this.travelTarget !== null) {
      const dist = Math.abs(this.travelTarget - this.surface.boatX)
      // 航线经过的海面全部计入海图
      const a = Math.min(this.travelTarget, this.surface.boatX)
      const b = Math.max(this.travelTarget, this.surface.boatX)
      for (let x = a; x <= b + CHUNK; x += CHUNK) {
        const k = `${Math.floor(x / CHUNK)}:-1`
        if (!save.explored[k]) save.explored[k] = 1
        this.discoverRegion(x)
      }
      save.totalMinutes += Math.min(600, (dist / PX_PER_M_X / 1000) * 12)
      this.surface.boatX = this.travelTarget
      save.boatX = this.travelTarget
      this.world.clearAll()
      this.fish.clear()
      this.cam.x = this.surface.boatX
      this.travelTarget = null as any
      this.placeOnBoat()
      ui.fade = 1
      toast(`⛵ 已抵达 ${regionAt(this.surface.boatX).name}`, 'good')
    }
  }

  private updateCommon(dt: number) {
    const p = this.player
    this.depth = this.interior ? this.interior.depth : Math.max(0, yToDepth(p.y))
    this.region = this.interior ? REGIONS[this.interior.regionId as keyof typeof REGIONS] : regionAt(p.x)
    this.regionId = this.region.id
    this.regionName = this.region.name
    this.fishEnv.px = p.x
    this.fishEnv.py = p.y
    this.fishEnv.pvx = p.vx
    this.fishEnv.pvy = p.vy
    this.fishEnv.sprinting = p.sprinting
    this.fishEnv.stealth = this.stats.stealth
    this.fishEnv.night = this.env.isNight
    this.fishEnv.hidden = this.mode !== 'diving'
    this.fishEnv.lure = this.lure
    this.fishEnv.dt = dt
    this.fishEnv.time = this.time
    this.fish.update(this.fishEnv)
    this.spawn.update(dt)
    this.events.update(dt)
  }

  private updateDiving(dt: number) {
    const p = this.player
    const s = this.stats
    this.prevX = p.x
    this.prevY = p.y
    // 洋流
    let drift = { x: 0, y: 0 }
    let curLevel = 0
    if (!this.interior) {
      const c = currentAt(p.x, p.y)
      let vx = c.vx
      let level = c.level
      if (this.events.currentOverride && p.y > 200) {
        vx = this.events.currentOverride
        level = Math.max(level, Math.round(Math.abs(vx) / 70))
      }
      curLevel = level
      const eff = Math.max(0, level - s.currentResist)
      if (eff > 0) drift.x = Math.sign(vx) * eff * 75
    }
    p.update(dt, s, this.space, input.axis(), input.sprint(), drift)
    this.capture.update(dt)
    this.photoCd -= dt
    this.sonarCd -= dt
    this.hurtMsgT -= dt
    this.revealToastT -= dt
    this.warnT -= dt
    let warning = ''
    if (curLevel > s.currentResist) warning = `🌊 强洋流（Lv.${curLevel}）！需要更强的推进器`
    if (!this.interior) {
      // 水压限制
      const maxY = depthToY(s.maxDepth)
      if (p.y > maxY) {
        p.y = maxY
        if (p.vy > 0) p.vy = -30
        warning = `⚠ 水压超出潜水服极限（${s.maxDepth}m），请升级潜水服`
        if (this.warnT <= 0) {
          audio.sfx('warn')
          this.warnT = 2
        }
      }
      // 温度限制
      const r = regionAt(p.x)
      const blocked = (rx: number, ry: number) => {
        const rr = regionAt(rx)
        return !!rr.needThermal && s.thermal < rr.needThermal && (!rr.needThermalBelow || yToDepth(ry) > rr.needThermalBelow)
      }
      // 只阻挡“进入”，已在区域内时允许离开
      if (blocked(p.x, p.y) && !blocked(this.prevX, this.prevY)) {
        p.x = this.prevX - Math.sign(p.vx || 1) * 2
        p.vx = -p.vx * 0.5
        warning = r.needThermal === 1 ? '❄ 海水过冷！需要「极地保温层」才能进入' : '♨ 水温过高！需要「全域温控层」才能深入热泉区'
        if (r.needThermalBelow && regionAt(this.prevX).id === r.id) {
          p.y = this.prevY - 2
          p.x = this.prevX
          if (p.vy > 0) p.vy = 0
        }
      }
      for (const f of this.world.featuresWithin(p.x, p.y, 220)) {
        if (f.kind === 'vent' && s.thermal < 2) {
          for (const v of f.vents ?? []) {
            const d = Math.hypot(p.x - v.x, p.y - v.y)
            if (d < 90) {
              p.pushX += ((p.x - v.x) / (d || 1)) * 40
              p.pushY += ((p.y - v.y) / (d || 1)) * 40
              warning = '♨ 热液温度过高！需要「全域温控层」'
            }
          }
        }
      }
      if (r.temp === 'polar' && s.thermal >= 1) ProgressSystem.unlock('polar')
    }
    ui.hud.warning = warning
    ui.hud.current = curLevel
    // 动作
    if (input.consume('capture')) this.capture.swing()
    if (input.consume('camera')) this.capture.photo()
    if (input.consume('sonar')) this.pingSonar()
    if (input.consume('lure')) this.dropLure()
    if (input.consume('trap')) this.capture.placeTrap()
    if (input.consume('lamp')) save.settings.lampOn = !save.settings.lampOn
    if (input.consume('home')) {
      this.returnToBoat()
      return
    }
    this.findInteract()
    if (input.consume('interact') && this.interact) this.interact.act()
    // 诱鱼器
    if (this.lure) {
      this.lure.t -= dt
      this.lure.s.alpha = 0.6 + 0.4 * Math.sin(this.time * 6)
      if (this.lure.t <= 0) {
        this.lure.s.destroy()
        this.lure = null
      }
    }
    // 气泡
    p.bubbleT -= dt
    if (p.bubbleT <= 0) {
      p.bubbleT = 0.6 + Math.random() * 1.2
      this.fx.bubble(p.x + p.facing * 14, p.y - 6, 1 + Math.floor(Math.random() * 3))
    }
    if (p.sprinting && Math.random() < dt * 20) this.fx.bubble(p.x - p.facing * 24, p.y + 2, 1)
    // 热泉烟柱
    if (!this.interior) for (const f of this.world.featuresWithin(p.x, p.y, 1400)) for (const v of f.vents ?? []) if (Math.random() < dt * 3) this.fx.smoke(v.x, v.y)
    // 周期检查
    this.exploreT -= dt
    if (this.exploreT <= 0) {
      this.exploreT = 0.5
      this.periodic()
    }
    this.detectT -= dt
    if (this.detectT <= 0) {
      this.detectT = 0.5
      this.updateDetector()
    }
    this.updateTraps()
    this.updateCommon(dt)
    p.draw(s.netRange, this.time)
    // 相机
    this.cam.x += (p.x - this.cam.x) * Math.min(1, dt * 4)
    this.cam.y += (p.y - this.cam.y) * Math.min(1, dt * 4)
  }

  private periodic() {
    const p = this.player
    const d = this.depth
    if (!this.interior) {
      ProgressSystem.checkDepth(d)
      const cx = Math.floor(p.x / CHUNK)
      const cy = Math.floor(p.y / CHUNK)
      const r = Math.ceil(this.lightRadius / CHUNK) + 1
      for (let i = -r; i <= r; i++) for (let j = -1; j <= 1; j++) save.explored[`${cx + i}:${cy + j}`] = 1
      // 海面也记录
      save.explored[`${cx}:-1`] = 1
      // 海域发现：视野所及即算发现（极地等需要装备才能进入的海域也能被“望见”）
      this.sight(p.x)
      for (const f of this.world.featuresWithin(p.x, p.y, 420)) this.discoverFeature(f)
    }
    if (this.env.isNight) ProgressSystem.unlock('night_dive')
    if (this.env.weather.thunder) ProgressSystem.unlock('storm_dive')
  }

  /** 记录海域发现 */
  private discoverRegion(x: number) {
    const reg = regionAt(x)
    if (save.regionsFound[reg.id]) return
    save.regionsFound[reg.id] = 1
    const n = Object.keys(save.regionsFound).length
    if (n > 1) {
      let need = ''
      if (reg.needThermal && this.stats.thermal < reg.needThermal)
        need = reg.needThermalBelow ? `（${reg.needThermalBelow}m 以下需要「全域温控层」）` : '（需要「极地保温层」才能进入）'
      toast(`🗺️ 发现新海域：${reg.name}${need}　${n}/11`, 'record', 4500)
      ProgressSystem.addResearch(200, '新海域')
    }
    ProgressSystem.checkRegions()
  }

  /** 视野范围内的海面计入海图，并发现其中的海域 */
  private sight(x: number) {
    const half = this.viewW / 2 + 300
    for (let sx = x - half; sx <= x + half + 1; sx += CHUNK / 2) {
      const k = `${Math.floor(sx / CHUNK)}:-1`
      if (!save.explored[k]) save.explored[k] = 1
      this.discoverRegion(sx)
    }
  }

  private findInteract() {
    const p = this.player
    this.interact = null
    if (this.interior) {
      const it = this.interior
      if (Math.hypot(p.x - it.exit.x, p.y - it.exit.y) < 90) {
        this.interact = { hint: 'E 离开', act: () => this.exitInterior() }
      }
      for (const c of it.chests) {
        if (!c.looted && Math.hypot(p.x - c.x, p.y - c.y) < 60) this.interact = { hint: 'E 打开宝箱', act: () => this.openChest(c) }
      }
    } else {
      // 船
      const boatD = Math.abs(p.x - this.surface.boatX)
      if (p.y < 50) {
        if (boatD < 110) this.interact = { hint: 'E 登船', act: () => this.boardBoat() }
        else
          this.interact = {
            hint: 'E 呼叫小船',
            act: () => {
              this.surface.boatTargetX = p.x - 40
              toast('📣 已呼叫小船，请稍候', 'info')
              audio.sfx('interact')
            },
          }
      }
      const f = this.world.nearestFeature(p.x, p.y, 90)
      if (f) {
        if (f.enterable) this.interact = { hint: `E 进入${f.name}`, act: () => this.enterInterior(f) }
        else if (f.kind === 'abyss' && !save.looted[f.id])
          this.interact = {
            hint: 'E 采集海沟沉积物样本',
            act: () => {
              save.looted[f.id] = 1
              save.collectibles.trench_sample = (save.collectibles.trench_sample ?? 0) + 1
              toast('🧪 采集到海沟沉积物样本！', 'record', 4000)
              ProgressSystem.addResearch(800, '地球最深处')
              audio.sfx('chest')
            },
          }
      }
      for (const t of save.traps) {
        if (Math.hypot(p.x - t.x, p.y - t.y) < 70) this.interact = { hint: 'E 收取鱼笼', act: () => this.capture.collectTrap(t.id) }
      }
    }
    this.setHint(this.interact?.hint ?? '')
  }

  private setHint(h: string) {
    if (ui.hud.hint !== h) ui.hud.hint = h
  }

  private pingSonar() {
    const s = this.stats
    if (s.tiers.sonar < 0) {
      toast('需要先在装备商店购买声呐', 'warn')
      return
    }
    if (this.sonarCd > 0) return
    this.sonarCd = s.sonarCooldown
    this.sonarT = 0
    audio.sfx('sonar')
    const p = this.player
    for (const f of this.fish.fish) if (Math.hypot(f.x - p.x, f.y - p.y) < s.sonarRange) f.sonarMark = 4.5
    if (!this.interior) for (const f of this.world.featuresWithin(p.x, p.y, s.sonarRange)) this.discoverFeature(f)
  }

  private dropLure() {
    if (save.lures <= 0) {
      toast('没有诱鱼器了，可在船上的商店购买', 'warn')
      return
    }
    if (this.lure) return
    save.lures--
    const p = this.player
    const s = new Sprite(tex(Art.glowTex(), true))
    s.anchor.set(0.5)
    s.tint = 0xffe06a
    s.blendMode = 'add'
    s.scale.set(0.7)
    s.position.set(p.x, p.y)
    this.layers.lure.addChild(s)
    this.lure = { x: p.x, y: p.y, t: 20, s }
    toast('✨ 已投放诱鱼器', 'good')
    for (let i = 0; i < 2; i++) {
      const x = p.x + (Math.random() < 0.5 ? -1 : 1) * (this.viewW / 2 + 50)
      if (this.spawn.validWater(x, p.y)) this.spawn.spawnGroup(x, p.y)
    }
  }

  private updateDetector() {
    const s = this.stats
    if (s.tiers.detector < 0) {
      ui.hud.detector = null
      return
    }
    const p = this.player
    let best: Fish | null = null
    let bd = s.detectRange
    for (const f of this.fish.fish) {
      if (rarityIndex(f.sp.rarity) < s.detectRarity) continue
      const d = Math.hypot(f.x - p.x, f.y - p.y)
      if (d < bd) {
        bd = d
        best = f
      }
    }
    if (!best) {
      ui.hud.detector = { text: '未检测到稀有物种', dist: 0, dir: '' }
      return
    }
    const a = Math.atan2(best.y - p.y, best.x - p.x)
    const idx = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8
    const known = EncyclopediaSystem.isDiscovered(best.sp.id)
    ui.hud.detector = { text: known ? `已知稀有物种：${best.sp.commonName}` : '未知稀有物种', dist: Math.round(bd / PX_PER_M_X), dir: ARROWS[idx] }
  }

  private updateTraps() {
    const ids = new Set(save.traps.map((t) => t.id))
    for (const [id, s] of this.trapSprites) {
      if (!ids.has(id)) {
        s.destroy()
        this.trapSprites.delete(id)
      }
    }
    for (const t of save.traps) {
      let s = this.trapSprites.get(t.id)
      if (!s) {
        s = new Sprite()
        s.anchor.set(0.5, 1)
        s.scale.set(2)
        s.position.set(t.x, t.y + 2)
        this.layers.traps.addChild(s)
        this.trapSprites.set(t.id, s)
      }
      s.texture = tex(Art.trapArt(save.totalMinutes - t.placedAt >= 60))
      s.visible = !this.interior
    }
  }

  // ─────────────────────────── 渲染
  private render(rawDt: number, dt: number) {
    const sw = this.sw
    const sh = this.sh
    const z = this.zoom
    const p = this.player
    if (this.shake > 0) this.shake = Math.max(0, this.shake - rawDt)
    const shx = this.shake > 0 ? (Math.random() - 0.5) * 10 * this.shake : 0
    const shy = this.shake > 0 ? (Math.random() - 0.5) * 10 * this.shake : 0
    const camX = this.cam.x
    const camY = this.cam.y
    const wx = sw / 2 - camX * z + shx
    const wy = sh / 2 - camY * z + shy
    this.layers.world.position.set(wx, wy)
    this.layers.world.scale.set(z)
    this.layers.glow.position.set(wx, wy)
    this.layers.glow.scale.set(z)
    if (!this.interior) this.world.update(camX, camY, this.viewW, this.viewH, this.time)
    const dayK = this.interior ? 0.03 : this.env.daylight()
    // 背景
    const bg = this.layers.bg
    bg.clear()
    const bands = 40
    const bh = sh / bands
    const [skyTop, skyHor] = this.env.skyColors()
    const camTop = camY - this.viewH / 2
    const region = this.interior ? null : regionAt(camX)
    for (let i = 0; i < bands; i++) {
      const wyb = camTop + ((i + 0.5) * bh) / z
      let c: number
      if (this.interior) c = shade(this.interior.floorColor(0), 0.25)
      else if (wyb < 0) c = lerpColor(skyHor, skyTop, clamp(-wyb / 420, 0, 1))
      else {
        const d = yToDepth(wyb)
        c = waterColor(d)
        if (region) c = lerpColor(c, region.waterTint, region.tintStrength * Math.max(0, 1 - d / 400))
        c = shade(c, lerp(0.35 + 0.65 * dayK, 1, clamp(d / 600, 0, 1)))
      }
      bg.rect(0, Math.floor(i * bh), sw, Math.ceil(bh) + 1).fill(c)
    }
    // 特效 & 海面
    const waterTop = region ? shade(lerpColor(waterColor(0), region.waterTint, region.tintStrength), 0.35 + 0.65 * dayK) : 0x2aa6d8
    this.fx.update(dt, camX, camY, this.viewW, this.viewH, this.time, dayK, !!this.interior)
    this.surface.update(dt, this.time, this.env, camX, camY, z, sw, sh, this.fx, waterTop)
    this.surface.far.visible = this.surface.far.visible && !this.interior
    this.surface.waves.visible = this.surface.waves.visible && !this.interior
    this.surface.boatLayer.visible = !this.interior
    if (this.mode === 'boat' || this.mode === 'traveling') {
      this.followBoat()
      p.draw(0, this.time)
    }
    // 光照
    const depthNow = this.interior ? this.interior.depth : Math.max(0, yToDepth(p.y))
    const vis = this.env.weather.vis
    let bright = this.interior ? 0.02 : Math.exp(-depthNow / 160) * dayK * (0.7 + 0.3 * vis)
    if (this.mode === 'boat' || p.y < 0) bright = Math.max(bright, dayK)
    let alpha = clamp(1 - bright * 1.15, 0, depthNow > 1000 || this.interior ? 0.985 : 0.97)
    if (this.mode === 'boat') alpha = Math.min(alpha, 0.55)
    const lampOn = save.settings.lampOn
    const s = this.stats
    this.lightRadius = (lampOn ? s.light + s.vision : 50 + s.vision * 0.5) * (this.mode === 'boat' ? 2.2 : 1)
    this.darkAlpha = alpha
    const psx = sw / 2 + (p.x - camX) * z + shx
    const psy = sh / 2 + (p.y - camY) * z + shy
    this.darkness.update(psx + p.facing * 20 * z, psy, this.lightRadius * z, alpha, sw, sh, depthNow > 3000 ? 0x000000 : 0x01040a)
    // 浮动文字
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const f = this.floatTexts[i]
      f.life -= rawDt
      f.t.y -= rawDt * 30
      f.t.alpha = Math.min(1, f.life)
      if (f.life <= 0) {
        f.t.destroy()
        this.floatTexts.splice(i, 1)
      }
    }
    // 声呐
    this.drawSonar(rawDt)
    // 屏幕特效
    const fxg = this.layers.screenFx
    fxg.clear()
    if (this.flash > 0) {
      fxg.rect(0, 0, sw, sh).fill({ color: 0xffffff, alpha: this.flash })
      this.flash = Math.max(0, this.flash - rawDt * 2.5)
    }
    if (this.hurtFlash > 0) {
      const a = this.hurtFlash * 0.5
      fxg.rect(0, 0, sw, 24).fill({ color: 0xff2a2a, alpha: a })
      fxg.rect(0, sh - 24, sw, 24).fill({ color: 0xff2a2a, alpha: a })
      fxg.rect(0, 0, 24, sh).fill({ color: 0xff2a2a, alpha: a })
      fxg.rect(sw - 24, 0, 24, sh).fill({ color: 0xff2a2a, alpha: a })
      this.hurtFlash = Math.max(0, this.hurtFlash - rawDt)
    }
    // 音频环境
    const under = this.mode === 'diving'
    audio.setEnv(under, depthNow)
    audio.setZone(under ? zoneMusicFor(depthNow, this.region, !!this.interior) : 'surface')
    // HUD
    this.hudT -= rawDt
    if (this.hudT <= 0) {
      this.hudT = 0.1
      this.syncHud(depthNow)
    }
  }

  private drawSonar(dt: number) {
    const g = this.sonarG
    g.clear()
    const p = this.player
    const range = this.stats.sonarRange
    if (this.sonarT >= 0) {
      this.sonarT += dt
      const k = this.sonarT / 1.3
      if (k >= 1.2) this.sonarT = -1
      else {
        const r = range * Math.min(1, k)
        g.circle(p.x, p.y, r).stroke({ width: 3, color: 0x6affd0, alpha: Math.max(0, 0.8 - k * 0.6) })
        if (r > 40) g.circle(p.x, p.y, r - 30).stroke({ width: 1, color: 0x6affd0, alpha: Math.max(0, 0.4 - k * 0.3) })
      }
    }
    const drawnSchools = new Set<any>()
    for (const f of this.fish.fish) {
      if (f.sonarMark <= 0 || f.dying > 0) continue
      const a = Math.min(1, f.sonarMark)
      const col = 0x6affd0
      const ri = rarityIndex(f.sp.rarity)
      const known = EncyclopediaSystem.isDiscovered(f.sp.id)
      if (f.school && f.school.members.length > 3) {
        if (drawnSchools.has(f.school)) continue
        drawnSchools.add(f.school)
        const sc = f.school
        for (let i = -1; i <= 1; i++) g.circle(sc.cx + i * 8, sc.cy, 2.5).fill({ color: col, alpha: a })
        continue
      }
      if ((ri >= 4 && !known) || (f.size > 400 && !known)) {
        for (let y = 0; y < QMARK.length; y++)
          for (let x = 0; x < 5; x++) if (QMARK[y][x] === '#') g.rect(f.x - 7 + x * 3, f.y - 10 + y * 3, 3, 3).fill({ color: 0xff8a6a, alpha: a })
      } else if (ri >= 2) {
        const pts: number[] = []
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + (i * Math.PI) / 5
          const r = i % 2 ? 3 : 7
          pts.push(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r)
        }
        g.poly(pts).fill({ color: 0xffd84a, alpha: a })
      } else if (f.size > 150) {
        g.circle(f.x, f.y, 7).stroke({ width: 2, color: col, alpha: a })
        g.circle(f.x, f.y, 2).fill({ color: col, alpha: a })
      } else {
        g.circle(f.x, f.y, 2).fill({ color: col, alpha: a })
      }
    }
  }

  private syncHud(depth: number) {
    const h = ui.hud
    const p = this.player
    h.depth = Math.round(depth)
    h.x = Math.round(p.x / PX_PER_M_X)
    h.regionName = this.interior ? this.interior.feature.name : regionAt(p.x).name
    h.regionId = this.regionId
    h.zoneName = this.interior ? (this.interior.isCave ? '洞穴内部' : '沉船内部') : this.mode === 'diving' ? zoneNameFor(depth, regionAt(p.x)) : '海面'
    h.hp = Math.round(p.hp)
    h.maxHp = this.player.maxHp
    h.timeText = this.env.timeText()
    h.phase = this.env.phase
    h.weather = this.env.weather.name
    h.weatherIcon = this.env.weather.icon
    h.sonarCd = Math.max(0, this.sonarCd)
    h.sonarReady = this.sonarCd <= 0
    h.cameraCd = Math.max(0, this.photoCd)
    h.hasSonar = this.stats.tiers.sonar >= 0
    h.hasCamera = this.stats.tiers.camera >= 0
    h.hasThruster = this.stats.tiers.thruster >= 0
    h.hasTrap = this.stats.tiers.trap >= 0
    h.lampOn = save.settings.lampOn
    h.stunned = p.stunT > 0
    h.fps = Math.round(this.app.ticker.FPS)
  }
}

export const game = new Game()
