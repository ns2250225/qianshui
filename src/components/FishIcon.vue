<script setup lang="ts">
import { computed } from 'vue'
import { FISH_MAP } from '../data/fish'
import { fishIconURL } from '../game/fish/FishArt'

const props = defineProps<{ id: string; silhouette?: boolean; big?: boolean; size?: number }>()
const src = computed(() => {
  const sp = FISH_MAP[props.id]
  return sp ? fishIconURL(sp, !!props.silhouette, !!props.big) : ''
})
const box = computed(() => props.size ?? (props.big ? 150 : 64))
</script>

<template>
  <div class="fish-icon" :style="{ width: box + 'px', height: box * 0.62 + 'px' }">
    <img class="pix" :src="src" alt="" />
  </div>
</template>

<style scoped>
.fish-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
.fish-icon img {
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
