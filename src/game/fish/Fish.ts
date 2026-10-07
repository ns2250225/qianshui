import { Container, Sprite } from 'pixi.js'
import type { FishSpecies } from '../../data/fish/types'
import { fishTex, tex, type FishTex } from '../core/tex'
import { fishLengthPx } from './FishArt'
import { glowTex } from '../world/Art'
import { clamp, hexToNum } from '../core/rng'
import type { Space } from '../world/Space'
import { depthToY } from '../core/constants'
import { depthRangeOf } from '../biome/Biome'

export interface FishEnv {
  px: number
  py: number
  pvx: number
  pvy: number
  sprinting: boolean
  stealth: number
  night: boolean
  hidden: boolean
  lure: { x: number; y: number } | null
  space: Space
  dt: number
  time: number
  onHit(f: Fish): void
  onReveal(f: Fish): void
}

type FishState = 'wander' | 'flee' | 'approach' | 'rest' | 'dart' | 'charge' | 'return' | 'hover'

export class School {
  members: Fish[] = []
  tx = 0
  ty = 0
  cx = 0
  cy = 0
  vx = 0
  vy = 0
  timer = 0
  forcedVX = 0
  sp: FishSpecies
  constructor(sp: FishSpecies, x: number, y: number) {
    this.sp = sp
    this.tx = this.cx = x
    this.ty = this.cy = y
  }
}

let NEXT_ID = 1

export class Fish {
  id = NEXT_ID++
  sp: FishSpecies
  size: number
  quality: number
  lenPx: number
  halfLen: number
  halfH: number
  sprite: Sprite
  glow: Sprite | null = null
  ft: FishTex
  baseScale: number
  x: number
  y: number
  vx = 0
  vy = 0
  facing = 1
  cruise: number
  burst: number
  turn: number
  state: FishState = 'wander'
  stateT = 0
  tx: number
  ty: number
  homeX: number
  homeY: number
  alert = 0
  school: School | null = null
  revealed = true
  camo = false
  hitCd = 0
  attackCd = 3
  animT = Math.random() * 10
  minY: number
  maxY: number
  dying = 0
  dead = false
  far = false
  skip = 0
  forcedVX = 0
  sonarMark = 0
  inInterior = false

  constructor(sp: FishSpecies, x: number, y: number, size: number, quality: number, layer: Container, glowLayer: Container) {
    this.sp = sp
    this.size = size
    this.quality = quality
    this.x = this.tx = this.homeX = x
    this.y = this.ty = this.homeY = y
    this.ft = fishTex(sp)
    this.lenPx = fishLengthPx(size, sp.art.shape)
    this.baseScale = this.ft.scale * (this.lenPx / this.ft.stdPx)
    this.sprite = new Sprite(this.ft.frames[0])
    this.sprite.anchor.set(0.5)
    this.sprite.scale.set(this.baseScale)
    this.halfLen = (this.sprite.width / 2) * 0.9
    this.halfH = this.sprite.height / 2
    layer.addChild(this.sprite)
    if (sp.glow) {
      this.glow = new Sprite(tex(glowTex(), true))
      this.glow.anchor.set(0.5)
      this.glow.tint = hexToNum(sp.glow)
      this.glow.blendMode = 'add'
      const gs = clamp(this.lenPx / 40, 0.35, 1.6)
      this.glow.scale.set(gs)
      glowLayer.addChild(this.glow)
    }
    const logS = Math.log2(Math.max(2, size))
    let cruise = clamp(22 + logS * 9, 20, 110)
    const b = sp.behavior
    if (b === 'fast') cruise *= 1.7
    else if (b === 'slow') cruise *= 0.45
    else if (b === 'drifter') cruise *= 0.28
    else if (b === 'benthic' || b === 'ambush' || b === 'camouflage') cruise *= 0.55
    this.cruise = cruise
    this.burst = cruise * (b === 'fast' ? 3.2 : 2.6) + 60
    this.turn = b === 'fast' ? 3 : 2.2
    this.camo = b === 'camouflage'
    this.revealed = !this.camo
    const [dmin, dmax] = depthRangeOf(sp, true)
    this.minY = depthToY(Math.max(0, dmin * 0.92))
    this.maxY = depthToY(dmax * 1.05 + 5)
    if (b === 'nocturnal' || b === 'ambush' || b === 'camouflage' || b === 'benthic') this.state = 'rest'
  }

  get rarityGlow() {
    return this.sp.rarity
  }

  private seek(tx: number, ty: number, speed: number, dt: number) {
    const dx = tx - this.x
    const dy = ty - this.y
    const d = Math.hypot(dx, dy) || 1
    const dvx = (dx / d) * speed
    const dvy = (dy / d) * speed
    const k = Math.min(1, this.turn * dt)
    this.vx += (dvx - this.vx) * k
    this.vy += (dvy - this.vy) * k
  }

  private brake(dt: number, k = 2) {
    const f = Math.max(0, 1 - k * dt)
    this.vx *= f
    this.vy *= f
  }

  private get yMin() {
    return this.y > 50000 ? -1e9 : this.minY
  }
  private get yMax() {
    return this.y > 50000 ? 1e9 : this.maxY
  }

  private pickWander(space: Space, radius: number) {
    const benthic = this.sp.behavior === 'benthic' || this.sp.behavior === 'camouflage' || this.sp.behavior === 'ambush'
    this.tx = this.homeX + (Math.random() - 0.5) * radius * 2
    const fy = space.floorY(this.tx)
    if (benthic) this.ty = fy - this.halfH - 3
    else this.ty = this.homeY + (Math.random() - 0.5) * radius
    this.ty = clamp(this.ty, Math.max(this.yMin, space.ceilY(this.tx) + this.halfH + 6), Math.min(this.yMax, fy - this.halfH - 3))
  }

  catchAnim() {
    this.dying = 0.35
    if (this.school) {
      const i = this.school.members.indexOf(this)
      if (i >= 0) this.school.members.splice(i, 1)
      this.school = null
    }
  }

  reveal(env: FishEnv) {
    if (this.revealed) return
    this.revealed = true
    env.onReveal(this)
    this.state = 'dart'
    this.stateT = 1.1
    const a = Math.atan2(this.y - env.py, this.x - env.px)
    this.vx = Math.cos(a) * this.burst
    this.vy = Math.sin(a) * this.burst * 0.5
  }

  scare(px: number, py: number) {
    this.alert = 1
    this.state = 'flee'
    this.stateT = 1.5 + Math.random()
    this.revealed = true
  }

  update(env: FishEnv) {
    let dt = env.dt
    if (this.dying > 0) {
      this.dying -= dt
      const k = Math.max(0, this.dying / 0.35)
      this.x += (env.px - this.x) * Math.min(1, dt * 8)
      this.y += (env.py - this.y) * Math.min(1, dt * 8)
      this.sprite.scale.set(this.facing * this.baseScale * k, this.baseScale * k)
      this.sprite.alpha = k
      this.sprite.position.set(this.x, this.y)
      if (this.glow) this.glow.alpha = 0
      if (this.dying <= 0) this.dead = true
      return
    }
    const dx = env.px - this.x
    const dy = env.py - this.y
    const dist = Math.hypot(dx, dy)
    this.far = dist > 1100
    if (this.far) {
      this.skip = (this.skip + 1) % 3
      if (this.skip !== 0) {
        this.sprite.visible = false
        if (this.glow) this.glow.visible = false
        return
      }
      dt *= 3
    }
    this.hitCd -= dt
    this.attackCd -= dt
    this.stateT -= dt
    if (this.sonarMark > 0) this.sonarMark -= dt
    const sp = this.sp
    const b = sp.behavior
    const space = env.space
    const stealthK = 1 - env.stealth
    const hidden = env.hidden
    const pspeed = Math.hypot(env.pvx, env.pvy)
    let alertR = (75 + this.lenPx * 0.5) * stealthK * (env.sprinting ? 1.5 : 1)
    if (b === 'shy') alertR *= 1.2
    else if (b === 'fast') alertR *= 1.25
    else if (b === 'curious') alertR *= 0.5
    else if (b === 'slow' || b === 'drifter') alertR *= 0.4
    if (hidden) alertR = 0

    // 诱鱼器
    if (env.lure && !sp.danger) {
      const ld = Math.hypot(env.lure.x - this.x, env.lure.y - this.y)
      if (ld < 360 && this.state !== 'flee') {
        this.alert = Math.max(0, this.alert - dt)
        if (!this.school) {
          this.seek(env.lure.x + Math.sin(this.id + env.time) * 30, env.lure.y + Math.cos(this.id * 1.3 + env.time) * 20, ld > 60 ? this.cruise * 1.2 : this.cruise * 0.3, dt)
          this.integrate(env, dt, dist)
          return
        }
      }
    }

    // 危险生物主动攻击
    if (sp.danger && sp.danger >= 2 && !hidden && b !== 'camouflage' && b !== 'slow' && this.state !== 'charge' && this.attackCd <= 0 && dist < 170) {
      if (Math.random() < dt * 0.3 * sp.danger) {
        this.state = 'charge'
        this.stateT = 0.9
        this.attackCd = 5 + Math.random() * 3
      }
    }

    if (this.school && this.school.members.length > 1) {
      this.updateSchool(env, dt, dist, dx, dy)
    } else {
      switch (this.state) {
        case 'charge':
          this.seek(env.px, env.py, this.burst, dt)
          if (this.stateT <= 0) {
            this.state = 'flee'
            this.stateT = 1.2
          }
          break
        case 'flee': {
          const d = dist || 1
          const jitter = Math.sin(env.time * 3 + this.id) * 0.4
          const ax = -dx / d
          const ay = -dy / d
          this.seek(this.x + (ax - ay * jitter) * 200, this.y + (ay + ax * jitter) * 120, this.burst, dt)
          if (this.stateT <= 0) {
            this.state = 'wander'
            this.homeX = this.x
            this.homeY = this.y
            this.pickWander(space, 160)
          }
          break
        }
        case 'dart':
          if (this.stateT <= 0) {
            this.state = 'wander'
            this.homeX = this.x
            this.homeY = this.y
            this.pickWander(space, 100)
          }
          break
        case 'rest': {
          this.brake(dt, 3)
          // 底栖：贴底
          const fy = space.floorY(this.x)
          if (b !== 'nocturnal' || !env.night) this.vy += (fy - this.halfH - 3 - this.y) * dt * 2
          if (this.camo) {
            if (dist < 70 * (2 - stealthK)) this.reveal(env)
          } else if (b === 'ambush') {
            if (dist < 70 * (2 - stealthK) && !hidden) {
              if (sp.danger && Math.random() < 0.5) {
                this.state = 'charge'
                this.stateT = 0.5
              } else {
                this.state = 'dart'
                this.stateT = 0.9
                const a = Math.atan2(-dy, -dx)
                this.vx = Math.cos(a) * this.burst
                this.vy = Math.sin(a) * this.burst * 0.4
              }
            }
          } else if (b === 'nocturnal') {
            if (env.night) this.state = 'wander'
            else if (dist < alertR * 0.6) this.scare(env.px, env.py)
          } else if (b === 'benthic') {
            if (this.stateT <= 0) {
              this.state = 'wander'
              this.pickWander(space, 140)
            }
            if (dist < 60 * stealthK) this.scare(env.px, env.py)
          } else if (this.stateT <= 0) {
            this.state = 'wander'
            this.pickWander(space, 160)
          }
          break
        }
        case 'approach': {
          const orbitA = env.time * 0.8 + this.id
          const ox = env.px + Math.cos(orbitA) * 58
          const oy = env.py + Math.sin(orbitA) * 30
          this.seek(ox, oy, dist > 120 ? this.cruise * 1.3 : this.cruise * 0.5, dt)
          if (env.sprinting && dist < 120) this.scare(env.px, env.py)
          if (dist > 360 || this.stateT <= 0) {
            this.state = 'wander'
            this.stateT = 5
          }
          break
        }
        case 'return':
          this.seek(this.homeX, this.homeY, this.cruise, dt)
          if (Math.hypot(this.homeX - this.x, this.homeY - this.y) < 20) this.state = 'wander'
          break
        case 'hover':
        case 'wander':
        default: {
          // 漫游
          const radius = b === 'territorial' ? 70 : b === 'drifter' ? 60 : b === 'fast' ? 400 : 200
          if (this.forcedVX) {
            this.tx = this.x + this.forcedVX * 3
            this.ty = this.homeY
          }
          const td = Math.hypot(this.tx - this.x, this.ty - this.y)
          if (td < 16 || this.stateT <= 0) {
            this.pickWander(space, radius)
            this.stateT = 3 + Math.random() * 5
            if ((b === 'benthic' || b === 'ambush') && Math.random() < 0.5) {
              this.state = 'rest'
              this.stateT = 2 + Math.random() * 4
            }
          }
          let speed = this.cruise
          if (b === 'drifter') {
            speed *= 0.6
            this.vy += Math.sin(env.time * 0.7 + this.id) * dt * 6
          }
          this.seek(this.tx, this.ty, speed, dt)
          // 反应
          if (b === 'nocturnal' && !env.night && Math.random() < dt * 0.1) {
            this.state = 'rest'
            this.stateT = 30
          }
          if (dist < alertR && !hidden) {
            // 缓慢接近不易惊动鱼类，冲刺会立刻惊吓
            this.alert += dt * (0.3 + 2.5 * clamp(pspeed / 180, 0, 1.5)) * (1.2 - (dist / alertR) * 0.6)
            if (env.sprinting && dist < alertR * 0.8) this.alert += dt * 3
            if (b === 'curious' && !env.sprinting) {
              this.state = 'approach'
              this.stateT = 6 + Math.random() * 6
              this.alert = 0
            } else if (b === 'territorial') {
              if (dist < 90) {
                this.state = sp.danger ? 'charge' : 'approach'
                this.stateT = 0.8
              }
            } else if (this.alert > 1 && b !== 'drifter') {
              this.scare(env.px, env.py)
            }
          } else {
            this.alert = Math.max(0, this.alert - dt)
          }
          if (b === 'territorial' && Math.hypot(this.homeX - this.x, this.homeY - this.y) > 160) this.state = 'return'
          break
        }
      }
    }

    // 接触伤害
    if (sp.danger && !hidden && this.hitCd <= 0 && dist < this.halfLen * 0.6 + 14) {
      if (this.state === 'charge' || b === 'camouflage' || b === 'slow' || b === 'ambush' || sp.danger >= 1) {
        env.onHit(this)
        this.hitCd = 2.2
        if (this.state === 'charge') {
          this.state = 'flee'
          this.stateT = 1.4
        }
      }
    }
    this.integrate(env, dt, dist)
  }

  private updateSchool(env: FishEnv, dt: number, dist: number, dx: number, dy: number) {
    const s = this.school!
    const m = s.members
    const idx = m.indexOf(this)
    // 目标：鱼群中心附近的个体偏移
    const ox = Math.cos(this.id * 2.39) * Math.sqrt(m.length) * 8
    const oy = Math.sin(this.id * 2.39) * Math.sqrt(m.length) * 5
    let ax = (s.cx + ox - this.x) * 1.2 + (s.vx - this.vx) * 1.5
    let ay = (s.cy + oy - this.y) * 1.2 + (s.vy - this.vy) * 1.5
    // 分离（仅检查邻近索引）
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue
      const o = m[idx + k]
      if (!o) continue
      const ddx = this.x - o.x
      const ddy = this.y - o.y
      const d2 = ddx * ddx + ddy * ddy
      const min = this.halfLen * 2.2
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2)
        ax += (ddx / d) * (min - d) * 8
        ay += (ddy / d) * (min - d) * 8
      }
    }
    // 绕开玩家
    const pspeed = Math.hypot(env.pvx, env.pvy)
    const avoidR = (95 + m.length * 0.4) * (1 - env.stealth) * (env.sprinting ? 1.5 : 0.6 + 0.6 * clamp(pspeed / 150, 0, 1))
    if (dist < avoidR && !env.hidden) {
      const k = Math.pow(1 - dist / avoidR, 1.5) * 1800
      const d = dist || 1
      ax -= (dx / d) * k
      ay -= (dy / d) * k * 0.8
      // 侧向分流
      const side = (this.id % 2 === 0 ? 1 : -1) * k * 0.5
      ax += (-dy / d) * side
      ay += (dx / d) * side
      this.alert = Math.min(1, this.alert + dt * 2)
    } else this.alert = Math.max(0, this.alert - dt)
    this.vx += ax * dt
    this.vy += ay * dt
    const sp = Math.hypot(this.vx, this.vy)
    const max = this.alert > 0.3 ? this.burst : this.cruise * 1.4
    if (sp > max) {
      this.vx = (this.vx / sp) * max
      this.vy = (this.vy / sp) * max
    }
  }

  private integrate(env: FishEnv, dt: number, dist: number) {
    const space = env.space
    // 深度约束
    if (this.y < this.yMin) this.vy += Math.min(80, (this.yMin - this.y) * 0.5) * dt * 3
    if (this.y > this.yMax) this.vy -= Math.min(80, (this.y - this.yMax) * 0.5) * dt * 3
    this.x += this.vx * dt
    this.y += this.vy * dt
    if (this.x < space.minX) {
      this.x = space.minX
      this.vx = Math.abs(this.vx)
    }
    if (this.x > space.maxX) {
      this.x = space.maxX
      this.vx = -Math.abs(this.vx)
    }
    const top = space.ceilY(this.x) + this.halfH + 4
    const bot = space.floorY(this.x) - this.halfH - 1
    if (this.y < top) {
      this.y = top
      if (this.vy < 0) this.vy *= -0.5
    }
    if (this.y > bot) {
      this.y = bot
      if (this.vy > 0) this.vy *= -0.3
    }
    // 视觉
    if (Math.abs(this.vx) > 4) this.facing = this.vx > 0 ? 1 : -1
    const speed = Math.hypot(this.vx, this.vy)
    this.animT += dt * (1.5 + speed / 35)
    const frame = Math.floor(this.animT) % 2
    this.sprite.texture = this.ft.frames[frame]
    this.sprite.position.set(Math.round(this.x), Math.round(this.y))
    this.sprite.scale.set(this.facing * this.baseScale, this.baseScale)
    const shape = this.sp.art.shape
    if (shape !== 'seahorse' && shape !== 'ray' && shape !== 'flat') {
      const ang = Math.atan2(this.vy, Math.abs(this.vx) + 1) * 0.6
      this.sprite.rotation = this.facing * clamp(ang, -0.55, 0.55)
    } else this.sprite.rotation = 0
    if (this.camo && !this.revealed) {
      this.sprite.tint = space.floorColor(this.x)
      this.sprite.alpha = 0.32
    } else {
      this.sprite.tint = 0xffffff
      this.sprite.alpha = 1
    }
    this.sprite.visible = !this.far
    if (this.glow) {
      this.glow.visible = !this.far
      this.glow.position.set(this.x + this.facing * this.halfLen * 0.4, this.y)
      this.glow.alpha = 0.45 + 0.35 * Math.sin(env.time * 2.2 + this.id)
    }
  }

  destroy() {
    this.sprite.destroy()
    this.glow?.destroy()
    this.dead = true
  }
}

export class FishManager {
  fish: Fish[] = []
  schools: School[] = []
  layer: Container
  glowLayer: Container

  constructor(layer: Container, glowLayer: Container) {
    this.layer = layer
    this.glowLayer = glowLayer
  }

  static rollSize(sp: FishSpecies, bonus = 0): { size: number; quality: number } {
    let frac = Math.pow(Math.random(), 1.7 - bonus)
    if (Math.random() < 0.015 + bonus * 0.02) frac = 0.97 + Math.random() * 0.08
    const size = sp.size.min + (sp.size.max - sp.size.min) * frac
    let q = 0
    if (frac >= 0.97) q = 4
    else if (frac >= 0.88) q = 3
    else if (frac >= 0.7) q = 2
    else if (frac >= 0.45) q = 1
    return { size: Math.round(size * 10) / 10, quality: q }
  }

  spawn(sp: FishSpecies, x: number, y: number, sizeBonus = 0): Fish {
    const { size, quality } = FishManager.rollSize(sp, sizeBonus)
    const f = new Fish(sp, x, y, size, quality, this.layer, this.glowLayer)
    this.fish.push(f)
    return f
  }

  spawnSchool(sp: FishSpecies, x: number, y: number, n: number, space: Space): School {
    const s = new School(sp, x, y)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * (20 + Math.sqrt(n) * 10)
      const fx = x + Math.cos(a) * r
      let fy = y + Math.sin(a) * r * 0.6
      fy = clamp(fy, space.ceilY(fx) + 10, space.floorY(fx) - 10)
      const f = this.spawn(sp, fx, fy)
      f.school = s
      f.state = 'wander'
      s.members.push(f)
    }
    this.schools.push(s)
    return s
  }

  updateSchools(dt: number, space: Space, env: FishEnv) {
    for (let i = this.schools.length - 1; i >= 0; i--) {
      const s = this.schools[i]
      s.members = s.members.filter((m) => !m.dead)
      if (s.members.length === 0) {
        this.schools.splice(i, 1)
        continue
      }
      let cx = 0
      let cy = 0
      for (const m of s.members) {
        cx += m.x
        cy += m.y
      }
      cx /= s.members.length
      cy /= s.members.length
      s.timer -= dt
      if (s.forcedVX) {
        s.tx = cx + s.forcedVX * 4
        s.ty = s.ty || cy
      } else if (s.timer <= 0 || Math.hypot(s.tx - cx, s.ty - cy) < 30) {
        s.timer = 4 + Math.random() * 6
        s.tx = cx + (Math.random() - 0.5) * 500
        s.ty = cy + (Math.random() - 0.5) * 160
        const m0 = s.members[0]
        const inside = cy > 50000
        s.ty = clamp(s.ty, Math.max(inside ? -1e9 : m0.minY, space.ceilY(s.tx) + 30), Math.min(inside ? 1e9 : m0.maxY, space.floorY(s.tx) - 30))
      }
      // 群体目标点平滑移动
      const speed = s.members[0].cruise * (s.forcedVX ? 1.5 : 1)
      const ddx = s.tx - s.cx
      const ddy = s.ty - s.cy
      const d = Math.hypot(ddx, ddy) || 1
      s.vx += ((ddx / d) * speed - s.vx) * Math.min(1, dt * 1.5)
      s.vy += ((ddy / d) * speed * 0.6 - s.vy) * Math.min(1, dt * 1.5)
      s.cx += s.vx * dt
      s.cy += s.vy * dt
      // 群体中心不脱离太远
      s.cx += (cx - s.cx) * Math.min(1, dt * 0.5)
      s.cy += (cy - s.cy) * Math.min(1, dt * 0.5)
      const fy = space.floorY(s.cx)
      s.cy = clamp(s.cy, space.ceilY(s.cx) + 20, fy - 20)
    }
  }

  update(env: FishEnv) {
    this.updateSchools(env.dt, env.space, env)
    for (const f of this.fish) f.update(env)
    if (this.fish.some((f) => f.dead)) {
      for (const f of this.fish) if (f.dead && !f.sprite.destroyed) f.destroy()
      this.fish = this.fish.filter((f) => !f.dead)
    }
  }

  remove(f: Fish) {
    f.destroy()
    if (f.school) {
      const i = f.school.members.indexOf(f)
      if (i >= 0) f.school.members.splice(i, 1)
    }
  }

  clear() {
    for (const f of this.fish) f.destroy()
    this.fish = []
    this.schools = []
  }

  countNear(x: number, y: number, r: number): number {
    let n = 0
    for (const f of this.fish) if (Math.abs(f.x - x) < r && Math.abs(f.y - y) < r) n++
    return n
  }
}
