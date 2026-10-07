<script setup lang="ts">
import { computed } from 'vue'
import Panel from './Panel.vue'
import { save } from '../store/state'
import { ACHIEVEMENTS, LEVELS, levelOf } from '../data/progress'
import { FISH } from '../data/fish'

const lv = computed(() => levelOf(save.research))
const done = computed(() => ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length)
</script>

<template>
  <Panel title="成就与探索等级" wide>
    <div class="level pixel-box">
      <div class="ln">Lv.{{ lv.level }} <b class="gold">{{ lv.name }}</b></div>
      <div class="bar"><div :style="{ width: lv.progress * 100 + '%' }"></div></div>
      <div class="muted small">图鉴点 {{ save.research.toLocaleString() }}{{ lv.next ? ` / ${lv.next.toLocaleString()}` : '（已满级）' }}</div>
      <div class="steps">
        <span v-for="(l, i) in LEVELS" :key="l.name" :class="{ on: i <= lv.index }">{{ l.name }}</span>
      </div>
    </div>
    <div class="stats">
      <div>潜水次数 <b>{{ save.stats.dives }}</b></div>
      <div>最大深度 <b>{{ save.stats.maxDepth.toLocaleString() }}m</b></div>
      <div>捕获鱼类 <b>{{ save.stats.fishCaught }}</b></div>
      <div>发现物种 <b>{{ Object.keys(save.encyclopedia).length }} / {{ FISH.length }}</b></div>
      <div>累计收入 <b>${{ save.stats.totalEarned.toLocaleString() }}</b></div>
      <div>经历事件 <b>{{ save.stats.eventsSeen }}</b></div>
      <div>体型纪录 <b>{{ save.stats.records }}</b></div>
      <div>发现地点 <b>{{ Object.keys(save.features).length }}</b></div>
    </div>
    <h3>成就 {{ done }} / {{ ACHIEVEMENTS.length }}</h3>
    <div class="grid">
      <div v-for="a in ACHIEVEMENTS" :key="a.id" class="ach" :class="{ on: save.achievements[a.id] }">
        <div class="icon">{{ save.achievements[a.id] ? a.icon : '🔒' }}</div>
        <div>
          <div class="an">{{ a.name }}</div>
          <div class="muted small">{{ a.desc }}</div>
          <div class="small gold">奖励 ${{ a.reward.toLocaleString() }}</div>
        </div>
      </div>
    </div>
  </Panel>
</template>

<style scoped>
.level {
  padding: 12px;
  margin-bottom: 12px;
}
.ln {
  font-size: 20px;
}
.bar {
  height: 12px;
  background: #061a30;
  border: 2px solid var(--border);
  margin: 6px 0;
}
.bar div {
  height: 100%;
  background: var(--accent);
}
.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.steps span {
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid #1f4f7a;
  color: var(--muted);
}
.steps span.on {
  color: var(--accent);
  border-color: var(--accent);
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}
.stats div {
  background: #0a2440;
  padding: 6px 8px;
  border: 1px solid #1f4f7a;
  display: flex;
  justify-content: space-between;
}
h3 {
  color: var(--accent);
  margin: 6px 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}
.ach {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background: #06182c;
  border: 2px solid #1a3a5a;
  opacity: 0.6;
}
.ach.on {
  opacity: 1;
  border-color: var(--accent);
  background: #0f2a3a;
}
.icon {
  font-size: 28px;
  width: 36px;
  text-align: center;
}
.an {
  font-size: 14px;
}
.small {
  font-size: 11px;
}
</style>
