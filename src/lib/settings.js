import { useSyncExternalStore } from 'react'

const KEY = 'truth-or-shot:settings'
const DEFAULTS = { music: 0.5, sfx: 0.8, keepAwake: true, vibrate: true }

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

let current = read()
const listeners = new Set()

// For non-React code (the audio player will use this later)
export function getSettings() {
  return current
}

export function updateSettings(patch) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* storage blocked, settings just won't survive a refresh */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings)
}


export { subscribe as subscribeSettings }