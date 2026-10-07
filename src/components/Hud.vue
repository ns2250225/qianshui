<script setup lang="ts">
import { computed } from 'vue'
import { ui, save, bagCapacity } from '../store/state'
import { levelOf } from '../data/progress'
import { game } from '../game/core/Game'

const level = computed(() => levelOf(save.research))
const hpPct = computed(() => Math.max(0, Math.min(100, (ui.hud.hp / ui.hud.maxHp) * 100)))
const bagFull = computed(() => save.bag.length >= bagCapacity())
function goHome() {
  game.action('home')
}
function interact() {
  game.action('interact')
}
function open(p: any) {
  ui.panel = p
}
</script>

<template>
  <div class="hud">
    <!-- 左上 -->
    <div class="tl box">
      <div class="money">$ {{ Math.floor(save.money).toLocaleString() }}</div>
      <div class="label">深度</div>
      <div class="depth">{{ ui.hud.depth.toLocaleString() }}<small>m</small></div>
      <div class="region">{{ ui.hud.regionName }} · {{ ui.hud.zoneName }}</div>
      <div class="hp" v-if="ui.mode === 'diving'">
        <div class="hp-bar"><div :style="{ width: hpPct + '%' }" :class="{ low: hpPct < 35 }"></div></div>
        <span>{{ ui.hud.hp }}/{{ ui.hud.maxHp }}</span>
      </div>
    </div>
    <!-- 右上 -->
    <div class="tr">
      <div class="box bag" :class="{ full: bagFull }" @click="open('bag')">
        <div class="label">背包</div>
        <div class="bagnum">{{ save.bag.length }} / {{ bagCapacity() }}</div>
      </div>
      <div class="box info">
        <div>{{ ui.hud.weatherIcon }} {{ ui.hud.weather }}</div>
        <div>🕐 {{ ui.hud.timeText }} {{ ui.hud.phase }}</div>
        <div class="lv">Lv.{{ level.level }} {{ level.name }}</div>
      </div>
      <div class="menu">
        <button v-if="ui.mode === 'diving'" class="home" @click="goHome" title="回到船上 (H)">⛵<span>回船</span></button>
        <button @click="open('encyclopedia')" title="图鉴 (F)">📖<span>图鉴</span></button>
        <button @click="open('map')" title="海图 (M)">🗺️<span>海图</span></button>
        <button @click="open('achievements')" title="成就">🏅<span>成就</span></button>
        <button @click="open('settings')" title="设置">⚙️<span>设置</span></button>
      </div>
    </div>
    <!-- 左下 -->
    <div class="bl">
      <div v-if="ui.hud.detector" class="box detector">
        <div class="label">🧭 稀有鱼探测器</div>
        <template v-if="ui.hud.detector.dist">
          <div>附近检测到：</div>
          <div class="gold">{{ ui.hud.detector.text }}</div>
          <div>距离：{{ ui.hud.detector.dist }}m　方向：<b class="arrow">{{ ui.hud.detector.dir }}</b></div>
        </template>
        <div v-else class="muted">{{ ui.hud.detector.text }}</div>
      </div>
      <div class="box o2">O₂ <b>∞</b></div>
    </div>
    <!-- 中部提示 -->
    <div class="center">
      <div v-if="ui.hud.warning" class="warning">{{ ui.hud.warning }}</div>
      <div v-if="ui.hud.hint && ui.mode === 'diving'" class="hint" @click="interact">{{ ui.hud.hint }}</div>
    </div>
    <!-- 底部按钮 -->
    <div class="bottom" v-if="ui.mode === 'diving' && !ui.isTouch">
      <div class="key"><b>Space</b>捕获</div>
      <div class="key" :class="{ off: !ui.hud.hasSonar, cd: !ui.hud.sonarReady }"><b>R</b>声呐<span v-if="ui.hud.hasSonar && !ui.hud.sonarReady">{{ ui.hud.sonarCd.toFixed(0) }}s</span></div>
      <div class="key"><b>Shift</b>冲刺</div>
      <div class="key" :class="{ off: !ui.hud.hasCamera }"><b>C</b>相机</div>
      <div class="key" :class="{ off: !ui.hud.lampOn }"><b>L</b>灯{{ ui.hud.lampOn ? '开' : '关' }}</div>
      <div class="key" :class="{ off: save.lures <= 0 }"><b>G</b>诱鱼器×{{ save.lures }}</div>
      <div class="key" :class="{ off: !ui.hud.hasTrap }"><b>T</b>鱼笼</div>
      <div class="key"><b>H</b>回船</div>
    </div>
    <div v-if="save.settings.showFps" class="fps">{{ ui.hud.fps }} FPS</div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  font-size: 14px;
  text-shadow: 2px 2px 0 #000;
}
.box {
  background: rgba(4, 16, 32, 0.62);
  border: 2px solid rgba(127, 216, 255, 0.35);
  padding: 8px 12px;
}
.tl {
  position: absolute;
  left: 12px;
  top: 12px;
  min-width: 170px;
}
.money {
  font-size: 22px;
  color: var(--accent);
  font-weight: bold;
}
.label {
  color: var(--muted);
  font-size: 12px;
  margin-top: 4px;
}
.depth {
  font-size: 30px;
  font-weight: bold;
  line-height: 1.1;
}
.depth small {
  font-size: 16px;
  margin-left: 2px;
}
.region {
  font-size: 12px;
  color: #bfe6ff;
  margin-top: 2px;
}
.hp {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11px;
}
.hp-bar {
  width: 110px;
  height: 8px;
  background: #2a0a0a;
  border: 1px solid #000;
}
.hp-bar div {
  height: 100%;
  background: #55efc4;
}
.hp-bar div.low {
  background: #ff6b6b;
}
.tr {
  position: absolute;
  right: 12px;
  top: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.bag {
  pointer-events: auto;
  cursor: pointer;
  text-align: right;
  min-width: 110px;
}
.bag.full {
  border-color: var(--bad);
  animation: blink 1s infinite;
}
.bagnum {
  font-size: 22px;
  font-weight: bold;
}
.info {
  font-size: 12px;
  text-align: right;
  line-height: 1.6;
}
.lv {
  color: var(--accent);
}
.menu {
  display: flex;
  gap: 6px;
  pointer-events: auto;
}
.menu button.home {
  background: #c08a1a;
  border-color: #ffd84a;
}
.menu button {
  padding: 4px 8px;
  font-size: 13px;
  display: flex;
  gap: 4px;
  align-items: center;
}
.bl {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.o2 {
  font-size: 18px;
  color: #7fd8ff;
}
.o2 b {
  font-size: 22px;
}
.detector {
  font-size: 12px;
  line-height: 1.6;
}
.arrow {
  font-size: 18px;
  color: var(--accent);
}
.center {
  position: absolute;
  left: 50%;
  top: 22%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.warning {
  background: rgba(80, 10, 10, 0.75);
  border: 2px solid var(--bad);
  padding: 6px 14px;
  color: #ffd0d0;
  animation: blink 1.2s infinite;
  white-space: nowrap;
}
.hint {
  pointer-events: auto;
  cursor: pointer;
  background: rgba(4, 16, 32, 0.8);
  border: 2px solid var(--accent);
  padding: 6px 16px;
  color: var(--accent);
  font-size: 16px;
}
.bottom {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}
.key {
  background: rgba(4, 16, 32, 0.7);
  border: 2px solid rgba(127, 216, 255, 0.4);
  padding: 5px 10px;
  font-size: 13px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.key b {
  background: #1a4f80;
  padding: 0 5px;
  font-size: 11px;
  color: #fff;
}
.key.off {
  opacity: 0.4;
}
.key.cd {
  color: var(--muted);
}
.fps {
  position: absolute;
  left: 50%;
  top: 4px;
  transform: translateX(-50%);
  font-size: 11px;
  color: #8f8;
}
@keyframes blink {
  50% {
    opacity: 0.6;
  }
}
@media (max-width: 700px) {
  .menu button span {
    display: none;
  }
  .depth {
    font-size: 22px;
  }
  .money {
    font-size: 17px;
  }
  .tl {
    min-width: 0;
  }
  .info {
    display: none;
  }
}
</style>
