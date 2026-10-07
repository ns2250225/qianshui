<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ui, save } from './store/state'
import { SaveSystem } from './systems/SaveSystem'
import { game } from './game/core/Game'
import { audio } from './game/core/audio'
import Hud from './components/Hud.vue'
import BoatMenu from './components/BoatMenu.vue'
import MobileControls from './components/MobileControls.vue'
import Notifications from './components/Notifications.vue'
import NewSpeciesPopup from './components/NewSpeciesPopup.vue'
import ShopPanel from './components/ShopPanel.vue'
import SellPanel from './components/SellPanel.vue'
import Encyclopedia from './components/Encyclopedia.vue'
import BagPanel from './components/BagPanel.vue'
import WorldMap from './components/WorldMap.vue'
import AchievementsPanel from './components/AchievementsPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import CollectionPanel from './components/CollectionPanel.vue'
import { FISH_COUNT } from './data/fish'

const host = ref<HTMLDivElement>()
const ready = ref(false)
const started = ref(false)
const hasSave = ref(false)

onMounted(async () => {
  ui.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  hasSave.value = await SaveSystem.load()
  await game.init(host.value!)
  ready.value = true
})

function start() {
  audio.unlock()
  audio.setVolumes(save.settings.music, save.settings.sfx, save.settings.mute)
  started.value = true
  ui.loaded = true
}
</script>

<template>
  <div class="root">
    <div ref="host" class="game-host"></div>
    <template v-if="started">
      <Hud />
      <BoatMenu v-if="ui.mode === 'boat' && !ui.panel" />
      <MobileControls v-if="ui.isTouch && ui.mode === 'diving' && !ui.panel" />
      <Notifications />
      <NewSpeciesPopup />
      <ShopPanel v-if="ui.panel === 'shop'" />
      <SellPanel v-if="ui.panel === 'sell'" />
      <Encyclopedia v-if="ui.panel === 'encyclopedia'" />
      <BagPanel v-if="ui.panel === 'bag'" />
      <WorldMap v-if="ui.panel === 'map'" />
      <AchievementsPanel v-if="ui.panel === 'achievements'" />
      <SettingsPanel v-if="ui.panel === 'settings'" />
      <CollectionPanel v-if="ui.panel === 'collection'" />
    </template>
    <div class="fade" :style="{ opacity: ui.fade }"></div>
    <div v-if="!started" class="title">
      <div class="title-box">
        <div class="logo">深海图鉴</div>
        <div class="logo-en">PIXEL OCEAN</div>
        <div class="sub">从海面出发，收集整个海洋。</div>
        <div class="db">世界海洋鱼类数据库 · 已收录 {{ FISH_COUNT }} 种</div>
        <button class="primary start" :disabled="!ready" @click="start">{{ ready ? (hasSave ? '继续潜水' : '开始游戏') : '加载中…' }}</button>
        <div class="keys">
          <div>WASD / 方向键 移动　Shift 冲刺　Space 挥网捕获</div>
          <div>E 互动　F 图鉴　B 背包　M 海图　R 声呐　C 相机　L 潜水灯　G 诱鱼器　T 鱼笼</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.root {
  position: relative;
  width: 100%;
  height: 100%;
}
.game-host {
  position: absolute;
  inset: 0;
}
.fade {
  position: absolute;
  inset: 0;
  background: #000;
  pointer-events: none;
  z-index: 80;
}
.title {
  position: absolute;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(0, 10, 30, 0.2), rgba(0, 10, 30, 0.75));
}
.title-box {
  text-align: center;
  padding: 30px;
}
.logo {
  font-size: clamp(48px, 10vw, 96px);
  font-weight: bold;
  color: #ffe680;
  letter-spacing: 8px;
  text-shadow: 4px 4px 0 #0a3a6a, 8px 8px 0 #031020;
}
.logo-en {
  font-size: clamp(16px, 3vw, 26px);
  letter-spacing: 12px;
  color: #7fd8ff;
  margin-top: 6px;
  text-shadow: 2px 2px 0 #031020;
}
.sub {
  margin-top: 18px;
  font-size: 18px;
  color: #e6f4ff;
  text-shadow: 2px 2px 0 #031020;
}
.db {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
}
.start {
  margin-top: 34px;
  font-size: 22px;
  padding: 12px 40px;
}
.keys {
  margin-top: 28px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.9;
  text-shadow: 1px 1px 0 #000;
}
</style>
