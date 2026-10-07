<script setup lang="ts">
import Panel from './Panel.vue'
import { save, toast } from '../store/state'
import { COLLECTIBLES } from '../data/progress'
import { SaveSystem } from '../systems/SaveSystem'
import { audio } from '../game/core/audio'

function sell(id: string, value: number) {
  if (!save.collectibles[id]) return
  save.collectibles[id]--
  save.money += value
  save.stats.totalEarned += value
  audio.sfx('coin')
  toast(`💰 出售收藏品 +$${value.toLocaleString()}`, 'good')
  SaveSystem.save()
}
</script>

<template>
  <Panel title="收藏品">
    <template #head>
      <span>⚙️ 装备零件 × {{ save.parts }}</span>
      <span>✨ 诱鱼器 × {{ save.lures }}</span>
    </template>
    <p class="muted small">在沉船与洞穴的宝箱中可以找到收藏品与装备零件。零件用于购买高级装备。</p>
    <div class="grid">
      <div v-for="c in COLLECTIBLES" :key="c.id" class="item" :class="{ on: save.collectibles[c.id] }">
        <div class="icon">{{ save.collectibles[c.id] ? c.icon : '❔' }}</div>
        <div class="nm">{{ save.collectibles[c.id] ? c.name : '未发现' }}</div>
        <div class="muted small">{{ save.collectibles[c.id] ? c.desc : '在海底某处等待被发现' }}</div>
        <div v-if="save.collectibles[c.id]" class="cnt">× {{ save.collectibles[c.id] }}</div>
        <button v-if="save.collectibles[c.id]" @click="sell(c.id, c.value)">出售 ${{ c.value.toLocaleString() }}</button>
      </div>
    </div>
  </Panel>
</template>

<style scoped>
.small {
  font-size: 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.item {
  background: #06182c;
  border: 2px solid #1a3a5a;
  padding: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}
.item.on {
  border-color: var(--accent);
  background: #0f2a3a;
}
.icon {
  font-size: 34px;
}
.cnt {
  color: var(--accent);
}
button {
  font-size: 11px;
  padding: 3px 8px;
}
</style>
