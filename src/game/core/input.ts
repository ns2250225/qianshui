// 键盘 + 触屏输入
export type Action =
  | 'capture'
  | 'interact'
  | 'sonar'
  | 'camera'
  | 'lure'
  | 'trap'
  | 'lamp'
  | 'encyclopedia'
  | 'bag'
  | 'map'
  | 'escape'
  | 'jump'
  | 'home'

const KEYMAP: Record<string, Action> = {
  Space: 'capture',
  KeyE: 'interact',
  KeyR: 'sonar',
  KeyC: 'camera',
  KeyG: 'lure',
  KeyT: 'trap',
  KeyL: 'lamp',
  KeyF: 'encyclopedia',
  KeyB: 'bag',
  KeyM: 'map',
  KeyH: 'home',
  Escape: 'escape',
}

class Input {
  keys = new Set<string>()
  pressed = new Set<Action>()
  touch = { x: 0, y: 0, active: false, sprint: false }
  private listeners: ((a: Action) => void)[] = []
  enabled = true

  attach() {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
      if (e.repeat) {
        this.keys.add(e.code)
        return
      }
      this.keys.add(e.code)
      const a = KEYMAP[e.code]
      if (a) this.fire(a)
      if (e.code === 'KeyS' || e.code === 'ArrowDown' || e.code === 'Space') this.fire('jump')
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => this.keys.clear())
  }

  onAction(fn: (a: Action) => void) {
    this.listeners.push(fn)
  }

  fire(a: Action) {
    this.pressed.add(a)
    for (const l of this.listeners) l(a)
  }

  consume(a: Action): boolean {
    if (this.pressed.has(a)) {
      this.pressed.delete(a)
      return true
    }
    return false
  }

  clearPressed() {
    this.pressed.clear()
  }

  axis(): { x: number; y: number } {
    let x = 0
    let y = 0
    const k = this.keys
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1
    if (this.touch.active) {
      x += this.touch.x
      y += this.touch.y
    }
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    return { x, y }
  }

  sprint(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touch.sprint
  }
}

export const input = new Input()
