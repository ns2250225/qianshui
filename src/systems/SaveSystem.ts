import { toRaw } from 'vue'
import { normalizeSave, save, newSave, type SaveData } from '../store/state'

const DB_NAME = 'pixel-ocean'
const STORE = 'save'
const KEY = 'main'
const LS_KEY = 'pixel-ocean-backup'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function snapshot(): SaveData {
  return JSON.parse(JSON.stringify(toRaw(save)))
}

function apply(data: SaveData) {
  const n = normalizeSave(data)
  for (const k of Object.keys(save) as (keyof SaveData)[]) delete (save as any)[k]
  Object.assign(save, n)
}

export const SaveSystem = {
  async load(): Promise<boolean> {
    let data: any = null
    try {
      const db = await openDB()
      data = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const r = tx.objectStore(STORE).get(KEY)
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
      })
    } catch {
      /* ignore */
    }
    if (!data) {
      try {
        const ls = localStorage.getItem(LS_KEY)
        if (ls) data = JSON.parse(ls)
      } catch {
        /* ignore */
      }
    }
    if (data) {
      apply(data)
      return true
    }
    apply(newSave())
    return false
  },

  async save() {
    const snap = snapshot()
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snap))
    } catch {
      /* ignore */
    }
    try {
      const db = await openDB()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(snap, KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      /* ignore */
    }
  },

  saveSync() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot()))
    } catch {
      /* ignore */
    }
  },

  exportJSON() {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const d = new Date()
    a.download = `pixel-ocean-save-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  },

  async importJSON(text: string): Promise<void> {
    const data = JSON.parse(text)
    if (!data || typeof data !== 'object' || typeof data.money !== 'number' || !data.equipment) {
      throw new Error('存档格式不正确')
    }
    apply(data)
    await this.save()
  },

  async reset() {
    apply(newSave())
    await this.save()
  },
}
