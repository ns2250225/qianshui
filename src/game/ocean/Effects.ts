import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import { tex } from '../core/tex'
import { bubble, particle, glowTex } from '../world/Art'
import { yToDepth } from '../core/constants'
import { currentAt } from '../world/Terrain'

interface P {
  s: Sprite
  vx: number
  vy: number
  life: number
  max: number
  kind: 'bubble' | 'splash' | 'smoke' | 'spark' | 'debris'
  wob: number
}

/** 粒子：气泡、水花、烟柱、闪光 */
export class Effects {
  world: Container
  glow: Container
  parts: P[] = []
  snow: Sprite[] = []
  streaks: Sprite[] = []
  rays = new Graphics()
  private texB: Texture
  private texP: Texture
  private texG: Texture

  constructor(world: Container, glow: Container) {
    this.world = world
    this.glow = glow
    this.texB = tex(bubble())
    this.texP = tex(particle())
    this.texG = tex(glowTex(), true)
    for (let i = 0; i < 90; i++) {
      const s = new Sprite(this.texP)
      s.alpha = 0
      s.scale.set(Math.random() < 0.3 ? 1 : 0.6)
      this.snow.push(s)
      world.addChild(s)
    }
    for (let i = 0; i < 40; i++) {
      const s = new Sprite(this.texP)
      s.alpha = 0
      s.scale.set(6 + Math.random() * 10, 0.5)
      this.streaks.push(s)
      world.addChild(s)
    }
  }

  bubble(x: number, y: number, n = 1, spread = 4) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 500) return
      const s = new Sprite(this.texB)
      s.anchor.set(0.5)
      const sc = 0.5 + Math.random() * 0.8
      s.scale.set(sc)
      s.alpha = 0.7
      s.position.set(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread)
      this.world.addChild(s)
      this.parts.push({ s, vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 40, life: 0, max: 2 + Math.random() * 3, kind: 'bubble', wob: Math.random() * 6 })
    }
  }

  splash(x: number, y: number, n = 40) {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.texP)
      s.anchor.set(0.5)
      s.scale.set(1 + Math.random() * 1.5)
      s.position.set(x + (Math.random() - 0.5) * 30, y)
      s.tint = Math.random() < 0.5 ? 0xffffff : 0xbfe8ff
      this.world.addChild(s)
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
      const sp = 120 + Math.random() * 240
      this.parts.push({ s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.8 + Math.random() * 0.6, kind: 'splash', wob: 0 })
    }
    this.bubble(x, y + 30, 30, 50)
  }

  smoke(x: number, y: number, hot = true) {
    if (this.parts.length > 500) return
    const s = new Sprite(this.texG)
    s.anchor.set(0.5)
    s.scale.set(0.3 + Math.random() * 0.2)
    s.tint = hot ? 0x3a3434 : 0x8a8a90
    s.alpha = 0.7
    s.position.set(x + (Math.random() - 0.5) * 6, y)
    this.world.addChild(s)
    this.parts.push({ s, vx: (Math.random() - 0.5) * 12, vy: -40 - Math.random() * 30, life: 0, max: 3 + Math.random() * 2, kind: 'smoke', wob: 0 })
  }

  sparkle(x: number, y: number, n = 14, color = 0xffe680) {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.texG)
      s.anchor.set(0.5)
      s.scale.set(0.12 + Math.random() * 0.15)
      s.tint = color
      s.blendMode = 'add'
      s.position.set(x, y)
      this.glow.addChild(s)
      const a = Math.random() * Math.PI * 2
      const sp = 40 + Math.random() * 90
      this.parts.push({ s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.6 + Math.random() * 0.5, kind: 'spark', wob: 0 })
    }
  }

  debris(x: number, y: number, n = 20) {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.texP)
      s.anchor.set(0.5)
      s.scale.set(1 + Math.random() * 2)
      s.tint = Math.random() < 0.5 ? 0x5a4a3a : 0xff6a2a
      s.position.set(x + (Math.random() - 0.5) * 200, y)
      this.world.addChild(s)
      this.parts.push({ s, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 120, life: 0, max: 2 + Math.random() * 2, kind: 'debris', wob: 0 })
    }
  }

  update(dt: number, camX: number, camY: number, vw: number, vh: number, time: number, daylight: number, interior: boolean) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]
      p.life += dt
      const k = p.life / p.max
      if (p.kind === 'bubble') {
        p.s.x += (p.vx + Math.sin(time * 4 + p.wob) * 12) * dt
        p.s.y += p.vy * dt
        p.s.alpha = 0.7 * (1 - k)
        if (p.s.y < 2 && !interior) p.life = p.max
      } else if (p.kind === 'splash') {
        p.vy += 500 * dt
        p.s.x += p.vx * dt
        p.s.y += p.vy * dt
        p.s.alpha = 1 - k
        if (p.s.y > 4 && p.vy > 0) p.life = p.max
      } else if (p.kind === 'smoke') {
        p.s.x += p.vx * dt
        p.s.y += p.vy * dt
        p.s.scale.set(p.s.scale.x + dt * 0.25)
        p.s.alpha = 0.7 * (1 - k)
      } else if (p.kind === 'spark') {
        p.vx *= 1 - dt * 3
        p.vy *= 1 - dt * 3
        p.s.x += p.vx * dt
        p.s.y += p.vy * dt
        p.s.alpha = 1 - k
      } else {
        p.vy += 80 * dt
        p.s.x += p.vx * dt
        p.s.y += p.vy * dt
        p.s.alpha = 1 - k
      }
      if (p.life >= p.max) {
        p.s.destroy()
        this.parts.splice(i, 1)
      }
    }
    // 海洋雪
    const depth = yToDepth(camY)
    const snowA = interior ? 0.35 : Math.min(0.6, 0.1 + depth / 1500)
    const bw = vw + 100
    const bh = vh + 100
    for (let i = 0; i < this.snow.length; i++) {
      const s = this.snow[i]
      if (s.alpha === 0 && s.x === 0) {
        s.x = camX + (Math.random() - 0.5) * bw
        s.y = camY + (Math.random() - 0.5) * bh
      }
      s.y += (6 + (i % 5) * 2) * dt
      s.x += Math.sin(time * 0.5 + i) * 3 * dt
      if (s.x < camX - bw / 2) s.x += bw
      if (s.x > camX + bw / 2) s.x -= bw
      if (s.y < camY - bh / 2) s.y += bh
      if (s.y > camY + bh / 2) s.y -= bh
      s.visible = s.y > 6
      s.alpha = snowA * (0.4 + (i % 3) * 0.3) + 0.0001
      s.tint = depth < 100 ? 0xd8f0ff : 0xe0e0e0
    }
    // 洋流粒子
    for (let i = 0; i < this.streaks.length; i++) {
      const s = this.streaks[i]
      const c = interior ? { vx: 0, level: 0 } : currentAt(s.x, s.y)
      if (c.level === 0 || s.x < camX - bw / 2 || s.x > camX + bw / 2 || s.y < camY - bh / 2 || s.y > camY + bh / 2) {
        s.x = camX + (Math.random() - 0.5) * bw
        s.y = camY + (Math.random() - 0.5) * bh
        s.alpha = 0
        continue
      }
      s.x += c.vx * dt * 1.6
      s.alpha = Math.min(0.35, s.alpha + dt) * (0.5 + c.level * 0.25)
    }
    // 光柱
    const g = this.rays
    g.clear()
    if (!interior && camY - vh / 2 < 1400 && daylight > 0.3) {
      const a0 = 0.07 * daylight
      const start = Math.floor((camX - vw) / 260)
      for (let i = start; i < start + Math.ceil((vw * 2) / 260) + 1; i++) {
        const bx = i * 260 + Math.sin(i * 12.9) * 80
        const sway = Math.sin(time * 0.3 + i) * 30
        const w = 30 + ((i * 7919) % 50)
        const len = 700 + ((i * 104729) % 600)
        const alpha = a0 * (0.5 + 0.5 * Math.sin(time * 0.6 + i * 1.7))
        g.poly([bx, 0, bx + w, 0, bx + w + 160 + sway, len, bx + 140 + sway, len]).fill({ color: 0xe8fbff, alpha })
      }
    }
  }
}
