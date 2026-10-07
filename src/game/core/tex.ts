import { Texture } from 'pixi.js'
import type { FishSpecies } from '../../data/fish/types'
import { fishCanvas, fishLengthPx, artScale } from '../fish/FishArt'

const map = new WeakMap<HTMLCanvasElement, Texture>()

export function tex(cv: HTMLCanvasElement, linear = false): Texture {
  let t = map.get(cv)
  if (!t) {
    t = Texture.from(cv)
    t.source.scaleMode = linear ? 'linear' : 'nearest'
    map.set(cv, t)
  }
  return t
}

export interface FishTex {
  frames: [Texture, Texture]
  /** 美术像素 → 屏幕像素 的缩放 */
  scale: number
  /** 标准显示长度 */
  stdPx: number
}

const fishMap = new Map<string, FishTex>()

export function fishTex(sp: FishSpecies): FishTex {
  let f = fishMap.get(sp.id)
  if (!f) {
    const stdPx = fishLengthPx(sp.size.max * 0.8, sp.art.shape)
    const scale = artScale(stdPx)
    f = { frames: [tex(fishCanvas(sp, 0, false, stdPx)), tex(fishCanvas(sp, 1, false, stdPx))], scale, stdPx }
    fishMap.set(sp.id, f)
  }
  return f
}
