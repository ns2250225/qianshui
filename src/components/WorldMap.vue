<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive, watch } from 'vue'
import Panel from './Panel.vue'
import { save, ui, toast } from '../store/state'
import { game } from '../game/core/Game'
import { CHUNK, PX_PER_M_X, yToDepth, depthToY, REGION_W } from '../game/core/constants'
import { floorY, regionOfCell, cellAt, cellStart } from '../game/world/Terrain'

const cv = ref<HTMLCanvasElement>()
const wrap = ref<HTMLDivElement>()
const view = reactive({ x: game.player.x, y: Math.max(1500, game.player.y), scale: 0.03 })
const tool = ref<'pan' | 'marker' | 'travel'>('pan')
const markerType = ref('★')
const MARKERS = [
  { t: '★', name: '稀有鱼' },
  { t: '⚓', name: '沉船' },
  { t: '●', name: '洞穴' },
  { t: '♨', name: '热液喷口' },
  { t: '🐟', name: '鱼群' },
  { t: '?', name: '未探索' },
]
const FEATURE_ICON: Record<string, string> = { wreck: '⚓', cave: '●', vent: '♨', whalefall: '🐋', abyss: '⬇' }
const hover = ref('')
let raf = 0

function waterCol(d: number) {
  const stops: [number, number[]][] = [
    [0, [42, 166, 216]],
    [200, [15, 85, 150]],
    [1000, [8, 42, 88]],
    [4000, [3, 20, 46]],
    [11000, [1, 6, 14]],
  ]
  for (let i = 1; i < stops.length; i++) {
    if (d <= stops[i][0]) {
      const t = (d - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])
      const a = stops[i - 1][1]
      const b = stops[i][1]
      return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`
    }
  }
  return 'rgb(1,6,14)'
}

function toScreen(x: number, y: number, W: number, H: number) {
  return [(x - view.x) * view.scale + W / 2, (y - view.y) * view.scale + H / 2]
}
function toWorld(sx: number, sy: number, W: number, H: number) {
  return [(sx - W / 2) / view.scale + view.x, (sy - H / 2) / view.scale + view.y]
}

function draw() {
  const c = cv.value
  if (!c) return
  const W = c.clientWidth
  const H = c.clientHeight
  if (c.width !== W || c.height !== H) {
    c.width = W
    c.height = H
  }
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#04080f'
  ctx.fillRect(0, 0, W, H)
  const s = view.scale
  // 已探索区块
  const cell = CHUNK * s
  for (const k of Object.keys(save.explored)) {
    const [cx, cy] = k.split(':').map(Number)
    const [sx, sy] = toScreen(cx * CHUNK, cy * CHUNK, W, H)
    if (sx > W || sy > H || sx + cell < 0 || sy + cell < 0) continue
    if (cy < 0) {
      ctx.fillStyle = '#7ab8e8'
      ctx.fillRect(sx, sy, cell + 1, cell + 1)
      continue
    }
    ctx.fillStyle = waterCol(yToDepth((cy + 0.5) * CHUNK))
    ctx.fillRect(sx, sy, cell + 1, cell + 1)
  }
  // 海底轮廓（已探索列）
  const cols = new Set<number>()
  for (const k of Object.keys(save.explored)) cols.add(Number(k.split(':')[0]))
  ctx.fillStyle = '#6a5a40'
  const step = Math.max(4, 6 / s)
  for (const cx of cols) {
    const [sx0] = toScreen(cx * CHUNK, 0, W, H)
    if (sx0 > W || sx0 + cell < 0) continue
    for (let x = cx * CHUNK; x < (cx + 1) * CHUNK; x += step) {
      const fy = floorY(x)
      const [sx, sy] = toScreen(x, fy, W, H)
      ctx.fillRect(sx, sy, Math.max(1, step * s + 1), H - sy)
    }
  }
  // 海面线
  const [, sy0] = toScreen(0, 0, W, H)
  ctx.fillStyle = '#bfe6ff'
  ctx.fillRect(0, sy0, W, 1)
  // 海域名称
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  const [wl] = toWorld(0, 0, W, H)
  const [wr] = toWorld(W, 0, W, H)
  for (let c0 = cellAt(wl); c0 <= cellAt(wr); c0++) {
    const r = regionOfCell(c0)
    const known = [...cols].some((cx) => cx * CHUNK >= cellStart(c0) && cx * CHUNK < cellStart(c0) + REGION_W)
    const [sx] = toScreen(cellStart(c0) + REGION_W / 2, 0, W, H)
    const [bx] = toScreen(cellStart(c0), 0, W, H)
    ctx.fillStyle = 'rgba(127,216,255,0.25)'
    ctx.fillRect(bx, 0, 1, H)
    ctx.fillStyle = known ? '#ffe680' : '#456'
    ctx.fillText(known ? r.name : '未探索海域', sx, Math.max(14, sy0 - 8))
  }
  // 深度刻度
  ctx.textAlign = 'left'
  ctx.fillStyle = '#8fb3cc'
  for (const d of [50, 200, 1000, 4000, 6000, 10000]) {
    const [, sy] = toScreen(0, depthToY(d), W, H)
    if (sy < 0 || sy > H) continue
    ctx.fillRect(0, sy, 8, 1)
    ctx.fillText(`${d}m`, 10, sy + 4)
  }
  // 地点
  ctx.textAlign = 'center'
  ctx.font = '14px sans-serif'
  for (const f of Object.values(save.features)) {
    const [sx, sy] = toScreen(f.x, f.y, W, H)
    if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue
    ctx.fillStyle = '#ffd84a'
    ctx.fillText(FEATURE_ICON[f.kind] ?? '•', sx, sy - 4)
  }
  // 手动标记
  for (const m of save.markers) {
    const [sx, sy] = toScreen(m.x, m.y, W, H)
    ctx.fillStyle = '#ff8aa0'
    ctx.fillText(m.type, sx, sy + 5)
  }
  // 鱼笼
  for (const t of save.traps) {
    const [sx, sy] = toScreen(t.x, t.y, W, H)
    ctx.fillStyle = '#ffb84a'
    ctx.fillText('▣', sx, sy)
  }
  // 船 & 玩家
  const [bx, by] = toScreen(game.surface.boatX, -4, W, H)
  ctx.font = '18px sans-serif'
  ctx.fillText('⛵', bx, by)
  if (ui.mode === 'diving' && !game.interior) {
    const [px, py] = toScreen(game.player.x, game.player.y, W, H)
    ctx.fillStyle = '#55efc4'
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.stroke()
  }
  raf = requestAnimationFrame(draw)
}

let drag: { x: number; y: number; vx: number; vy: number; moved: boolean } | null = null
function pdown(e: PointerEvent) {
  drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function pmove(e: PointerEvent) {
  const c = cv.value!
  const r = c.getBoundingClientRect()
  const [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top, c.clientWidth, c.clientHeight)
  hover.value = `${Math.round(wx / PX_PER_M_X)}m · 深度 ${Math.max(0, Math.round(yToDepth(wy)))}m · ${regionOfCell(cellAt(wx)).name}`
  if (!drag) return
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
  view.x = drag.vx - dx / view.scale
  view.y = drag.vy - dy / view.scale
}
function pup(e: PointerEvent) {
  if (!drag) return
  const moved = drag.moved
  drag = null
  if (moved) return
  const c = cv.value!
  const r = c.getBoundingClientRect()
  const sx = e.clientX - r.left
  const sy = e.clientY - r.top
  const [wx, wy] = toWorld(sx, sy, c.clientWidth, c.clientHeight)
  if (tool.value === 'marker') {
    // 点击已有标记则删除
    const hit = save.markers.findIndex((m) => {
      const [mx, my] = toScreen(m.x, m.y, c.clientWidth, c.clientHeight)
      return Math.hypot(mx - sx, my - sy) < 12
    })
    if (hit >= 0) save.markers.splice(hit, 1)
    else save.markers.push({ id: `m${Date.now()}`, x: wx, y: wy, type: markerType.value })
  } else if (tool.value === 'travel') {
    const k = `${Math.floor(wx / CHUNK)}:-1`
    const k2 = `${Math.floor(wx / CHUNK)}:0`
    if (!save.explored[k] && !save.explored[k2]) {
      toast('只能航行到已探索的海面区域', 'warn')
      return
    }
    game.travelTo(wx)
  }
}
function wheel(e: WheelEvent) {
  e.preventDefault()
  zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2)
}
function zoom(k: number) {
  view.scale = Math.min(0.3, Math.max(0.002, view.scale * k))
}
function center() {
  view.x = ui.mode === 'diving' ? game.player.x : game.surface.boatX
  view.y = ui.mode === 'diving' ? game.player.y : 800
}
onMounted(() => {
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => cancelAnimationFrame(raf))
watch(tool, (t) => {
  if (t === 'travel' && ui.mode !== 'boat') {
    toast('需要在船上才能航行', 'warn')
    tool.value = 'pan'
  }
})
</script>

<template>
  <Panel title="世界海图" wide>
    <template #head>
      <span class="muted">已探索 {{ Object.keys(save.explored).length }} 个区块 · 发现地点 {{ Object.keys(save.features).length }} 处 · 海域 {{ Object.keys(save.regionsFound).length }}/11</span>
    </template>
    <div class="tools">
      <button :class="{ on: tool === 'pan' }" @click="tool = 'pan'">✋ 浏览</button>
      <button :class="{ on: tool === 'marker' }" @click="tool = 'marker'">📍 标记</button>
      <template v-if="tool === 'marker'">
        <button v-for="m in MARKERS" :key="m.t" :class="{ on: markerType === m.t }" @click="markerType = m.t" :title="m.name">{{ m.t }} {{ m.name }}</button>
      </template>
      <button :class="{ on: tool === 'travel' }" @click="tool = 'travel'">⛵ 航行</button>
      <span class="sp"></span>
      <button @click="zoom(1.4)">＋</button>
      <button @click="zoom(1 / 1.4)">－</button>
      <button @click="center">◎ 定位</button>
    </div>
    <div ref="wrap" class="map-wrap">
      <canvas ref="cv" @pointerdown="pdown" @pointermove="pmove" @pointerup="pup" @wheel="wheel"></canvas>
    </div>
    <div class="foot muted">
      <span>{{ hover }}</span>
      <span>⚓沉船 ●洞穴 ♨热液喷口 🐋鲸落 ⬇海沟 ⛵小船 ▣鱼笼 · {{ tool === 'marker' ? '点击添加标记，点击已有标记删除' : tool === 'travel' ? '点击已探索海面，驾船航行至该处' : '拖动浏览，滚轮缩放' }}</span>
    </div>
  </Panel>
</template>

<style scoped>
.tools {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.tools button {
  font-size: 12px;
  padding: 4px 8px;
}
.tools button.on {
  background: #1f5f94;
  border-color: var(--accent);
}
.sp {
  flex: 1;
}
.map-wrap {
  height: min(62vh, 560px);
  border: 2px solid var(--border);
}
canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
  image-rendering: auto;
}
.foot {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-top: 6px;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
