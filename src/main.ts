import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// 点击按钮后释放焦点，避免空格键重复触发按钮
document.addEventListener('pointerup', () => {
  const el = document.activeElement as HTMLElement | null
  if (el && el.tagName === 'BUTTON') el.blur()
})
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && (e.target as HTMLElement)?.tagName === 'BUTTON') e.preventDefault()
})

createApp(App).mount('#app')
