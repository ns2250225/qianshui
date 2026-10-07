<script setup lang="ts">
import { ui } from '../store/state'
defineProps<{ title: string; wide?: boolean }>()
function close() {
  ui.panel = null
}
</script>

<template>
  <div class="panel-mask" @pointerdown.self="close">
    <div class="panel pixel-box" :class="{ wide }">
      <header>
        <h2>{{ title }}</h2>
        <slot name="head" />
        <button class="close" @click="close">✕</button>
      </header>
      <div class="body"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.panel-mask {
  position: absolute;
  inset: 0;
  background: rgba(2, 8, 16, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}
.panel {
  width: min(760px, 100%);
  max-height: 100%;
  display: flex;
  flex-direction: column;
}
.panel.wide {
  width: min(1100px, 100%);
}
header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 3px solid var(--border);
  background: var(--panel2);
  flex-wrap: wrap;
}
h2 {
  margin: 0;
  font-size: 18px;
  color: var(--accent);
  letter-spacing: 2px;
}
.close {
  margin-left: auto;
  padding: 2px 10px;
}
.body {
  overflow: auto;
  padding: 14px;
  flex: 1;
}
@media (max-width: 600px) {
  .panel-mask {
    padding: 0;
  }
  .panel {
    height: 100%;
  }
}
</style>
