import { Container, Graphics, Sprite } from 'pixi.js'
import { tex, fishTex } from '../core/tex'
import * as Art from '../world/Art'
import type { Env } from './Env'
import type { Effects } from './Effects'
import { FISH } from '../../data/fish'
import { pick } from '../core/rng'
import { audio } from '../core/audio'

export class Surface {
  far = new Container() // 屏幕空间：天体、云、岛屿
  boatLayer = new Container() // 世界空间
  waves = new Graphics() // 世界空间
  overlay = new Container() // 屏幕空间：雨、雾、闪电
  boat: Sprite
  sky = new Graphics()
  stars = new Graphics()
  celestial = new Graphics()
  spout = new Graphics()
  rain = new Graphics()
  fog = new Graphics()
  flash = new Graphics()
  islands: { s: Sprite; x: number }[] = []
  clouds: { s: Sprite; x: number; y: number; sp: number }[] = []
  gulls: { s: Sprite; x: number; y: number; vx: number; t: number }[] = []
  jumper: { s: Sprite; x: number; t: number; dur: number; h: number; dir: number } | null = null
  jumperCd = 5
  spoutT = -1
  spoutX = 0
  spoutCd = 15
  boatX = 0
  boatY = 0
  boatRot = 0
  boatTargetX: number | null = null
  private rainDrops: { x: number; y: number; l: number }[] = []

  constructor(world: Container) {
    this.boat = new Sprite(tex(Art.boatArt()))
    this.boat.anchor.set(0.5, 0.82)
    this.boat.scale.set(2)
    this.boatLayer.addChild(this.boat)
    this.far.addChild(this.stars, this.celestial)
    for (let i = 0; i < 6; i++) {
      const s = new Sprite(tex(Art.islandArt(i + 3)))
      s.anchor.set(0.5, 1)
      s.scale.set(2)
      s.alpha = 0.55
      this.islands.push({ s, x: i * 1400 + (i % 2) * 500 })
      this.far.addChild(s)
    }
    for (let i = 0; i < 9; i++) {
      const s = new Sprite(tex(Art.cloudArt(i + 1)))
      s.anchor.set(0.5)
      s.scale.set(2 + (i % 3))
      this.clouds.push({ s, x: Math.random() * 3000, y: 30 + Math.random() * 160, sp: 4 + Math.random() * 10 })
      this.far.addChild(s)
    }
    this.far.addChild(this.spout)
    for (let i = 0; i < 5; i++) {
      const s = new Sprite(tex(Art.gull(0)))
      s.anchor.set(0.5)
      s.scale.set(2)
      this.gulls.push({ s, x: (Math.random() - 0.5) * 1200, y: -90 - Math.random() * 120, vx: (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40), t: Math.random() * 5 })
      this.boatLayer.addChild(s)
    }
    this.overlay.addChild(this.rain, this.fog, this.flash)
    for (let i = 0; i < 160; i++) this.rainDrops.push({ x: Math.random(), y: Math.random(), l: 6 + Math.random() * 10 })
  }

  waveY(x: number, t: number, amp: number): number {
    return Math.sin(x * 0.018 + t * 1.6) * amp + Math.sin(x * 0.047 - t * 2.2) * amp * 0.45 + Math.sin(x * 0.006 + t * 0.7) * amp * 0.8
  }

  update(dt: number, t: number, env: Env, camX: number, camY: number, zoom: number, sw: number, sh: number, fx: Effects, waterTop: number) {
    const amp = 2.5 * env.weather.wave
    // 船
    if (this.boatTargetX !== null) {
      const d = this.boatTargetX - this.boatX
      const step = Math.sign(d) * Math.min(Math.abs(d), 520 * dt)
      this.boatX += step
      if (Math.abs(d) < 2) this.boatTargetX = null
    }
    this.boatY = this.waveY(this.boatX, t, amp)
    this.boatRot = ((this.waveY(this.boatX + 40, t, amp) - this.waveY(this.boatX - 40, t, amp)) / 80) * 0.8
    this.boat.position.set(this.boatX, this.boatY + 2)
    this.boat.rotation = this.boatRot
    if (this.boatTargetX !== null) this.boat.scale.x = Math.sign(this.boatTargetX - this.boatX || 1) * 2
    // 海浪
    const vw = sw / zoom
    const vh = sh / zoom
    const g = this.waves
    g.clear()
    const top = camY - vh / 2
    const visibleSurface = top < 120 && camY + vh / 2 > -120
    g.visible = visibleSurface
    const [skyTop, hor] = env.skyColors()
    if (visibleSurface) {
      const x0 = Math.floor((camX - vw / 2) / 4) * 4 - 8
      const x1 = camX + vw / 2 + 8
      for (let x = x0; x < x1; x += 4) {
        const h = Math.round(this.waveY(x, t, amp))
        if (h < 0) {
          g.rect(x, h, 4, -h + 1).fill(waterTop)
          g.rect(x, h, 4, 2).fill({ color: 0xffffff, alpha: 0.8 })
        } else {
          g.rect(x, 0, 4, h).fill(hor)
          g.rect(x, h, 4, 2).fill({ color: 0xffffff, alpha: 0.7 })
        }
        g.rect(x, Math.max(h, 0) + 2, 4, 3).fill({ color: 0xbff4ff, alpha: 0.25 })
      }
    }
    // 海鸥
    for (const gl of this.gulls) {
      gl.t += dt
      gl.x += gl.vx * dt
      gl.y += Math.sin(gl.t * 1.3) * 10 * dt
      if (gl.x - camX > 900) gl.x -= 1800
      if (gl.x - camX < -900) gl.x += 1800
      gl.s.texture = tex(Art.gull(Math.floor(gl.t * 4) % 2))
      gl.s.position.set(gl.x, gl.y)
      gl.s.scale.x = gl.vx > 0 ? 2 : -2
      gl.s.visible = !env.isNight
    }
    // 跃出水面的鱼
    this.jumperCd -= dt
    if (!this.jumper && this.jumperCd <= 0 && visibleSurface) {
      this.jumperCd = 4 + Math.random() * 8
      const pool = FISH.filter((f) => f.depth.min <= 5 && f.size.max < 120 && (f.habitat.includes('pelagic') || f.habitat.includes('coral_reef')))
      const sp = pick(Math.random, pool)
      const ft = fishTex(sp)
      const s = new Sprite(ft.frames[0])
      s.anchor.set(0.5)
      s.scale.set(ft.scale)
      this.boatLayer.addChild(s)
      const dir = Math.random() < 0.5 ? -1 : 1
      this.jumper = { s, x: camX + (Math.random() - 0.5) * vw * 0.8, t: 0, dur: 1.1, h: 50 + Math.random() * 50, dir }
      fx.splash(this.jumper.x, 0, 12)
    }
    if (this.jumper) {
      const j = this.jumper
      j.t += dt
      const u = j.t / j.dur
      const x = j.x + j.dir * u * 90
      const y = -Math.sin(u * Math.PI) * j.h + 6
      j.s.position.set(x, y)
      j.s.rotation = j.dir * (u - 0.5) * 2
      j.s.scale.x = Math.abs(j.s.scale.x) * j.dir
      if (u >= 1) {
        fx.splash(x, 0, 14)
        j.s.destroy()
        this.jumper = null
      }
    }
    // ── 屏幕空间：天空元素
    const horizonY = sh / 2 + (0 - camY) * zoom
    this.far.visible = horizonY > 0
    if (this.far.visible) {
      // 天体
      const c = this.celestial
      c.clear()
      const h = env.hour
      const isDay = h >= 5.5 && h < 19.5
      const u = isDay ? (h - 5.5) / 14 : ((h + 24 - 19.5) % 24) / 9.5
      const cx = sw * (0.1 + 0.8 * u)
      const cy = horizonY - Math.sin(u * Math.PI) * Math.min(horizonY * 0.85, 320) - 10
      if (isDay) {
        c.circle(cx, cy, 34).fill({ color: 0xfff6c0, alpha: 0.25 * env.weather.light })
        c.circle(cx, cy, 22).fill({ color: h > 17 || h < 7 ? 0xffb06a : 0xfff4a0, alpha: env.weather.light })
      } else {
        c.circle(cx, cy, 16).fill({ color: 0xeef0ff, alpha: 0.9 * env.weather.light + 0.1 })
        c.circle(cx + 6, cy - 4, 13).fill({ color: skyTop, alpha: 0.9 })
      }
      const st = this.stars
      st.clear()
      if (env.isNight && env.weather.light > 0.7) {
        for (let i = 0; i < 70; i++) {
          const x = (i * 7919) % sw
          const y = ((i * 104729) % Math.max(1, horizonY - 20))
          st.rect(x, y, 2, 2).fill({ color: 0xffffff, alpha: 0.4 + 0.4 * Math.sin(t * 2 + i) })
        }
      }
      for (const isl of this.islands) {
        const px = (((isl.x - camX * 0.12) % 8400) + 8400) % 8400 - 1200
        isl.s.position.set(px, horizonY + 2)
        isl.s.tint = env.isNight ? 0x3a4a6a : 0xffffff
      }
      for (const cl of this.clouds) {
        cl.x += cl.sp * dt
        const px = (((cl.x - camX * 0.06) % (sw + 600)) + sw + 600) % (sw + 600) - 300
        cl.s.position.set(px, horizonY - 120 - cl.y * Math.min(1, horizonY / 500))
        const grey = env.weather.id === 'sunny' ? 0xffffff : env.weather.id === 'cloudy' || env.weather.id === 'fog' ? 0xc8ccd4 : 0x6a707c
        cl.s.tint = env.isNight ? 0x4a5070 : grey
        cl.s.alpha = env.weather.id === 'sunny' ? 0.85 : 1
      }
      // 远处鲸鱼喷水
      this.spoutCd -= dt
      if (this.spoutCd <= 0 && this.spoutT < 0) {
        this.spoutCd = 18 + Math.random() * 30
        this.spoutT = 0
        this.spoutX = sw * (0.15 + Math.random() * 0.7)
      }
      const sg = this.spout
      sg.clear()
      if (this.spoutT >= 0) {
        this.spoutT += dt
        const k = this.spoutT / 2.2
        sg.rect(this.spoutX - 14, horizonY - 4, 28, 5).fill({ color: 0x2a3a4a, alpha: 0.8 })
        for (let i = 0; i < 14; i++) {
          const a = -Math.PI / 2 + (i - 7) * 0.09
          const r = Math.sin(Math.min(1, k) * Math.PI) * 40 * (0.6 + (i % 3) * 0.2)
          sg.rect(this.spoutX + Math.cos(a) * r, horizonY - 4 + Math.sin(a) * r, 3, 3).fill({ color: 0xffffff, alpha: 0.8 * (1 - k) })
        }
        if (k >= 1) this.spoutT = -1
      }
    }
    // 雨 / 雾 / 闪电
    const rg = this.rain
    rg.clear()
    const showRain = env.weather.rain > 0 && horizonY > 0
    if (showRain) {
      const n = Math.floor(this.rainDrops.length * env.weather.rain)
      for (let i = 0; i < n; i++) {
        const d = this.rainDrops[i]
        d.y += dt * 1.6
        if (d.y > 1) {
          d.y -= 1
          d.x = Math.random()
        }
        const x = d.x * sw
        const y = d.y * horizonY
        rg.rect(x, y, 1, d.l).fill({ color: 0xc8d8f0, alpha: 0.5 })
      }
    }
    const fg = this.fog
    fg.clear()
    const fogA = env.weather.fog * Math.max(0, 1 - Math.max(0, camY) / 1200)
    if (fogA > 0.01) fg.rect(0, 0, sw, sh).fill({ color: 0xc8d0d8, alpha: fogA * 0.6 })
    const fl = this.flash
    fl.clear()
    if (env.lightning > 0.01) {
      const k = env.lightning * Math.max(0.1, 1 - Math.max(0, camY) / 800)
      fl.rect(0, 0, sw, sh).fill({ color: 0xffffff, alpha: k * 0.6 })
    }
  }

  drawSky(sw: number, sh: number, camY: number, zoom: number, env: Env) {
    // 由 Game 背景统一绘制
  }

  playThunder() {
    audio.sfx('thunder')
  }
}
