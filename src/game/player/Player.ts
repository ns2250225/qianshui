import { Container, Graphics, Sprite } from 'pixi.js'
import { tex } from '../core/tex'
import { diverArt } from '../world/Art'
import type { PlayerStats } from '../equipment/stats'
import type { Space } from '../world/Space'
import { clamp } from '../core/rng'

export class Player {
  root = new Container()
  body: Sprite
  net = new Graphics()
  x = 0
  y = 0
  vx = 0
  vy = 0
  facing = 1
  aimX = 1
  aimY = 0
  hp = 100
  maxHp = 100
  stunT = 0
  invulnT = 0
  regenT = 0
  netCd = 0
  swingT = 0
  sprinting = false
  animT = 0
  suitTier = 0
  standing = true
  bubbleT = 0
  pushX = 0
  pushY = 0

  constructor() {
    this.body = new Sprite(tex(diverArt('stand', 0)))
    this.body.anchor.set(0.5)
    this.body.scale.set(2)
    this.root.addChild(this.net, this.body)
  }

  setSuit(tier: number) {
    this.suitTier = tier
  }

  update(dt: number, s: PlayerStats, space: Space, axis: { x: number; y: number }, sprint: boolean, drift: { x: number; y: number }) {
    this.netCd -= dt
    this.invulnT -= dt
    this.regenT -= dt
    if (this.regenT <= 0 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 4 * dt)
    let ax = axis.x
    let ay = axis.y
    if (this.stunT > 0) {
      this.stunT -= dt
      ax = 0
      ay = 0
    }
    if (ax !== 0 || ay !== 0) {
      const l = Math.hypot(ax, ay)
      this.aimX = ax / l
      this.aimY = ay / l
      if (Math.abs(ax) > 0.15) this.facing = ax > 0 ? 1 : -1
    }
    this.sprinting = sprint && (ax !== 0 || ay !== 0)
    const speed = this.sprinting ? s.sprint : s.speed
    const tvx = ax * speed
    const tvy = ay * speed
    const k = Math.min(1, s.turn * dt * (this.sprinting ? 0.7 : 1))
    this.vx += (tvx - this.vx) * k
    this.vy += (tvy - this.vy) * k
    // 外力（击退）
    this.vx += this.pushX
    this.vy += this.pushY
    this.pushX = 0
    this.pushY = 0
    this.x += (this.vx + drift.x) * dt
    this.y += (this.vy + drift.y) * dt
    this.x = clamp(this.x, space.minX + 10, space.maxX - 10)
    const top = space.ceilY(this.x) + 6
    const bot = space.floorY(this.x) - 12
    if (this.y < top) {
      this.y = top
      if (this.vy < 0) this.vy = 0
    }
    if (this.y > bot) {
      this.y = bot
      if (this.vy > 0) this.vy = 0
    }
    if (this.swingT > 0) this.swingT -= dt
    this.animT += dt * (2 + Math.hypot(this.vx, this.vy) / 40)
  }

  draw(range: number, time: number) {
    this.root.position.set(Math.round(this.x), Math.round(this.y))
    if (this.standing) {
      this.body.texture = tex(diverArt('stand', this.suitTier))
      this.body.rotation = 0
      this.body.scale.set(this.facing * 2, 2)
    } else {
      const moving = Math.hypot(this.vx, this.vy) > 10
      const f = moving ? Math.floor(this.animT) % 2 : Math.floor(time * 1.5) % 2
      this.body.texture = tex(diverArt(f ? 'swim1' : 'swim0', this.suitTier))
      this.body.scale.set(this.facing * 2, 2)
      const ang = Math.atan2(this.vy, Math.abs(this.vx) + 6)
      this.body.rotation = this.facing * clamp(ang * 0.85, -1.25, 1.25)
    }
    this.body.alpha = this.invulnT > 0 ? 0.5 + 0.5 * Math.sin(time * 30) : 1
    this.body.tint = this.stunT > 0 ? 0xffaaaa : 0xffffff
    const g = this.net
    g.clear()
    if (this.swingT > 0) {
      const k = 1 - this.swingT / 0.28
      const base = Math.atan2(this.aimY, this.aimX)
      const sweep = (k - 0.5) * 1.8
      const a0 = base - 0.9
      const a1 = base + 0.9
      g.moveTo(0, 0)
      const steps = 10
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps
        g.lineTo(Math.cos(a) * range, Math.sin(a) * range)
      }
      g.lineTo(0, 0)
      g.fill({ color: 0xffffff, alpha: 0.12 * (1 - k) })
      // 网圈
      const na = base + sweep
      const nx = Math.cos(na) * range * 0.75
      const ny = Math.sin(na) * range * 0.75
      g.moveTo(0, 0).lineTo(nx, ny).stroke({ width: 2, color: 0x8a6a3a })
      g.circle(nx, ny, range * 0.22).stroke({ width: 2, color: 0xe8e8e8, alpha: 0.9 })
      for (let i = -2; i <= 2; i++) {
        g.moveTo(nx + i * range * 0.08, ny - range * 0.2).lineTo(nx + i * range * 0.08, ny + range * 0.2).stroke({ width: 1, color: 0xe8e8e8, alpha: 0.4 })
      }
    }
  }

  hurt(dmg: number, fromX: number, fromY: number): boolean {
    if (this.invulnT > 0) return false
    this.hp -= dmg
    this.invulnT = 1
    this.regenT = 4
    this.stunT = 0.5
    const a = Math.atan2(this.y - fromY, this.x - fromX)
    this.vx = Math.cos(a) * 340
    this.vy = Math.sin(a) * 340
    return true
  }
}
