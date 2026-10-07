<script setup lang="ts">
import { computed } from 'vue'
import { ui, save } from '../store/state'
import { game } from '../game/core/Game'
import { EconomySystem } from '../systems/EconomySystem'

const quote = computed(() => (save.bag.length ? EconomySystem.quote(save.bag).total : 0))
function jump() {
  game.startJump()
}
function open(p: any) {
  ui.panel = p
}
</script>

<template>
  <div class="boat-menu">
    <div class="tip">↓ 跳入海中 <span class="muted">（S / ↓ / Space）</span></div>
    <div class="bar pixel-box">
      <button class="primary big" @click="jump">🤿 跳水</button>
      <button @click="open('sell')">
        📦 鱼获箱 <span v-if="save.bag.length" class="badge">{{ save.bag.length }}</span>
        <small v-if="quote" class="gold">≈${{ quote.toLocaleString() }}</small>
      </button>
      <button @click="open('shop')">🛒 装备商店</button>
      <button @click="open('encyclopedia')">📖 图鉴</button>
      <button @click="open('map')">🗺️ 海图 / 航行</button>
      <button @click="open('collection')">🏺 收藏品</button>
    </div>
  </div>
</template>

<style scoped>
.boat-menu {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: max-content;
  max-width: calc(100% - 16px);
}
.tip {
  font-size: 18px;
  color: #fff;
  text-shadow: 2px 2px 0 #000;
  animation: bob 1.4s ease-in-out infinite;
}
.bar {
  display: flex;
  gap: 8px;
  padding: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.big {
  font-size: 18px;
  padding: 8px 22px;
}
.badge {
  background: var(--bad);
  color: #fff;
  padding: 0 5px;
  font-size: 11px;
  margin-left: 2px;
}
small {
  margin-left: 4px;
}
@keyframes bob {
  50% {
    transform: translateY(6px);
  }
}
</style>
