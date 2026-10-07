<script setup lang="ts">
import { ref } from 'vue'
import Panel from './Panel.vue'
import { save, toast, applyGodMode } from '../store/state'
import { SaveSystem } from '../systems/SaveSystem'

const file = ref<HTMLInputElement>()
const confirmReset = ref(false)

function exportSave() {
  SaveSystem.exportJSON()
}
function pick() {
  file.value?.click()
}
async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  try {
    await SaveSystem.importJSON(await f.text())
    toast('存档导入成功，正在重新载入…', 'good')
    setTimeout(() => location.reload(), 800)
  } catch (err: any) {
    toast('导入失败：' + (err?.message ?? '格式错误'), 'bad')
  }
}
async function reset() {
  await SaveSystem.reset()
  location.reload()
}
function toggleGod() {
  applyGodMode()
  toast(save.settings.godMode ? '⚡ 上帝模式已开启：无限金钱与素材' : '上帝模式已关闭', save.settings.godMode ? 'record' : 'info')
}
async function saveNow() {
  await SaveSystem.save()
  toast('💾 已保存', 'good')
}
</script>

<template>
  <Panel title="设置">
    <section>
      <h3>音频</h3>
      <label class="row">音乐 <input type="range" min="0" max="1" step="0.05" v-model.number="save.settings.music" /> {{ Math.round(save.settings.music * 100) }}</label>
      <label class="row">音效 <input type="range" min="0" max="1" step="0.05" v-model.number="save.settings.sfx" /> {{ Math.round(save.settings.sfx * 100) }}</label>
      <label class="row"><input type="checkbox" v-model="save.settings.mute" /> 静音</label>
    </section>
    <section>
      <h3>显示</h3>
      <label class="row"><input type="checkbox" v-model="save.settings.showFps" /> 显示帧率</label>
      <label class="row"><input type="checkbox" v-model="save.settings.lampOn" /> 潜水灯开启（L）</label>
      <label class="row"><input type="checkbox" v-model="save.settings.encyclopediaSpoilers" /> 图鉴百科模式（显示未发现物种的资料）</label>
    </section>
    <section>
      <h3>作弊</h3>
      <label class="row"><input type="checkbox" v-model="save.settings.godMode" @change="toggleGod" /> ⚡ 上帝模式（无限金钱、装备零件与诱鱼器）</label>
      <p class="muted small">开启后金币、零件、诱鱼器会自动保持充足；关闭后保留当前数量。</p>
    </section>
    <section>
      <h3>存档</h3>
      <p class="muted small">存档自动保存在浏览器 IndexedDB 中，无需账号。可导出 JSON 备份或在其他设备导入。</p>
      <div class="btns">
        <button @click="saveNow">💾 立即保存</button>
        <button @click="exportSave">⬇ 导出存档 JSON</button>
        <button @click="pick">⬆ 导入存档 JSON</button>
        <input ref="file" type="file" accept=".json,application/json" hidden @change="onFile" />
        <button v-if="!confirmReset" class="danger" @click="confirmReset = true">🗑 重置存档</button>
        <template v-else>
          <button class="danger" @click="reset">确认重置（不可撤销）</button>
          <button @click="confirmReset = false">取消</button>
        </template>
      </div>
    </section>
    <section>
      <h3>操作说明</h3>
      <div class="keys">
        <div><b>W A S D / 方向键</b> 游动</div>
        <div><b>Shift</b> 冲刺（推进器）</div>
        <div><b>Space</b> 挥网捕获 / 在船上跳水</div>
        <div><b>E</b> 互动（登船、呼叫小船、进入沉船/洞穴、开宝箱、收鱼笼）</div>
        <div><b>F</b> 图鉴　<b>B</b> 背包　<b>M</b> 海图</div>
        <div><b>R</b> 声呐　<b>C</b> 相机拍摄　<b>L</b> 潜水灯</div>
        <div><b>G</b> 投放诱鱼器　<b>T</b> 布置鱼笼　<b>H</b> 一键回到船上　<b>Esc</b> 关闭面板</div>
      </div>
    </section>
  </Panel>
</template>

<style scoped>
section {
  margin-bottom: 16px;
}
h3 {
  color: var(--accent);
  margin: 0 0 8px;
  font-size: 15px;
}
.row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 6px 0;
  font-size: 14px;
}
.row input[type='range'] {
  width: 200px;
}
.small {
  font-size: 12px;
}
.btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.keys {
  display: grid;
  gap: 4px;
  font-size: 13px;
}
.keys b {
  color: var(--accent);
}
</style>
