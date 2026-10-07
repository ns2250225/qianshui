<script setup lang="ts">
import { computed, ref } from 'vue'
import Panel from './Panel.vue'
import FishIcon from './FishIcon.vue'
import { save, ui } from '../store/state'
import { FISH, FISH_MAP, RARITY_COLORS, RARITY_NAMES, HABITAT_NAMES, BEHAVIOR_NAMES, rarityStars, type FishSpecies } from '../data/fish'
import { familyInfo } from '../data/fish/families'
import { FISH_REGION_NAMES, FISH_REGION_OCEANS, OCEAN_NAMES, type OceanId } from '../data/regions/regions'
import { levelOf } from '../data/progress'

type Mode = 'all' | 'taxon' | 'ocean' | 'eco' | 'depth'
const mode = ref<Mode>('all')
const sub = ref('')
const q = ref('')
const onlyFound = ref(false)
const detail = ref<string | null>(ui.encyclopediaFocus)
ui.encyclopediaFocus = null

const found = computed(() => Object.keys(save.encyclopedia).length)
const level = computed(() => levelOf(save.research))
const spoil = computed(() => save.settings.encyclopediaSpoilers)

const ECO: Record<string, (f: FishSpecies) => boolean> = {
  珊瑚礁: (f) => f.habitat.includes('coral_reef'),
  近岸: (f) => f.habitat.some((h) => ['coastal', 'estuary', 'mangrove', 'seagrass', 'rocky', 'kelp', 'sandy'].includes(h)),
  外海: (f) => f.habitat.includes('pelagic'),
  底栖: (f) => f.habitat.some((h) => ['benthic', 'deep_benthic', 'sandy'].includes(h)) || ['benthic', 'camouflage'].includes(f.behavior),
  深海: (f) => f.depth.min >= 200 || f.habitat.some((h) => ['deep_pelagic', 'deep_benthic', 'vent'].includes(h)),
  海沟: (f) => f.habitat.includes('trench') || f.depth.max >= 6000,
}
const DEPTHS: Record<string, [number, number]> = {
  '0–50m': [0, 50],
  '50–200m': [50, 200],
  '200–1000m': [200, 1000],
  '1000–4000m': [1000, 4000],
  '4000m+': [4000, 99999],
}
const orders = computed(() => {
  const m = new Map<string, Set<string>>()
  for (const f of FISH) {
    const fi = familyInfo(f.family)
    const k = `${fi.orderCn}`
    if (!m.has(k)) m.set(k, new Set())
    m.get(k)!.add(f.family)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'))
})
const subOptions = computed<string[]>(() => {
  if (mode.value === 'taxon') return orders.value.flatMap(([o, fams]) => [o, ...[...fams].map((f) => `　${familyInfo(f).cn}|${f}`)])
  if (mode.value === 'ocean') return Object.keys(OCEAN_NAMES)
  if (mode.value === 'eco') return Object.keys(ECO)
  if (mode.value === 'depth') return Object.keys(DEPTHS)
  return []
})
function subLabel(s: string) {
  if (mode.value === 'ocean') return OCEAN_NAMES[s as OceanId]
  if (s.includes('|')) return s.split('|')[0]
  return s
}
function setMode(m: Mode) {
  mode.value = m
  sub.value = subOptions.value[0] ?? ''
}

function oceans(f: FishSpecies): OceanId[] {
  const s = new Set<OceanId>()
  for (const r of f.region) for (const o of FISH_REGION_OCEANS[r]) s.add(o)
  return [...s]
}

const list = computed(() => {
  const term = q.value.trim().toLowerCase()
  return FISH.filter((f) => {
    const disc = !!save.encyclopedia[f.id]
    if (onlyFound.value && !disc) return false
    if (term) {
      const fi = familyInfo(f.family)
      const hay = [f.commonName, f.englishName, f.scientificName, f.family, f.genus, fi.cn, fi.orderCn, ...f.region.map((r) => FISH_REGION_NAMES[r]), `${f.depth.min}-${f.depth.max}m`].join(' ').toLowerCase()
      if (!hay.includes(term)) {
        const n = parseInt(term)
        if (!(Number.isFinite(n) && n >= f.depth.min && n <= f.depth.max)) return false
      }
      // 未发现的物种：非百科模式下只允许按完整名称搜索
      if (!disc && !spoil.value && !(f.commonName === q.value.trim() || f.scientificName.toLowerCase() === term)) return false
    }
    switch (mode.value) {
      case 'taxon': {
        if (!sub.value) return true
        if (sub.value.includes('|')) return f.family === sub.value.split('|')[1]
        return familyInfo(f.family).orderCn === sub.value
      }
      case 'ocean':
        return oceans(f).includes(sub.value as OceanId)
      case 'eco':
        return ECO[sub.value]?.(f) ?? true
      case 'depth': {
        const r = DEPTHS[sub.value]
        return r ? f.depth.max >= r[0] && f.depth.min < r[1] : true
      }
    }
    return true
  })
})
const listFound = computed(() => list.value.filter((f) => save.encyclopedia[f.id]).length)
const sp = computed(() => (detail.value ? FISH_MAP[detail.value] : null))
const entry = computed(() => (detail.value ? save.encyclopedia[detail.value] : null))
const show = computed(() => !!entry.value || spoil.value)
function regionsText(f: FishSpecies) {
  return f.region.map((r) => FISH_REGION_NAMES[r]).join(' / ')
}
function idx(f: FishSpecies) {
  return FISH.indexOf(f) + 1
}
function nav(d: number) {
  const l = list.value
  const i = l.findIndex((f) => f.id === detail.value)
  if (i < 0) return
  const n = l[(i + d + l.length) % l.length]
  detail.value = n.id
}
</script>

<template>
  <Panel title="世界鱼类图鉴" wide>
    <template #head>
      <span class="muted">已收录数据库：<b class="txt">{{ FISH.length.toLocaleString() }}</b> 种</span>
      <span>玩家发现：<b class="gold">{{ found }}</b> 种</span>
      <span class="muted">图鉴点 {{ save.research.toLocaleString() }} · Lv.{{ level.level }} {{ level.name }}</span>
    </template>

    <div v-if="!sp" class="enc">
      <div class="filters">
        <div class="tabs">
          <button :class="{ on: mode === 'all' }" @click="setMode('all')">全部</button>
          <button :class="{ on: mode === 'taxon' }" @click="setMode('taxon')">按分类</button>
          <button :class="{ on: mode === 'ocean' }" @click="setMode('ocean')">按海域</button>
          <button :class="{ on: mode === 'eco' }" @click="setMode('eco')">按生态</button>
          <button :class="{ on: mode === 'depth' }" @click="setMode('depth')">按深度</button>
        </div>
        <select v-if="mode !== 'all'" v-model="sub">
          <option v-for="o in subOptions" :key="o" :value="o">{{ subLabel(o) }}</option>
        </select>
        <input type="search" v-model="q" placeholder="搜索：中文名 / 英文名 / 学名 / 科 / 属 / 海域 / 深度" />
        <label><input type="checkbox" v-model="onlyFound" /> 仅已发现</label>
        <label title="显示未发现物种的现实资料（剧透）"><input type="checkbox" v-model="save.settings.encyclopediaSpoilers" /> 百科模式</label>
      </div>
      <div class="count muted">当前列表 {{ listFound }} / {{ list.length }}</div>
      <div class="grid">
        <div v-for="f in list" :key="f.id" class="card" :class="{ undisc: !save.encyclopedia[f.id] }" @click="detail = f.id">
          <div class="no">No.{{ String(idx(f)).padStart(3, '0') }}</div>
          <FishIcon :id="f.id" :silhouette="!save.encyclopedia[f.id]" :size="90" />
          <div class="nm">{{ save.encyclopedia[f.id] || spoil ? f.commonName : '?????' }}</div>
          <div class="st" :style="{ color: save.encyclopedia[f.id] || spoil ? RARITY_COLORS[f.rarity] : '#456' }">{{ save.encyclopedia[f.id] || spoil ? rarityStars(f.rarity) : '☆☆☆☆☆' }}</div>
          <div v-if="save.encyclopedia[f.id]?.photographed && !save.encyclopedia[f.id]?.caught" class="tag">📷</div>
        </div>
      </div>
      <div v-if="!list.length" class="muted empty">没有符合条件的物种。</div>
    </div>

    <div v-else class="detail">
      <div class="nav">
        <button @click="detail = null">← 返回列表</button>
        <button @click="nav(-1)">‹</button>
        <button @click="nav(1)">›</button>
        <span class="muted">No.{{ String(idx(sp)).padStart(3, '0') }}</span>
        <span v-if="!entry && spoil" class="warnTag">未发现 · 百科资料</span>
      </div>
      <div class="sheet pixel-box">
        <div class="hero">
          <FishIcon :id="sp.id" :silhouette="!show" big :size="260" />
        </div>
        <template v-if="show">
          <div class="cn">{{ sp.commonName }}</div>
          <div class="en">{{ sp.englishName }}</div>
          <div class="sci">{{ sp.scientificName }}</div>
          <div class="stars" :style="{ color: RARITY_COLORS[sp.rarity] }">{{ rarityStars(sp.rarity) }} {{ RARITY_NAMES[sp.rarity] }}</div>
          <hr />
          <div class="rows">
            <div><span>目：</span>{{ familyInfo(sp.family).orderCn }}（{{ familyInfo(sp.family).order }}）</div>
            <div><span>科：</span>{{ familyInfo(sp.family).cn }}（{{ sp.family }}）</div>
            <div><span>属：</span><i>{{ sp.genus }}</i></div>
            <div><span>最大体长：</span>{{ sp.size.max >= 100 ? (sp.size.max / 100).toFixed(sp.size.max >= 1000 ? 0 : 1) + 'm' : sp.size.max + 'cm' }}</div>
            <div><span>栖息深度：</span>{{ sp.depth.min }}–{{ sp.depth.max }}m</div>
            <div><span>分布：</span>{{ regionsText(sp) }}</div>
            <div><span>栖息环境：</span>{{ sp.habitat.map((h) => HABITAT_NAMES[h]).join(' / ') }}</div>
            <div><span>行为：</span>{{ BEHAVIOR_NAMES[sp.behavior] }}{{ sp.active === 'night' ? '（夜间活动）' : '' }}{{ sp.dvm ? '（昼夜垂直迁移）' : '' }}</div>
            <div v-if="sp.glow"><span>生物发光：</span><i :style="{ color: sp.glow }">●</i> 是</div>
            <div v-if="sp.danger"><span>危险程度：</span>{{ '⚠'.repeat(sp.danger) }}</div>
            <div><span>捕获难度：</span>{{ sp.photoOnly ? '仅可拍摄记录' : sp.captureDifficulty + ' / 10' }}</div>
            <div><span>参考价格：</span>${{ sp.price.toLocaleString() }}</div>
          </div>
          <p v-if="sp.note" class="note">{{ sp.note }}</p>
          <hr />
          <div v-if="entry" class="rows">
            <div><span>发现次数：</span>{{ entry.caught }}{{ entry.photographed ? '（已拍摄）' : '' }}</div>
            <div><span>最大个体：</span>{{ entry.maxSize ? entry.maxSize + 'cm' : '—' }}</div>
            <div><span>首次发现：</span>{{ entry.firstFound.region }} · {{ entry.firstFound.depth }}m · 第 {{ entry.firstFound.day }} 天 · {{ entry.firstFound.how === 'photo' ? '拍摄' : entry.firstFound.how === 'trap' ? '鱼笼' : '捕获' }}</div>
          </div>
          <div v-else class="muted">尚未发现。去 {{ regionsText(sp) }} 的 {{ sp.depth.min }}–{{ sp.depth.max }}m 寻找吧！</div>
        </template>
        <template v-else>
          <div class="cn">?????</div>
          <div class="bars">████████</div>
          <div class="rows">
            <div><span>栖息地：</span>未知</div>
            <div><span>深度：</span>未知</div>
          </div>
          <p class="muted">这条奇怪轮廓到底是什么鱼？</p>
        </template>
      </div>
    </div>
  </Panel>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.tabs {
  display: flex;
  gap: 4px;
}
.tabs button.on {
  background: #1f5f94;
  border-color: var(--accent);
}
.filters input[type='search'] {
  flex: 1;
  min-width: 200px;
}
label {
  font-size: 13px;
  display: flex;
  gap: 4px;
  align-items: center;
  cursor: pointer;
}
.count {
  font-size: 12px;
  margin-bottom: 6px;
}
.txt {
  color: var(--text);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 8px;
}
.card {
  position: relative;
  background: #0a2440;
  border: 2px solid #1f4f7a;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.card:hover {
  border-color: var(--border2);
}
.card.undisc {
  background: #06182c;
}
.no {
  font-size: 10px;
  color: var(--muted);
  align-self: flex-start;
}
.nm {
  font-size: 13px;
  text-align: center;
  margin-top: 2px;
}
.st {
  font-size: 11px;
}
.tag {
  position: absolute;
  right: 4px;
  top: 2px;
  font-size: 12px;
}
.empty {
  padding: 30px;
  text-align: center;
}
.nav {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
}
.warnTag {
  color: var(--warn);
  font-size: 12px;
}
.sheet {
  max-width: 560px;
  margin: 0 auto;
  padding: 16px 22px;
}
.hero {
  display: flex;
  justify-content: center;
  background: radial-gradient(circle, #0f3a66, #061a30);
  border: 2px solid #1f4f7a;
  padding: 10px;
}
.cn {
  font-size: 28px;
  text-align: center;
  margin-top: 10px;
}
.en {
  text-align: center;
  color: #bfe6ff;
}
.sci {
  text-align: center;
  font-style: italic;
  color: var(--muted);
}
.stars {
  text-align: center;
  margin-top: 4px;
}
hr {
  border: 0;
  border-top: 2px dashed #1f4f7a;
  margin: 12px 0;
}
.rows {
  display: grid;
  gap: 4px;
  font-size: 14px;
}
.rows span {
  color: var(--muted);
}
.note {
  background: #0a2440;
  border-left: 4px solid var(--accent);
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.6;
}
.bars {
  text-align: center;
  color: #234;
  font-size: 20px;
  margin: 6px 0 10px;
}
</style>
