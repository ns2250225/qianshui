<script setup lang="ts">
import { computed } from 'vue'
import Panel from './Panel.vue'
import FishIcon from './FishIcon.vue'
import { save, bagCapacity } from '../store/state'
import { FISH_MAP } from '../data/fish'
import { EconomySystem, QUALITY_NAMES, QUALITY_COLORS } from '../systems/EconomySystem'

const list = computed(() => [...save.bag].reverse())
const total = computed(() => save.bag.reduce((s, f) => s + EconomySystem.priceOf(f), 0))
</script>

<template>
  <Panel title="背包">
    <template #head>
      <span>{{ save.bag.length }} / {{ bagCapacity() }}</span>
      <span class="gold">估值 ${{ total.toLocaleString() }}</span>
    </template>
    <div v-if="!list.length" class="muted empty">背包是空的。按 Space 挥网捕鱼。</div>
    <div class="grid">
      <div v-for="f in list" :key="f.uid" class="item" :style="{ borderColor: QUALITY_COLORS[f.quality] }">
        <FishIcon :id="f.speciesId" :size="70" />
        <div class="nm">{{ FISH_MAP[f.speciesId]?.commonName }}</div>
        <div class="meta">{{ f.size }}cm · {{ f.weight < 1 ? Math.round(f.weight * 1000) + 'g' : f.weight.toFixed(1) + 'kg' }}</div>
        <div class="q" :style="{ color: QUALITY_COLORS[f.quality] }">{{ QUALITY_NAMES[f.quality] }}{{ f.quality === 4 ? ' ✨' : '' }}</div>
        <div class="gold">${{ EconomySystem.priceOf(f).toLocaleString() }}</div>
        <button class="rel" @click="EconomySystem.release(f.uid)">放生</button>
      </div>
    </div>
  </Panel>
</template>

<style scoped>
.empty {
  padding: 40px;
  text-align: center;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}
.item {
  background: #0a2440;
  border: 2px solid;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  gap: 2px;
}
.nm {
  font-size: 13px;
  text-align: center;
}
.meta {
  color: var(--muted);
}
.rel {
  margin-top: 4px;
  font-size: 11px;
  padding: 2px 8px;
}
</style>
