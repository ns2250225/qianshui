// 模板化像素鱼生成系统：Body × Tail × Fin × Pattern × Color × Eye × Features
// 纯 Canvas 实现，供 PixiJS 纹理与 Vue 图鉴图标共用。

import type { FishSpecies, BodyShape } from '../../data/fish/types'
import { hash2, noise2, hexToNum, shade, lerpColor, clamp } from '../core/rng'

interface ShapeP {
  a: number // 最大半高 / 长度
  peak: number
  ped: number
  tail: number
  blunt: number
  asym: number
  eyeT: number
  eyeY: number
  wave?: boolean
}

const SHAPES: Record<BodyShape, ShapeP> = {
  oval: { a: 0.3, peak: 0.55, ped: 0.35, tail: 0.2, blunt: 2, asym: 0, eyeT: 0.84, eyeY: -0.35 },
  deep: { a: 0.46, peak: 0.55, ped: 0.24, tail: 0.15, blunt: 2, asym: 0, eyeT: 0.84, eyeY: -0.25 },
  disc: { a: 0.55, peak: 0.5, ped: 0.2, tail: 0.13, blunt: 2, asym: 0, eyeT: 0.85, eyeY: -0.3 },
  fusiform: { a: 0.2, peak: 0.6, ped: 0.12, tail: 0.22, blunt: 1.6, asym: 0, eyeT: 0.87, eyeY: -0.25 },
  slender: { a: 0.15, peak: 0.6, ped: 0.32, tail: 0.18, blunt: 1.7, asym: 0, eyeT: 0.87, eyeY: -0.3 },
  arrow: { a: 0.075, peak: 0.55, ped: 0.5, tail: 0.1, blunt: 1.3, asym: 0, eyeT: 0.86, eyeY: -0.3 },
  eel: { a: 0.07, peak: 0.75, ped: 0.15, tail: 0, blunt: 1.8, asym: 0, eyeT: 0.93, eyeY: -0.35, wave: true },
  ribbon: { a: 0.05, peak: 0.88, ped: 0.35, tail: 0.04, blunt: 1.8, asym: 0, eyeT: 0.96, eyeY: -0.2, wave: true },
  robust: { a: 0.3, peak: 0.68, ped: 0.35, tail: 0.17, blunt: 2.2, asym: 0.05, eyeT: 0.85, eyeY: -0.45 },
  globe: { a: 0.42, peak: 0.55, ped: 0.3, tail: 0.14, blunt: 2.4, asym: 0, eyeT: 0.84, eyeY: -0.35 },
  box: { a: 0.36, peak: 0.5, ped: 0.35, tail: 0.14, blunt: 6, asym: 0, eyeT: 0.84, eyeY: -0.4 },
  flat: { a: 0.3, peak: 0.5, ped: 0.3, tail: 0.13, blunt: 2, asym: 0, eyeT: 0.85, eyeY: -0.55 },
  shark: { a: 0.14, peak: 0.6, ped: 0.2, tail: 0.24, blunt: 1.4, asym: 0.08, eyeT: 0.86, eyeY: -0.25 },
  ray: { a: 0.45, peak: 0.55, ped: 0, tail: 0, blunt: 1, asym: 0, eyeT: 0.9, eyeY: 0 },
  sunfish: { a: 0.48, peak: 0.45, ped: 0.6, tail: 0.07, blunt: 2, asym: 0, eyeT: 0.83, eyeY: -0.3 },
  seahorse: { a: 0.3, peak: 0.5, ped: 0.3, tail: 0, blunt: 2, asym: 0, eyeT: 0.8, eyeY: -0.3 },
  angler: { a: 0.42, peak: 0.72, ped: 0.22, tail: 0.15, blunt: 3, asym: 0.1, eyeT: 0.82, eyeY: -0.5 },
  hatchet: { a: 0.42, peak: 0.66, ped: 0.1, tail: 0.15, blunt: 2, asym: 0.4, eyeT: 0.85, eyeY: -0.45 },
  gulper: { a: 0.12, peak: 0.9, ped: 0.05, tail: 0, blunt: 1.5, asym: 0.4, eyeT: 0.97, eyeY: -0.6, wave: true },
  tapered: { a: 0.17, peak: 0.8, ped: 0.06, tail: 0.08, blunt: 2, asym: 0.05, eyeT: 0.88, eyeY: -0.35 },
  tadpole: { a: 0.24, peak: 0.78, ped: 0.08, tail: 0.08, blunt: 2.2, asym: 0, eyeT: 0.86, eyeY: -0.35 },
}

/** 显示长度（屏幕像素） */
export function fishLengthPx(cm: number, shape?: BodyShape): number {
  let px = 22 * Math.pow(cm / 10, 0.5)
  if (shape === 'ribbon' || shape === 'eel') px *= 1.25
  if (shape === 'seahorse') px *= 1.3
  return clamp(px, 14, 360)
}

export function artScale(px: number): number {
  return px <= 56 ? 2 : px <= 150 ? 3 : 4
}

class Pix {
  w: number
  h: number
  buf: Int32Array
  body: Uint8Array
  constructor(w: number, h: number) {
    this.w = Math.max(1, Math.ceil(w))
    this.h = Math.max(1, Math.ceil(h))
    this.buf = new Int32Array(this.w * this.h).fill(-1)
    this.body = new Uint8Array(this.w * this.h)
  }
  set(x: number, y: number, c: number, isBody = false) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.buf[y * this.w + x] = c
    if (isBody) this.body[y * this.w + x] = 1
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1
    return this.buf[y * this.w + x]
  }
  isBody(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false
    return this.body[y * this.w + x] === 1
  }
  disc(cx: number, cy: number, r: number, c: number, isBody = false) {
    const r2 = r * r
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r2 + 0.3) this.set(x, y, c, isBody)
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c)
  }
  outline(f: number) {
    const out: [number, number, number][] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!this.isBody(x, y)) continue
        if (!this.isBody(x - 1, y) || !this.isBody(x + 1, y) || !this.isBody(x, y - 1) || !this.isBody(x, y + 1)) {
          out.push([x, y, shade(this.buf[y * this.w + x], f)])
        }
      }
    for (const [x, y, c] of out) this.buf[y * this.w + x] = c
  }
  toCanvas(silhouette = false, silColor = 0x0b1220): HTMLCanvasElement {
    const cv = document.createElement('canvas')
    cv.width = this.w
    cv.height = this.h
    const ctx = cv.getContext('2d')!
    const img = ctx.createImageData(this.w, this.h)
    for (let i = 0; i < this.buf.length; i++) {
      const c = this.buf[i]
      if (c < 0) continue
      const col = silhouette ? silColor : c
      img.data[i * 4] = (col >> 16) & 255
      img.data[i * 4 + 1] = (col >> 8) & 255
      img.data[i * 4 + 2] = col & 255
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    return cv
  }
}

function profile(t: number, P: ShapeP): number {
  if (t < 0) return P.ped
  if (t > 1) return 0
  if (t < P.peak) {
    const u = (P.peak - t) / P.peak
    return P.ped + (1 - P.ped) * Math.sqrt(Math.max(0, 1 - u * u))
  }
  const u = (t - P.peak) / (1 - P.peak)
  return Math.pow(Math.max(0, 1 - Math.pow(u, P.blunt)), 0.5)
}

interface Colors {
  c1: number
  c2: number
  c3: number
  glow: number
}

function patternColor(sp: FishSpecies, C: Colors, t: number, ny: number, x: number, y: number, N: number): number {
  const p = sp.art.pattern
  const belly = smooth01((ny - 0.15) / 0.75)
  let c = lerpColor(C.c1, C.c3, belly * 0.85)
  switch (p) {
    case 'gradient':
      c = lerpColor(C.c1, C.c3, smooth01((ny + 0.6) / 1.4))
      break
    case 'stripes_v': {
      const n = N > 40 ? 5 : 4
      if (Math.floor(t * n * 2 + 0.5) % 2 === 1 && t < 0.92) c = C.c2
      break
    }
    case 'stripes_h': {
      const k = Math.round(ny * 4)
      if ((k === -2 || k === 0 || k === 2) && Math.abs(ny * 4 - k) < 0.35) c = C.c2
      break
    }
    case 'spots':
      if (hash2(Math.floor(x / 1.5), Math.floor(y / 1.5), 7) > 0.8) c = C.c2
      break
    case 'dots_dark':
      if (hash2(x, y, 9) > 0.86) c = C.c2
      break
    case 'bands_white': {
      for (const bc of [0.18, 0.52, 0.84]) {
        const d = Math.abs(t - bc)
        if (d < 0.07) c = C.c2
        else if (d < 0.07 + 1.2 / N) c = 0x111111
      }
      break
    }
    case 'eyespot': {
      const dx = (t - 0.22) * N
      const dy = ny * N * 0.3 + N * 0.07
      const r = Math.max(1.2, N * 0.07)
      if (dx * dx + dy * dy < r * r) c = C.c2
      break
    }
    case 'mottled': {
      const v = noise2(x / 3, y / 3, 3)
      c = lerpColor(c, C.c2, smooth01((v - 0.45) / 0.3) * 0.8)
      break
    }
    case 'reticulated': {
      const v = noise2(x / 2.2, y / 2.2, 5)
      if (Math.abs(v - 0.5) < 0.07) c = C.c2
      break
    }
    case 'saddle': {
      if (ny < 0.1) {
        for (const sc of [0.28, 0.62]) if (Math.abs(t - sc) < 0.09) c = C.c2
      }
      break
    }
    case 'mask':
      if (t > 0.78 && t < 0.92) c = C.c2
      break
    case 'half':
      if (t < 0.45 || ny > 0.45) c = C.c2
      break
  }
  return c
}

function smooth01(v: number) {
  const t = clamp(v, 0, 1)
  return t * t * (3 - 2 * t)
}

function colorsOf(sp: FishSpecies): Colors {
  return {
    c1: hexToNum(sp.art.c1),
    c2: hexToNum(sp.art.c2),
    c3: hexToNum(sp.art.c3),
    glow: sp.glow ? hexToNum(sp.glow) : 0x9fffff,
  }
}

function has(sp: FishSpecies, f: string) {
  return sp.art.features.includes(f)
}

// ─────────────────── 通用鱼体 ───────────────────
function drawGeneric(sp: FishSpecies, N: number, frame: number): Pix {
  const shape = sp.art.shape
  const P = SHAPES[shape] ?? SHAPES.oval
  const C = colorsOf(sp)
  const tailShape = P.tail === 0 ? 'none' : sp.art.tail
  const tailLen = tailShape === 'none' ? 0 : Math.max(2, Math.round(N * P.tail))
  const bodyLen = N - tailLen
  const H0 = Math.max(2, Math.round(N * P.a))
  const fin = sp.art.fin
  const isShark = shape === 'shark'
  const longtail = has(sp, 'longtail') ? Math.round(N * 0.45) : 0
  const bill = has(sp, 'bill') ? Math.round(N * 0.28) : has(sp, 'snout') ? Math.max(2, Math.round(N * 0.1)) : 0
  let topM = 1
  if (fin === 'sail') topM = H0 * 1.5
  else if (fin === 'tall' || isShark) topM = H0 * 1.0
  else if (fin === 'crest') topM = H0 * 0.9
  else if (fin === 'spiny') topM = H0 * 0.75
  else if (fin === 'long' || fin === 'small') topM = H0 * 0.4 + 1
  if (shape === 'sunfish') topM = H0 * 0.9
  if (has(sp, 'lure')) topM = Math.max(topM, H0 * 1.0 + 2)
  if (has(sp, 'hump')) topM = Math.max(topM, H0 * 0.45)
  if (has(sp, 'hammer')) topM = Math.max(topM, H0 * 0.9)
  if (has(sp, 'leafy') || has(sp, 'spines')) topM += 2
  let botM = H0 * 0.45 + 1
  if (has(sp, 'longfins')) botM = H0 * 1.1
  if (has(sp, 'tripod')) botM = H0 * 2.2
  if (has(sp, 'barbel')) botM = Math.max(botM, 4)
  if (isShark) botM = Math.max(botM, H0 * 1.0)
  if (shape === 'sunfish') botM = H0 * 0.9
  if (has(sp, 'hammer')) botM = Math.max(botM, H0 * 0.9)
  if (has(sp, 'leafy') || has(sp, 'spines')) botM += 2
  if (has(sp, 'longtail')) topM = Math.max(topM, H0 * 1.2)
  const waveAmp = P.wave ? Math.max(1, H0 * 0.7) : 0
  topM += waveAmp
  botM += waveAmp
  const tailSpanF: Record<string, number> = { fork: 0.95, lunate: 1.05, round: 0.75, truncate: 0.8, pointed: 0.5, lyre: 1.2, hetero: 1.1, none: 0 }
  const tailS = H0 * (tailSpanF[tailShape] ?? 0.8)
  topM = Math.max(topM, tailS - H0 + 1)
  botM = Math.max(botM, tailS - H0 + 1)
  const W = N + bill + longtail + 4
  const Hh = Math.ceil(topM + H0 * 2 * (1 + P.asym) + botM + 4)
  const pix = new Pix(W, Hh)
  const x0 = 2 + longtail // 尾尖
  const bx0 = x0 + tailLen // 尾柄
  const bx1 = x0 + N // 吻端
  const cy = Math.round(2 + topM + H0 * (1 - P.asym))
  const yOff = (x: number) => (P.wave ? Math.round(Math.sin(((x - x0) / N) * Math.PI * 2.2 + frame * Math.PI) * waveAmp * (1 - (x - x0) / N * 0.6)) : 0)
  const bend = frame === 1 && !P.wave ? Math.max(1, Math.round(H0 * 0.18)) : 0

  const finC = shade(C.c1, 0.78)
  const finC2 = shade(C.c2, 0.85)
  const halfTop = (t: number) => {
    let h = profile(t, P) * (1 - P.asym) * H0
    if (has(sp, 'hump') && t > 0.6 && t < 0.97) h += H0 * 0.35 * Math.sin(((t - 0.6) / 0.37) * Math.PI)
    if (shape === 'box') h = Math.min(h, H0 * 0.95)
    return h
  }
  const halfBot = (t: number) => {
    let h = profile(t, P) * (1 + P.asym) * H0
    if (isShark) h *= 0.85
    if (shape === 'box') h = Math.min(h, H0 * 0.95)
    return h
  }

  // ── 背鳍 / 臀鳍（先画，位于身体后方）
  const drawFinUp = (t0: number, t1: number, height: number, col: number, kind: 'curve' | 'tri' | 'spiny' | 'crest') => {
    for (let x = bx0; x < bx1; x++) {
      const t = (x - bx0) / bodyLen
      if (t < t0 || t > t1) continue
      const u = (t - t0) / (t1 - t0)
      let fh = 0
      if (kind === 'curve') fh = height * Math.pow(Math.sin(u * Math.PI), 0.7)
      else if (kind === 'tri') fh = height * (u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7 * 0.9) * (u < 0.98 ? 1 : 0)
      else if (kind === 'spiny') fh = (x % 2 === 0 ? height : height * 0.45) * Math.pow(Math.sin(u * Math.PI), 0.4)
      else if (kind === 'crest') fh = height * (0.5 + 0.5 * u) * (x % 3 === 0 ? 1 : 0.75)
      const top = cy - halfTop(t) + yOff(x)
      for (let y = Math.round(top - fh); y <= Math.round(top) + 1; y++) {
        let c = col
        if (kind === 'spiny' && sp.art.pattern === 'stripes_v' && (y + x) % 3 === 0) c = C.c2
        pix.set(x, y, c)
      }
    }
  }
  const drawFinDown = (t0: number, t1: number, height: number, col: number) => {
    for (let x = bx0; x < bx1; x++) {
      const t = (x - bx0) / bodyLen
      if (t < t0 || t > t1) continue
      const u = (t - t0) / (t1 - t0)
      const fh = height * Math.pow(Math.sin(u * Math.PI), 0.7)
      const bot = cy + halfBot(t) + yOff(x)
      for (let y = Math.round(bot) - 1; y <= Math.round(bot + fh); y++) pix.set(x, y, col)
    }
  }

  if (isShark) {
    drawFinUp(0.42, 0.62, H0 * 1.05, shade(C.c1, 0.85), 'tri')
    drawFinUp(0.08, 0.16, H0 * 0.35, shade(C.c1, 0.85), 'tri')
    drawFinDown(0.12, 0.2, H0 * 0.3, shade(C.c1, 0.85))
  } else if (shape === 'sunfish') {
    drawFinUp(0.04, 0.24, H0 * 0.85, finC, 'tri')
    drawFinDown(0.04, 0.24, H0 * 0.85, finC)
  } else {
    switch (fin) {
      case 'small':
        drawFinUp(0.35, 0.68, H0 * 0.35, finC, 'curve')
        break
      case 'tall':
        drawFinUp(0.3, 0.72, H0 * 0.95, shape === 'deep' || shape === 'disc' ? finC : finC, 'tri')
        break
      case 'spiny':
        drawFinUp(0.25, 0.75, H0 * 0.7, finC, 'spiny')
        break
      case 'long':
        drawFinUp(0.1, 0.88, H0 * 0.38, finC, 'curve')
        if (shape !== 'eel') drawFinDown(0.08, 0.5, H0 * 0.34, finC)
        break
      case 'crest':
        drawFinUp(0.0, 1.0, H0 * 0.7, C.c2, 'crest')
        break
      case 'sail':
        drawFinUp(0.18, 0.82, H0 * 1.45, finC2, 'curve')
        break
    }
    if (fin !== 'none' && fin !== 'long' && fin !== 'crest' && !P.wave && shape !== 'flat') drawFinDown(0.15, 0.36, H0 * 0.32, finC)
    if (shape === 'flat') {
      drawFinUp(0.0, 0.95, H0 * 0.28, finC, 'curve')
      drawFinDown(0.0, 0.85, H0 * 0.28, finC)
    }
    if (shape === 'eel' && fin === 'long') {
      drawFinUp(0.05, 0.85, Math.max(1, H0 * 0.35), finC, 'curve')
      drawFinDown(0.0, 0.5, Math.max(1, H0 * 0.3), finC)
    }
  }

  // ── 尾鳍
  if (tailLen > 0) {
    const base = Math.max(1, H0 * P.ped * 1.1)
    for (let x = x0 - longtail; x < bx0 + 1; x++) {
      const tx = (bx0 - x) / tailLen // 0 基部 → 1 尖端
      const yo = yOff(x) + Math.round(bend * Math.max(0, tx))
      let up = 0
      let down = 0
      let notch = 0
      switch (tailShape) {
        case 'truncate':
          up = down = base + (tailS - base) * Math.min(1, tx * 1.2)
          if (tx > 1) up = down = 0
          break
        case 'round':
          up = down = (base + (tailS - base) * Math.min(1, tx * 1.7)) * (tx > 0.55 ? Math.sqrt(Math.max(0, 1 - ((tx - 0.55) / 0.45) ** 2)) : 1)
          if (tx > 1) up = down = 0
          break
        case 'fork':
          up = down = tx > 1 ? 0 : base + (tailS - base) * tx
          if (tx > 0.4) notch = tailS * ((tx - 0.4) / 0.6) * 0.8
          break
        case 'lyre':
          up = down = tx > 1 ? 0 : base + (tailS - base) * Math.pow(tx, 0.8)
          if (tx > 0.25) notch = tailS * ((tx - 0.25) / 0.75) * 0.92
          break
        case 'lunate':
          up = down = tx > 1 ? 0 : base * 0.7 + (tailS - base * 0.7) * Math.pow(tx, 0.6)
          if (tx > 0.2) notch = tailS * Math.pow((tx - 0.2) / 0.8, 0.8) * 0.9
          break
        case 'pointed':
          up = down = tx > 1 ? 0 : base * (1 - tx) + 0.5
          break
        case 'hetero': {
          const longF = longtail ? (tx > 1 ? Math.max(0, 1 - (tx - 1) / (longtail / tailLen)) : 1) : tx > 1 ? 0 : 1
          up = (base + (tailS * 1.1 - base) * Math.min(1, tx)) * longF
          down = tx > 0.85 || tx > 1 ? 0 : base + (tailS * 0.55 - base) * Math.min(1, tx * 1.3)
          if (tx > 0.35) notch = tailS * ((tx - 0.35) / 0.65) * 0.55
          break
        }
      }
      if (longtail && tailShape !== 'hetero' && tx > 1) {
        const k = 1 - (tx - 1) / (longtail / tailLen)
        up = k > 0 ? Math.max(1, tailS * 0.25 * k) : 0
        down = 0
        notch = 0
      }
      if (up <= 0 && down <= 0) continue
      for (let y = Math.round(-up); y <= Math.round(down); y++) {
        if (Math.abs(y) < notch && Math.abs(y) > 0 && tx > 0.3) {
          if (!(longtail && y < 0)) continue
        }
        if (notch > 0 && y === 0 && tx > 0.45) continue
        let c = sp.art.pattern === 'half' && !isShark ? C.c2 : shade(C.c1, 0.85)
        if (sp.art.pattern === 'bands_white' && tx > 0.75) c = 0x111111
        if (has(sp, 'tipblack') && tx > 0.8) c = 0x15181c
        if (has(sp, 'tipwhite') && tx > 0.8) c = 0xffffff
        pix.set(x, cy + y + yo, c)
      }
    }
  }

  // ── 身体
  for (let x = bx0; x <= bx1; x++) {
    const t = (x - bx0) / bodyLen
    const top = halfTop(t)
    const bot = halfBot(t)
    if (top + bot < 0.5) continue
    const yo = yOff(x)
    for (let y = Math.round(-top); y <= Math.round(bot); y++) {
      const ny = y < 0 ? y / Math.max(0.5, top) : y / Math.max(0.5, bot)
      const c = patternColor(sp, C, t, ny, x, y + cy, N)
      pix.set(x, cy + y + yo, c, true)
    }
  }
  // 尾柄连接
  if (tailLen > 0) for (let y = -Math.round(H0 * P.ped); y <= Math.round(H0 * P.ped); y++) pix.set(bx0, cy + y + yOff(bx0), shade(C.c1, 0.9), true)

  pix.outline(has(sp, 'outline') ? 0.25 : 0.6)

  // ── 特征
  const eyeX = Math.round(bx0 + bodyLen * P.eyeT)
  const tE = P.eyeT
  const eyeY = Math.round(cy + (P.eyeY < 0 ? halfTop(tE) * P.eyeY : halfBot(tE) * P.eyeY) + yOff(eyeX))
  // 胸鳍
  if (!P.wave && shape !== 'flat' && shape !== 'box') {
    const px0 = Math.round(bx0 + bodyLen * (isShark ? 0.66 : 0.68))
    const py0 = Math.round(cy + halfBot(0.68) * 0.25)
    if (isShark) {
      for (let i = 0; i < H0 * 1.0; i++) pix.line(px0 + 1 - i * 0.2, py0 + i * 0.3 + H0 * 0.4, px0 - i * 0.9, py0 + H0 * 0.5 + i, shade(C.c1, 0.8))
    } else if (has(sp, 'longfins')) {
      for (let i = 0; i < 4; i++) pix.line(px0, py0, px0 - H0 * (0.8 + i * 0.25), py0 + H0 * (0.7 + i * 0.12), i % 2 ? C.c2 : shade(C.c1, 0.85))
    } else {
      const fl = Math.max(1, Math.round(H0 * 0.35))
      pix.line(px0, py0, px0 - fl, py0 + Math.max(0, fl - 1), shade(C.c1, 0.7))
    }
  }
  if (isShark) {
    // 鳃裂
    for (let i = 0; i < 3; i++) {
      const gx = Math.round(bx0 + bodyLen * (0.72 + i * 0.025))
      if (H0 >= 4) pix.line(gx, cy - H0 * 0.25, gx, cy + H0 * 0.25, shade(C.c1, 0.55))
    }
  }
  if (has(sp, 'frill')) {
    for (let i = 0; i < 4; i++) {
      const gx = Math.round(bx0 + bodyLen * (0.8 + i * 0.02))
      pix.line(gx, cy - H0 * 0.5 + yOff(gx), gx, cy + H0 * 0.7 + yOff(gx), 0xb04a4a)
    }
  }
  if (has(sp, 'finlets')) {
    for (let x = bx0 + 1; x < bx0 + bodyLen * 0.3; x += 2) {
      const t = (x - bx0) / bodyLen
      pix.set(x, cy - halfTop(t) - 1, 0xffd84a)
      pix.set(x, cy + halfBot(t) + 1, 0xffd84a)
    }
  }
  if (has(sp, 'photophores')) {
    for (let x = bx0 + 1; x < bx1 - 2; x += 2) {
      const t = (x - bx0) / bodyLen
      pix.set(x, cy + halfBot(t) * 0.7 + yOff(x), C.glow)
    }
  }
  if (has(sp, 'glowhead')) {
    pix.disc(eyeX - 1, eyeY + Math.max(1, H0 * 0.3), Math.max(1, H0 * 0.22), C.glow)
  }
  if (has(sp, 'spines')) {
    for (let x = bx0 + 1; x < bx1 - 1; x += 2) {
      const t = (x - bx0) / bodyLen
      if (hash2(x, 1, 11) > 0.5) pix.set(x, cy - halfTop(t) - 1, shade(C.c1, 0.6))
      if (hash2(x, 2, 11) > 0.5) pix.set(x, cy + halfBot(t) + 1, shade(C.c1, 0.6))
    }
  }
  if (has(sp, 'leafy')) {
    for (let x = bx0; x < bx1; x += 3) {
      const t = (x - bx0) / bodyLen
      if (hash2(x, 3, 12) > 0.4) pix.disc(x, cy - halfTop(t) - 2, 1.2, C.c2)
      if (hash2(x, 4, 12) > 0.5) pix.disc(x, cy + halfBot(t) + 2, 1.2, C.c3)
    }
  }
  // 吻部延伸 / 长吻
  if (bill > 0) {
    const ny = cy + Math.round(halfTop(0.98) * -0.1)
    const thick = has(sp, 'bill') ? 1 : Math.max(1, Math.round(H0 * 0.18))
    for (let i = 0; i < bill; i++) for (let k = 0; k < thick; k++) pix.set(bx1 + i, ny + k + yOff(bx1), has(sp, 'bill') ? shade(C.c1, 0.7) : C.c1)
  }
  if (has(sp, 'hammer')) {
    const hx = bx1 - Math.max(1, Math.round(N * 0.04))
    for (let y = -H0 * 0.85; y <= H0 * 0.85; y++) {
      pix.set(hx, cy + y, shade(C.c1, 0.9))
      pix.set(hx - 1, cy + y, shade(C.c1, 0.8))
    }
    pix.set(hx, cy - H0 * 0.85, 0x111111)
    pix.set(hx, cy + H0 * 0.85, 0x111111)
  }
  // 嘴
  const mouthLen = has(sp, 'bigmouth') ? Math.max(2, Math.round(bodyLen * 0.12)) : Math.max(1, Math.round(bodyLen * 0.04))
  const mY = Math.round(cy + Math.max(1, halfBot(0.95) * 0.2) + yOff(bx1))
  for (let i = 0; i < mouthLen; i++) pix.set(bx1 - i - 1, mY, 0x1a1010)
  if (has(sp, 'teeth')) for (let i = 1; i < mouthLen + 2; i += 2) pix.set(bx1 - i, mY - 1, 0xffffff)
  if (has(sp, 'bigmouth') && mouthLen > 2) for (let i = 0; i < mouthLen - 1; i++) pix.set(bx1 - i - 1, mY + 1, 0x3a1010)
  // 眼
  const big = has(sp, 'bigeye')
  const tiny = has(sp, 'tinyeye')
  let er = tiny ? 0 : Math.max(0.6, H0 * (big ? 0.22 : 0.13))
  if (shape === 'eel' || shape === 'ribbon' || shape === 'arrow') er = Math.max(0.6, H0 * 0.35)
  if (has(sp, 'hammer')) {
    // 眼睛在锤头两端，已画
  } else if (er < 1.2) {
    pix.set(eyeX, eyeY, 0x0a0a0a)
    if (!tiny && N > 14) pix.set(eyeX + 1, eyeY, 0xe8e8e8)
  } else {
    pix.disc(eyeX, eyeY, er + 0.6, 0xf2f2f2)
    pix.disc(eyeX + 0.3, eyeY, er - 0.3, 0x0a0a0a)
    pix.set(eyeX + Math.round(er * 0.4), eyeY - Math.round(er * 0.4), 0xffffff)
  }
  // 诱饵（鮟鱇）
  if (has(sp, 'lure')) {
    const sx = eyeX + 1
    const sy = cy - halfTop(0.85)
    const tipX = bx1 + Math.max(1, Math.round(N * 0.08))
    const tipY = sy - H0 * 0.9
    pix.line(sx, sy, sx + (tipX - sx) * 0.4, tipY, shade(C.c1, 0.9))
    pix.line(sx + (tipX - sx) * 0.4, tipY, tipX, tipY + 1, shade(C.c1, 0.9))
    pix.disc(tipX, tipY + 1, Math.max(1, N * 0.03), C.glow)
  }
  if (has(sp, 'barbel')) {
    const bxp = bx1 - Math.max(1, Math.round(bodyLen * 0.06))
    pix.line(bxp, mY + 1, bxp - 1, mY + Math.max(2, H0 * 0.6), shade(C.c1, 0.6))
  }
  if (has(sp, 'whiskers')) {
    for (let i = 0; i < 3; i++) pix.line(bx1 - 2 - i * 2, mY + 1, bx1 - 3 - i * 2, mY + 2 + Math.max(1, H0 * 0.4), shade(C.c2, 0.9))
    pix.line(eyeX, eyeY - er - 1, eyeX + 1, eyeY - er - Math.max(2, H0 * 0.4), shade(C.c2, 0.9))
  }
  if (has(sp, 'horns')) {
    const hy = cy - halfTop(0.9)
    pix.line(bx1 - 2, hy, bx1 + 1, hy - Math.max(1, H0 * 0.25), shade(C.c1, 0.8))
  }
  if (has(sp, 'tripod')) {
    const fy = cy + halfBot(0.6)
    pix.line(bx0 + bodyLen * 0.6, fy, bx0 + bodyLen * 0.5, fy + H0 * 2.1, 0x8a7a6a)
    pix.line(bx0 + bodyLen * 0.62, fy, bx0 + bodyLen * 0.72, fy + H0 * 2.1, 0x8a7a6a)
    pix.line(bx0 - 1, cy + 1, x0 - 2, cy + H0 * 2.1, 0x8a7a6a)
  }
  return pix
}

// ─────────────────── 鳐 / 蝠鲼（俯视轮廓） ───────────────────
function drawRay(sp: FishSpecies, N: number, frame: number): Pix {
  const C = colorsOf(sp)
  const span = Math.max(3, Math.round(N * 0.48))
  const manta = has(sp, 'horns')
  const tailL = manta ? Math.round(N * 0.25) : Math.round(N * 0.7)
  const W = N + tailL + 4
  const H = span * 2 + 5
  const pix = new Pix(W, H)
  const cy = Math.round(H / 2)
  const x0 = 2 + tailL
  const flap = frame === 1 ? 0.78 : 1
  for (let x = x0; x <= x0 + N; x++) {
    const t = (x - x0) / N
    const h = (t < 0.5 ? Math.pow(t / 0.5, 0.75) : Math.pow((1 - t) / 0.5, 0.55)) * span * flap
    for (let y = Math.round(-h); y <= Math.round(h); y++) {
      const ny = y / Math.max(1, h)
      let c = C.c1
      const p = sp.art.pattern
      if (p === 'spots' && hash2(x >> 1, (y + 50) >> 1, 13) > 0.8) c = C.c2
      else if (p === 'mottled') c = lerpColor(C.c1, C.c2, noise2(x / 3, y / 3, 2) * 0.6)
      else if (p === 'half' && Math.abs(ny) > 0.75) c = shade(C.c1, 0.75)
      if (Math.abs(y) < Math.max(1, span * 0.12) && t > 0.15) c = shade(c, 1.12)
      pix.set(x, cy + y, c, true)
    }
  }
  pix.outline(0.6)
  // 尾
  for (let i = 0; i < tailL; i++) pix.set(x0 - i, cy, shade(C.c1, 0.6))
  if (sp.danger) pix.set(x0 - Math.round(tailL * 0.3), cy - 1, 0xe8e8e8)
  // 头鳍
  if (manta) {
    pix.line(x0 + N, cy - 2, x0 + N + 2, cy - 3, shade(C.c1, 0.8))
    pix.line(x0 + N, cy + 2, x0 + N + 2, cy + 3, shade(C.c1, 0.8))
  }
  // 眼
  const ex = x0 + Math.round(N * 0.82)
  pix.set(ex, cy - Math.max(1, Math.round(span * 0.18)), 0x0a0a0a)
  pix.set(ex, cy + Math.max(1, Math.round(span * 0.18)), 0x0a0a0a)
  return pix
}

// ─────────────────── 海马 / 海龙 ───────────────────
function drawSeahorse(sp: FishSpecies, N: number, frame: number): Pix {
  const C = colorsOf(sp)
  const W = Math.round(N * 0.75) + 4
  const H = N + 4
  const pix = new Pix(W, H)
  const sway = frame === 1 ? 1 : 0
  const pts: [number, number, number][] = [
    [0.42, 0.1, 0.09],
    [0.34, 0.22, 0.075],
    [0.4, 0.36, 0.13],
    [0.45, 0.52, 0.125],
    [0.38, 0.68, 0.075],
    [0.3, 0.8, 0.05],
    [0.36, 0.91, 0.035],
    [0.48, 0.9, 0.028],
    [0.47, 0.83, 0.02],
  ]
  const ox = 2
  const oy = 2
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, ar] = pts[i]
    const [bx, by, br] = pts[i + 1]
    const steps = Math.ceil(N * 0.2)
    for (let s = 0; s <= steps; s++) {
      const u = s / steps
      const x = (ax + (bx - ax) * u) * N + ox + (ay > 0.5 ? sway * ((ay - 0.5) * 2) : 0)
      const y = (ay + (by - ay) * u) * N + oy
      const r = Math.max(0.6, (ar + (br - ar) * u) * N)
      pix.disc(x, y, r, 0, true)
    }
  }
  // 着色
  for (let y = 0; y < pix.h; y++)
    for (let x = 0; x < pix.w; x++) {
      if (!pix.isBody(x, y)) continue
      const t = y / H
      let c = lerpColor(C.c1, C.c3, (x / W) * 0.5)
      const p = sp.art.pattern
      if (p === 'stripes_h' && y % 3 === 0) c = C.c2
      else if ((p === 'spots' || p === 'dots_dark') && hash2(x, y, 21) > 0.82) c = C.c2
      else if (p === 'mottled') c = lerpColor(c, C.c2, noise2(x / 2, y / 2, 4) * 0.7)
      else if (p === 'stripes_v' && Math.floor(t * 10) % 2 === 0) c = C.c2
      else if (y % 2 === 0) c = shade(c, 0.92)
      pix.buf[y * pix.w + x] = c
    }
  pix.outline(0.6)
  // 吻
  const hx = pts[0][0] * N + ox
  const hy = pts[0][1] * N + oy
  const snoutL = Math.max(2, N * 0.24)
  for (let i = 0; i < snoutL; i++) {
    pix.set(hx + N * 0.06 + i, hy + N * 0.02 + i * 0.12, shade(C.c1, 0.85))
    if (N > 30) pix.set(hx + N * 0.06 + i, hy + N * 0.02 + i * 0.12 + 1, shade(C.c1, 0.85))
  }
  // 冠
  pix.set(hx - 1, hy - pts[0][2] * N - 1, shade(C.c1, 0.7))
  pix.set(hx, hy - pts[0][2] * N - 1, shade(C.c1, 0.7))
  // 背鳍
  const fx = 0.36 * N + ox - 0.12 * N
  const fy = 0.48 * N + oy
  for (let i = 0; i < Math.max(2, N * 0.12); i++) pix.line(fx, fy + i * 0.8, fx - N * 0.08, fy + i * 0.8 - N * 0.03, shade(C.c3, 1.1))
  // 叶状附肢
  if (has(sp, 'leafy')) {
    for (let i = 0; i < 7; i++) {
      const [px, py] = pts[Math.min(pts.length - 1, i + 1)]
      const dx = (i % 2 ? 1 : -1) * N * 0.14
      pix.line(px * N + ox, py * N + oy, px * N + ox + dx, py * N + oy - N * 0.06, i % 2 ? C.c2 : C.c3)
      pix.disc(px * N + ox + dx, py * N + oy - N * 0.06, Math.max(0.8, N * 0.03), i % 2 ? C.c2 : C.c3)
    }
  }
  if (has(sp, 'spines')) {
    for (let i = 1; i < 6; i++) {
      const [px, py, pr] = pts[i]
      pix.set(px * N + ox - pr * N - 1, py * N + oy, shade(C.c1, 0.6))
    }
  }
  // 眼
  pix.set(hx + 1, hy - 1, 0x0a0a0a)
  if (N > 24) pix.set(hx + 2, hy - 1, 0xffffff)
  return pix
}

const canvasCache = new Map<string, HTMLCanvasElement>()

/** 生成像素鱼画布（美术分辨率） */
export function fishCanvas(sp: FishSpecies, frame = 0, silhouette = false, displayPx?: number): HTMLCanvasElement {
  const px = displayPx ?? fishLengthPx(sp.size.max * 0.8, sp.art.shape)
  const scale = artScale(px)
  const N = Math.max(7, Math.round(px / scale))
  const key = `${sp.id}|${frame}|${silhouette ? 1 : 0}|${N}`
  const hit = canvasCache.get(key)
  if (hit) return hit
  let pix: Pix
  if (sp.art.shape === 'ray') pix = drawRay(sp, N, frame)
  else if (sp.art.shape === 'seahorse') pix = drawSeahorse(sp, N, frame)
  else pix = drawGeneric(sp, N, frame)
  const cv = pix.toCanvas(silhouette)
  canvasCache.set(key, cv)
  return cv
}

const iconCache = new Map<string, string>()

/** 图鉴图标 dataURL（统一画幅） */
export function fishIconURL(sp: FishSpecies, silhouette: boolean, big = false): string {
  const key = `${sp.id}|${silhouette}|${big}`
  const hit = iconCache.get(key)
  if (hit) return hit
  const target = big ? 72 : 40
  const src = fishCanvas(sp, 0, silhouette, Math.min(target * 2, Math.max(28, fishLengthPx(sp.size.max * 0.8, sp.art.shape))))
  const url = src.toDataURL()
  iconCache.set(key, url)
  return url
}
