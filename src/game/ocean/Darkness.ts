import { Container, Graphics, Sprite } from 'pixi.js'
import { tex } from '../core/tex'
import { darknessTex } from '../world/Art'

/** 深度黑暗遮罩：仅潜水灯周围可见 */
export class Darkness {
  root = new Container()
  hole: Sprite
  rects = new Graphics()
  fog = new Graphics()

  constructor() {
    this.hole = new Sprite(tex(darknessTex(), true))
    this.hole.anchor.set(0.5)
    this.root.addChild(this.hole, this.rects)
  }

  update(sx: number, sy: number, radius: number, alpha: number, w: number, h: number, tint = 0x000000) {
    this.root.alpha = alpha
    this.root.visible = alpha > 0.01
    if (!this.root.visible) return
    const r = Math.max(10, radius)
    this.hole.width = this.hole.height = r * 2
    this.hole.position.set(sx, sy)
    this.hole.tint = tint
    const g = this.rects
    g.clear()
    const x0 = sx - r
    const y0 = sy - r
    const x1 = sx + r
    const y1 = sy + r
    if (y0 > 0) g.rect(0, 0, w, y0 + 1).fill(tint)
    if (y1 < h) g.rect(0, y1 - 1, w, h - y1 + 1).fill(tint)
    if (x0 > 0) g.rect(0, Math.max(0, y0), x0 + 1, Math.min(h, y1) - Math.max(0, y0)).fill(tint)
    if (x1 < w) g.rect(x1 - 1, Math.max(0, y0), w - x1 + 1, Math.min(h, y1) - Math.max(0, y0)).fill(tint)
  }
}
