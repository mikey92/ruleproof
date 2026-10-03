// What Ruleproof keeps in this browser (localStorage): the reader's settings.

import { useSyncExternalStore } from 'react'

const SETTINGS = 'ruleproof:settings'

export interface Settings {
  zone: string
}

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('ruleproof:')) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the change still shows for this visit.
  }
  cache.delete(key)
  emit()
}

// useSyncExternalStore needs the same object back until something changes.
const cache = new Map<string, unknown>()
function cached<T>(key: string, fallback: T): T {
  if (!cache.has(key)) cache.set(key, load(key, fallback))
  return cache.get(key) as T
}

export const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export function useSettings(): [Settings, (next: Settings) => void] {
  const settings = useSyncExternalStore(subscribe, () => cached<Settings>(SETTINGS, { zone: browserZone }))
  return [settings, (next) => save(SETTINGS, next)]
}

export const ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return [browserZone]
  }
})()
