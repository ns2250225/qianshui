<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { ui } from '../store/state'
import { FISH_MAP, rarityStars, RARITY_COLORS, RARITY_NAMES } from '../data/fish'
import FishIcon from './FishIcon.vue'

const cur = computed(() => ui.newSpecies[0] ?? null)
const sp = computed(() => (cur.value ? FISH_MAP[cur.value.speciesId] : null))
let timer: any = null
const key = ref(0)
watch(
  cur,
  (v) => {
    clearTimeout(timer)
    if (v) {
      key.value++
      timer = setTimeout(() => ui.newSpecies.shift(), 3400)
    }
  },
  { immediate: true },
)
function dismiss() {
  clearTimeout(timer)
  ui.newSpecies.shift()
}
const howText = computed(() => (cur.value?.how === 'photo' ? '📷 拍摄记录' : cur.value?.how === 'trap' ? '🪤 鱼笼捕获' : '✨ 捕获成功！'))
</script>

<template>
  <transition name="pop">
    <div v-if="cur && sp" :key="key" class="new pixel-box" @click="dismiss">
      <div class="how">{{ howText }}</div>
      <div class="badge">NEW!</div>
      <FishIcon :id="sp.id" big :size="170" class="icon" />
      <div class="name">{{ sp.commonName }}</div>
      <div class="sci">{{ sp.scientificName }}</div>
      <div class="stars" :style="{ color: RARITY_COLORS[sp.rarity] }">{{ rarityStars(sp.rarity) }} <small>{{ RARITY_NAMES[sp.rarity] }}</small></div>
      <div class="added">新物种已加入图鉴</div>
      <div class="reward">研究奖励 <b class="gold">+${{ cur.reward.toLocaleString() }}</b>　<b class="good">+{{ cur.points }} 图鉴点</b></div>
    </div>
  </transition>
</template>

<style scoped>
.new {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -58%);
  z-index: 45;
  padding: 18px 40px 16px;
  text-align: center;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px #031020, 0 0 40px rgba(255, 216, 74, 0.4);
  min-width: 300px;
  cursor: pointer;
}
.how {
  color: var(--muted);
  font-size: 13px;
}
.badge {
  font-size: 32px;
  font-weight: bold;
  color: #ff5a5a;
  letter-spacing: 4px;
  text-shadow: 3px 3px 0 #300;
  animation: pulse 0.6s ease-in-out infinite alternate;
}
.icon {
  margin: 6px auto;
}
.name {
  font-size: 26px;
  color: #fff;
}
.sci {
  font-style: italic;
  color: var(--muted);
  margin-top: 2px;
}
.stars {
  font-size: 22px;
  margin-top: 6px;
}
.stars small {
  font-size: 12px;
}
.added {
  margin-top: 8px;
  color: var(--good);
}
.reward {
  margin-top: 6px;
  font-size: 13px;
}
.good {
  color: var(--good);
}
.pop-enter-active {
  transition: all 0.35s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.pop-leave-active {
  transition: all 0.25s;
}
.pop-enter-from {
  opacity: 0;
  transform: translate(-50%, -58%) scale(0.5);
}
.pop-leave-to {
  opacity: 0;
}
@keyframes pulse {
  to {
    transform: scale(1.12);
  }
}
</style>
