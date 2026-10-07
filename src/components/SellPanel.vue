<script setup lang="ts">
import { computed } from 'vue'
import Panel from './Panel.vue'
import FishIcon from './FishIcon.vue'
import { save } from '../store/state'
import { FISH_MAP } from '../data/fish'
import { EconomySystem } from '../systems/EconomySystem'
import { SaveSystem } from '../systems/SaveSystem'

EconomySystem.ensureMarket()
const quote = computed(() => EconomySystem.quote(save.bag))
const market = computed(() =>
  Object.entries(save.market.mods)
    .map(([id, m]) => ({ id, m, sp: FISH_MAP[id] }))
    .filter((x) => x.sp)
    .sort((a, b) => b.m - a.m),
)
function sell() {
  EconomySystem.sellAll()
  SaveSystem.save()
}
</script>

<template>
  <Panel title="鱼获箱">
    <div class="market">
      <div class="mt">📈 今日市场 <small class="muted">第 {{ EconomySystem.currentDay() + 1 }} 天</small></div>
      <div class="mods">
        <span v-for="x in market" :key="x.id" :class="x.m >= 1 ? 'hot' : 'cold'">{{ x.sp.commonName }} {{ x.m >= 1 ? '↑' : '↓' }} {{ Math.round(x.m * 100) }}%</span>
      </div>
      <div class="muted small">同一物种当日出售越多，价格越低（市场饱和）。探索新物种比反复刷同一种鱼更赚钱！</div>
    </div>
    <div v-if="!save.bag.length" class="empty muted">鱼获箱是空的。跳入海中去捕鱼吧！</div>
    <template v-else>
      <div class="title">本次潜水</div>
      <div class="lines">
        <div v-for="l in quote.lines" :key="l.speciesId" class="line">
          <FishIcon :id="l.speciesId" :size="48" />
          <span class="nm">{{ FISH_MAP[l.speciesId]?.commonName }} × {{ l.count }}</span>
          <span class="gold">${{ l.total.toLocaleString() }}</span>
        </div>
      </div>
      <div class="total">
        <span>总计：</span>
        <b class="gold">${{ quote.total.toLocaleString() }}</b>
      </div>
      <button class="primary sell" @click="sell">💰 出售鱼获</button>
    </template>
  </Panel>
</template>

<style scoped>
.market {
  background: #0a2440;
  border: 2px solid #1f4f7a;
  padding: 10px;
  margin-bottom: 12px;
}
.mt {
  margin-bottom: 6px;
}
.mods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.mods span {
  padding: 2px 8px;
  font-size: 13px;
  border: 1px solid;
}
.hot {
  color: #ff8a6a;
  border-color: #ff8a6a;
}
.cold {
  color: #7fb8ff;
  border-color: #4f7ab0;
}
.small {
  font-size: 12px;
}
.empty {
  padding: 40px;
  text-align: center;
}
.title {
  font-size: 16px;
  color: var(--accent);
  margin-bottom: 6px;
}
.line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 3px 0;
  border-bottom: 1px dashed #1a3a5a;
}
.nm {
  flex: 1;
}
.total {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  font-size: 22px;
  margin: 14px 0;
  border-top: 3px solid var(--border);
  padding-top: 10px;
}
.sell {
  width: 100%;
  font-size: 18px;
  padding: 10px;
}
</style>
