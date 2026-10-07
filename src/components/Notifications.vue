<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ui } from '../store/state'

const now = ref(performance.now())
let raf = 0
function tick() {
  now.value = performance.now()
  if (ui.banner && ui.banner.until < now.value) ui.banner = null
  if (ui.achievementPop && ui.achievementPop.until < now.value) ui.achievementPop = null
  raf = requestAnimationFrame(tick)
}
onMounted(() => (raf = requestAnimationFrame(tick)))
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="notes">
    <transition name="drop">
      <div v-if="ui.banner" class="banner pixel-box">
        <div class="icon">{{ ui.banner.icon }}</div>
        <div>
          <div class="t">{{ ui.banner.title }}</div>
          <div class="d">{{ ui.banner.desc }}</div>
        </div>
      </div>
    </transition>
    <transition name="drop">
      <div v-if="ui.achievementPop" class="ach pixel-box">
        <span class="icon">{{ ui.achievementPop.icon }}</span>
        <div>
          <div class="muted small">成就解锁</div>
          <div class="t">{{ ui.achievementPop.name }}</div>
        </div>
      </div>
    </transition>
    <div class="toasts">
      <transition-group name="toast">
        <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.kind">{{ t.text }}</div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.notes {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 40;
}
.banner {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 10px 20px;
  min-width: 280px;
  max-width: 90%;
}
.banner .icon {
  font-size: 34px;
}
.banner .t {
  font-size: 18px;
  color: var(--accent);
}
.banner .d {
  font-size: 13px;
  color: var(--text);
  margin-top: 2px;
}
.ach {
  position: absolute;
  right: 14px;
  top: 220px;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 14px;
  border-color: var(--accent);
}
.ach .icon {
  font-size: 28px;
}
.ach .t {
  color: var(--accent);
}
.small {
  font-size: 11px;
}
.toasts {
  position: absolute;
  left: 50%;
  bottom: 150px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: max-content;
  max-width: 92%;
}
.toast {
  background: rgba(4, 16, 32, 0.85);
  border: 2px solid var(--border);
  padding: 5px 14px;
  font-size: 14px;
  text-shadow: 1px 1px 0 #000;
  text-align: center;
}
.toast.good {
  border-color: var(--good);
}
.toast.warn {
  border-color: var(--warn);
  color: #ffe0b0;
}
.toast.bad {
  border-color: var(--bad);
  color: #ffd0d0;
}
.toast.record {
  border-color: var(--accent);
  color: var(--accent);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.drop-enter-active,
.drop-leave-active {
  transition: all 0.35s;
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  margin-top: -20px;
}
</style>
