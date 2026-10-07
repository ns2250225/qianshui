// 昼夜 & 天气
import { save } from '../../store/state'
import { GAME_MIN_PER_SEC } from '../core/constants'
import { lerpColor, weightedPick } from '../core/rng'

export type WeatherId = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'thunder' | 'fog'

export interface WeatherDef {
  id: WeatherId
  name: string
  icon: string
  light: number
  vis: number
  wave: number
  rare: number
  rain: number
  fog: number
  thunder: boolean
  weight: number
}

export const WEATHERS: Record<WeatherId, WeatherDef> = {
  sunny: { id: 'sunny', name: '晴天', icon: '☀️', light: 1, vis: 1, wave: 1, rare: 0, rain: 0, fog: 0, thunder: false, weight: 40 },
  cloudy: { id: 'cloudy', name: '阴天', icon: '☁️', light: 0.82, vis: 0.95, wave: 1.2, rare: 0.05, rain: 0, fog: 0, thunder: false, weight: 25 },
  rain: { id: 'rain', name: '雨天', icon: '🌧️', light: 0.7, vis: 0.85, wave: 1.5, rare: 0.1, rain: 0.5, fog: 0.05, thunder: false, weight: 14 },
  storm: { id: 'storm', name: '暴雨', icon: '🌊', light: 0.55, vis: 0.7, wave: 2.6, rare: 0.25, rain: 1, fog: 0.1, thunder: false, weight: 7 },
  thunder: { id: 'thunder', name: '雷暴', icon: '⛈️', light: 0.5, vis: 0.65, wave: 2.8, rare: 0.35, rain: 1, fog: 0.1, thunder: true, weight: 5 },
  fog: { id: 'fog', name: '大雾', icon: '🌫️', light: 0.75, vis: 0.55, wave: 0.7, rare: 0.15, rain: 0, fog: 0.6, thunder: false, weight: 9 },
}

export class Env {
  weather: WeatherDef = WEATHERS.sunny
  nextWeather = 180
  lightning = 0
  private flashCd = 6

  get minutes() {
    return save.totalMinutes
  }
  get hour() {
    return (save.totalMinutes / 60) % 24
  }
  get day() {
    return Math.floor(save.totalMinutes / 1440) + 1
  }
  get phase(): '清晨' | '白天' | '黄昏' | '夜晚' {
    const h = this.hour
    if (h >= 5 && h < 8) return '清晨'
    if (h >= 8 && h < 17) return '白天'
    if (h >= 17 && h < 19.5) return '黄昏'
    return '夜晚'
  }
  get isNight() {
    const h = this.hour
    return h >= 19.5 || h < 5
  }
  timeText() {
    const m = Math.floor(save.totalMinutes % 1440)
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  }

  /** 日光强度 0.2-1 */
  daylight(): number {
    const h = this.hour
    let d: number
    if (h >= 7 && h < 17) d = 1
    else if (h >= 5 && h < 7) d = 0.35 + ((h - 5) / 2) * 0.65
    else if (h >= 17 && h < 20) d = 1 - ((h - 17) / 3) * 0.75
    else d = 0.25
    return d * this.weather.light
  }

  skyColors(): [number, number] {
    const h = this.hour
    let top: number
    let hor: number
    if (h >= 7 && h < 17) {
      top = 0x3a90e8
      hor = 0xbfe6ff
    } else if (h >= 5 && h < 7) {
      const t = (h - 5) / 2
      top = lerpColor(0x1a2050, 0x3a90e8, t)
      hor = lerpColor(0xff8a5a, 0xbfe6ff, t)
    } else if (h >= 17 && h < 19.5) {
      const t = (h - 17) / 2.5
      top = lerpColor(0x3a90e8, 0x2a1a50, t)
      hor = lerpColor(0xffb06a, 0xff5a5a, t)
    } else {
      top = 0x060a20
      hor = 0x1a2448
    }
    const grey = 0x8a96a4
    const w = this.weather
    const g = w.id === 'sunny' ? 0 : w.id === 'cloudy' ? 0.45 : w.id === 'fog' ? 0.6 : 0.65
    const nightK = this.isNight ? 0.25 : 1
    top = lerpColor(top, lerpColor(grey, 0x0a0e18, 1 - nightK), g)
    hor = lerpColor(hor, lerpColor(0xb0bac4, 0x1a2030, 1 - nightK), g)
    return [top, hor]
  }

  update(dt: number, onThunder: () => void) {
    save.totalMinutes += dt * GAME_MIN_PER_SEC
    this.nextWeather -= dt * GAME_MIN_PER_SEC
    if (this.nextWeather <= 0) {
      this.rollWeather()
    }
    if (this.lightning > 0) this.lightning = Math.max(0, this.lightning - dt * 3)
    if (this.weather.thunder) {
      this.flashCd -= dt
      if (this.flashCd <= 0) {
        this.flashCd = 4 + Math.random() * 10
        this.lightning = 1
        onThunder()
      }
    }
  }

  rollWeather() {
    const list = Object.values(WEATHERS)
    this.weather = weightedPick(Math.random, list, (w) => w.weight) ?? WEATHERS.sunny
    this.nextWeather = 120 + Math.random() * 240
  }
}
