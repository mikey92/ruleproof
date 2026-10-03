// What Ruleproof keeps in this browser (localStorage): the contests checked so far, with their rules, readings and
// ticks, and the reader's settings. Nothing leaves the browser.

import { useSyncExternalStore } from 'react'
import type { Contest } from '../shared/types'

const SETTINGS = 'ruleproof:settings'
const CONTESTS = 'ruleproof:contests'

export interface Settings {
  zone: string
}

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab changed something: read it again.
  const onStorage = (e: StorageEvent) => {
    if (!e.key?.startsWith('ruleproof:')) return
    cache.delete(e.key)
    listener()
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

function save(key: string, value: unknown): boolean {
  let stored = true
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the change still shows for this visit.
    stored = false
  }
  cache.set(key, value)
  emit()
  return stored
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

export function useContests(): Contest[] {
  return useSyncExternalStore(subscribe, () => cached<Contest[]>(CONTESTS, []))
}

function contests(): Contest[] {
  return cached<Contest[]>(CONTESTS, [])
}

export function getContest(id: string): Contest | undefined {
  return contests().find((c) => c.id === id)
}

/** Adds a contest, or replaces the saved one with the same id. Returns false if the browser refused to store it. */
export function putContest(contest: Contest): boolean {
  return save(CONTESTS, [contest, ...contests().filter((c) => c.id !== contest.id)])
}

export function updateContest(id: string, change: (c: Contest) => Contest) {
  save(
    CONTESTS,
    contests().map((c) => (c.id === id ? change(c) : c)),
  )
}

export function deleteContest(id: string) {
  save(
    CONTESTS,
    contests().filter((c) => c.id !== id),
  )
}

function toggle(list: number[], n: number, on: boolean): number[] {
  const rest = list.filter((x) => x !== n)
  return on ? [...rest, n] : rest
}

export function setTicked(id: string, item: number, on: boolean) {
  updateContest(id, (c) => ({ ...c, ticked: toggle(c.ticked, item, on) }))
}

export function setDismissed(id: string, item: number, on: boolean) {
  updateContest(id, (c) => ({ ...c, dismissed: toggle(c.dismissed, item, on) }))
}

export const ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return [browserZone]
  }
})()
