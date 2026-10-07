<script setup lang="ts">
import { reactive } from 'vue'
import { input } from '../game/core/input'
import { game } from '../game/core/Game'
import { ui, save } from '../store/state'

const stick = reactive({ active: false, id: -1, cx: 0, cy: 0, dx: 0, dy: 0 })
const R = 55

function down(e: PointerEvent) {
  stick.active = true
  stick.id = e.pointerId
  stick.cx = e.clientX
  stick.cy = e.clientY
  stick.dx = stick.dy = 0
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (!stick.active || e.pointerId !== stick.id) return
  let dx = e.clientX - stick.cx
  let dy = e.clientY - stick.cy
  const l = Math.hypot(dx, dy)
  if (l > R) {
    dx = (dx / l) * R
    dy = (dy / l) * R
  }
  stick.dx = dx
  stick.dy = dy
  input.touch.active = true
  input.touch.x = dx / R
  input.touch.y = dy / R
}
function up(e: PointerEvent) {
  if (e.pointerId !== stick.id) return
  stick.active = false
  stick.dx = stick.dy = 0
  input.touch.active = false
  input.touch.x = input.touch.y = 0
}
function act(a: any) {
  game.action(a)
}
function sprint(v: boolean) {
  input.touch.sprint = v
}
</script>

<template>
  <div class="mobile">
    <div class="stick-zone" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
      <div class="stick-base" :style="stick.active ? { left: stick.cx + 'px', top: stick.cy + 'px', position: 'fixed' } : {}">
        <div class="stick-knob" :style="{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }"></div>
      </div>
    </div>
    <div class="btns">
      <button class="b capture" @pointerdown.prevent="act('capture')">捕获</button>
      <button class="b sprint" @pointerdown.prevent="sprint(true)" @pointerup="sprint(false)" @pointerleave="sprint(false)" @pointercancel="sprint(false)">冲刺</button>
      <button class="b interact" :class="{ glow: ui.hud.hint }" @pointerdown.prevent="act('interact')">互动</button>
      <button class="b small sonar" :disabled="!ui.hud.hasSonar" @pointerdown.prevent="act('sonar')">声呐</button>
      <button class="b small camera" :disabled="!ui.hud.hasCamera" @pointerdown.prevent="act('camera')">相机</button>
      <button class="b small lamp" @pointerdown.prevent="act('lamp')">{{ save.settings.lampOn ? '灯开' : '灯关' }}</button>
      <button class="b small lure" :disabled="save.lures <= 0" @pointerdown.prevent="act('lure')">诱鱼</button>
      <button class="b small trap" :disabled="!ui.hud.hasTrap" @pointerdown.prevent="act('trap')">鱼笼</button>
      <button class="b small bag" @pointerdown.prevent="act('bag')">背包</button>
    </div>
  </div>
</template>

<style scoped>
.mobile {
  position: absolute;
  inset: 0;
  z-index: 15;
  pointer-events: none;
}
.stick-zone {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 45%;
  height: 55%;
  pointer-events: auto;
  touch-action: none;
}
.stick-base {
  position: absolute;
  left: 90px;
  bottom: 90px;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border-radius: 50%;
  background: rgba(127, 216, 255, 0.15);
  border: 3px solid rgba(127, 216, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.stick-base[style*='fixed'] {
  bottom: auto;
}
.stick-knob {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(127, 216, 255, 0.55);
  border: 3px solid #e6f4ff;
}
.btns {
  position: absolute;
  right: 12px;
  bottom: 14px;
  width: 230px;
  height: 230px;
  pointer-events: none;
}
.b {
  position: absolute;
  pointer-events: auto;
  touch-action: none;
  border-radius: 50%;
  width: 72px;
  height: 72px;
  padding: 0;
  font-size: 15px;
  background: rgba(18, 56, 94, 0.75);
}
.b.small {
  width: 48px;
  height: 48px;
  font-size: 11px;
}
.capture {
  right: 0;
  bottom: 0;
  width: 88px;
  height: 88px;
  background: rgba(192, 138, 26, 0.85);
  border-color: #ffd84a;
}
.sprint {
  right: 100px;
  bottom: 0;
}
.interact {
  right: 10px;
  bottom: 100px;
}
.interact.glow {
  border-color: #ffd84a;
  box-shadow: 0 0 12px #ffd84a;
}
.sonar {
  right: 90px;
  bottom: 86px;
}
.camera {
  right: 150px;
  bottom: 70px;
}
.lamp {
  right: 172px;
  bottom: 14px;
}
.lure {
  right: 70px;
  bottom: 150px;
}
.trap {
  right: 128px;
  bottom: 130px;
}
.bag {
  right: 20px;
  bottom: 180px;
}
</style>
