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
    // 全部使用整数坐标且互不重叠：容器整体半透明时，重叠区域会被叠加两次而形成黑线
    const size = Math.max(20, Math.round(radius * 2))
    const x0 = Math.round(sx - size / 2)
    const y0 = Math.round(sy - size / 2)
    const x1 = x0 + size
    const y1 = y0 + size
    this.hole.anchor.set(0)
    this.hole.width = this.hole.height = size
    this.hole.position.set(x0, y0)
    this.hole.tint = tint
    const g = this.rects
    g.clear()
    const W = Math.ceil(w)
    const H = Math.ceil(h)
    const top = Math.min(Math.max(0, y0), H)
    const bot = Math.max(Math.min(H, y1), 0)
    if (top > 0) g.rect(0, 0, W, top).fill(tint)
    if (bot < H) g.rect(0, bot, W, H - bot).fill(tint)
    if (bot > top) {
      if (x0 > 0) g.rect(0, top, Math.min(x0, W), bot - top).fill(tint)
      if (x1 < W) g.rect(Math.max(0, x1), top, W - Math.max(0, x1), bot - top).fill(tint)
    }
  }
}
