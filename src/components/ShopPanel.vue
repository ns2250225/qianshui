<script setup lang="ts">
import { ref, computed } from 'vue'
import Panel from './Panel.vue'
import { save } from '../store/state'
import { EQUIPMENT, CONSUMABLES, STAT_LABELS, type EquipCat, type EquipStats } from '../data/equipment/equipment'
import { EconomySystem } from '../systems/EconomySystem'
import { SaveSystem } from '../systems/SaveSystem'

const sel = ref<EquipCat>('suit')
const cat = computed(() => EQUIPMENT.find((c) => c.id === sel.value)!)
const curTier = computed(() => save.equipment[sel.value])
const cur = computed(() => (curTier.value >= 0 ? cat.value.tiers[curTier.value] : null))
const next = computed(() => cat.value.tiers[curTier.value + 1] ?? null)

function statLines(st: EquipStats, prev?: EquipStats) {
  return (Object.keys(st) as (keyof EquipStats)[])
    .filter((k) => STAT_LABELS[k])
    .map((k) => {
      const [label, fmt] = STAT_LABELS[k]!
      const v = st[k]!
      const p = prev?.[k]
      return { label, val: fmt(v), prev: p !== undefined ? fmt(p) : null, up: p !== undefined && p !== v }
    })
}
function buy() {
  if (EconomySystem.buy(sel.value)) SaveSystem.save()
}
function buyLure(n: number) {
  if (EconomySystem.buyConsumable('lure', n)) SaveSystem.save()
}
const check = computed(() => {
  // 依赖响应式数据
  void save.money
  void save.parts
  void save.equipment[sel.value]
  return EconomySystem.canBuy(sel.value)
})
</script>

<template>
  <Panel title="装备商店" wide>
    <template #head>
      <span class="gold">$ {{ Math.floor(save.money).toLocaleString() }}</span>
      <span>⚙️ 装备零件 × {{ save.parts }}</span>
    </template>
    <div class="shop">
      <div class="cats">
        <button v-for="c in EQUIPMENT" :key="c.id" :class="{ on: sel === c.id }" @click="sel = c.id">
          <span>{{ c.icon }} {{ c.name }}</span>
          <small>{{ save.equipment[c.id] >= 0 ? `Lv.${save.equipment[c.id] + 1}/${c.tiers.length}` : '未拥有' }}</small>
        </button>
      </div>
      <div class="detail">
        <h3>{{ cat.icon }} {{ cat.name }}</h3>
        <p class="muted">{{ cat.desc }}</p>
        <div class="tiers">
          <div v-for="(t, i) in cat.tiers" :key="t.id" class="tier" :class="{ owned: i <= curTier, cur: i === curTier, next: i === curTier + 1 }">
            <span>{{ i <= curTier ? '✔' : i === curTier + 1 ? '▶' : '·' }}</span>
            {{ t.name }}
          </div>
        </div>
        <div class="cards">
          <div class="card" v-if="cur">
            <div class="ct">当前：{{ cur.name }}</div>
            <div class="muted small">{{ cur.desc }}</div>
            <div v-for="l in statLines(cur.stats)" :key="l.label" class="stat">
              <span>{{ l.label }}</span><b>{{ l.val }}</b>
            </div>
          </div>
          <div class="card next" v-if="next">
            <div class="ct">{{ cur ? '升级' : '购买' }}：{{ next.name }}</div>
            <div class="muted small">{{ next.desc }}</div>
            <div v-for="l in statLines(next.stats, cur?.stats)" :key="l.label" class="stat">
              <span>{{ l.label }}</span><b :class="{ up: l.up }">{{ l.prev && l.up ? l.prev + ' → ' : '' }}{{ l.val }}</b>
            </div>
            <div class="price">
              <span class="gold">$ {{ next.price.toLocaleString() }}</span>
              <span v-if="next.parts">⚙️ × {{ next.parts }}</span>
            </div>
            <button class="primary" :disabled="!check.ok" @click="buy">{{ check.ok ? (cur ? '升级' : '购买') : check.reason }}</button>
          </div>
          <div class="card" v-else>
            <div class="ct gold">已达到最高等级</div>
          </div>
        </div>
        <h3 class="cons">消耗品</h3>
        <div v-for="c in CONSUMABLES" :key="c.id" class="card cons-card">
          <div>
            <div class="ct">{{ c.icon }} {{ c.name }} <small class="muted">持有 × {{ save.lures }}</small></div>
            <div class="muted small">{{ c.desc }}</div>
          </div>
          <div class="cons-btns">
            <button :disabled="save.money < c.price" @click="buyLure(1)">× 1　${{ c.price }}</button>
            <button :disabled="save.money < c.price * 5" @click="buyLure(5)">× 5　${{ c.price * 5 }}</button>
          </div>
        </div>
      </div>
    </div>
  </Panel>
</template>

<style scoped>
.shop {
  display: flex;
  gap: 14px;
}
.cats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 190px;
  flex-shrink: 0;
}
.cats button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
}
.cats button.on {
  background: #1f5f94;
  border-color: var(--accent);
}
.cats small {
  font-size: 11px;
  color: var(--muted);
}
.detail {
  flex: 1;
  min-width: 0;
}
h3 {
  margin: 0 0 4px;
  color: var(--accent);
}
.tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 10px 0;
}
.tier {
  padding: 3px 8px;
  border: 2px solid #1a3a5a;
  font-size: 12px;
  color: var(--muted);
}
.tier.owned {
  color: var(--good);
  border-color: #2a6a5a;
}
.tier.cur {
  background: #0f3a3a;
}
.tier.next {
  color: var(--accent);
  border-color: var(--accent);
}
.cards {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.card {
  flex: 1;
  min-width: 230px;
  background: #0a2440;
  border: 2px solid #1f4f7a;
  padding: 10px;
}
.card.next {
  border-color: var(--accent);
}
.ct {
  font-size: 15px;
  margin-bottom: 4px;
}
.small {
  font-size: 12px;
  margin-bottom: 6px;
}
.stat {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 2px 0;
  border-bottom: 1px dashed #1a3a5a;
}
.stat b.up {
  color: var(--good);
}
.price {
  display: flex;
  gap: 14px;
  margin: 10px 0 8px;
  font-size: 16px;
}
.cons {
  margin-top: 16px;
}
.cons-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.cons-btns {
  display: flex;
  gap: 6px;
}
@media (max-width: 700px) {
  .shop {
    flex-direction: column;
  }
  .cats {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .cats button {
    flex: 1 1 45%;
  }
}
</style>
