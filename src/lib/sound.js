import { getSettings } from './settings'

let ctx = null

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

// Real audio files. Anything missing falls back to the code-made sound of the same name.
const SAMPLES = {
  start: { url: '/sfx/round.mp3', gain: 1 }, // game starts
  round: { url: '/sfx/round.mp3', gain: 1 }, // new round
  lock: { url: '/sfx/lock.mp3', gain: 1 }, // answer locked in
  shot: { url: '/sfx/shot.mp3', gain: 1 }, // someone takes a shot
  picked: { url: '/sfx/picked.mp3', gain: 0.25 }, // you're on the spot
}
const MAX_SECONDS = 3 // longer clips get faded out and cut here

const buffers = {}
const requested = new Set()

function preloadSamples() {
  const c = getCtx()
  if (!c) return
  for (const [name, { url }] of Object.entries(SAMPLES)) {
    if (requested.has(name)) continue
    requested.add(name)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('missing')
        return r.arrayBuffer()
      })
      .then((data) => c.decodeAudioData(data))
      .then((buf) => {
        buffers[name] = buf
      })
      .catch(() => {
        /* file missing or unreadable: the code-made sound is used instead */
      })
  }
}

// Browsers keep audio locked until the player taps, so wake it on every tap
export function unlockAudio() {
  const c = getCtx()
  if (c && c.state !== 'running') c.resume().catch(() => {})
  preloadSamples()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio)
  window.addEventListener('keydown', unlockAudio)
}

function tone({ freq, to, start = 0, dur = 0.15, type = 'sine', gain = 0.3 }) {
  const c = getCtx()
  const vol = getSettings().sfx
  if (!c || c.state !== 'running' || vol <= 0) return

  const t0 = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)

  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain * vol, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// Returns true if a real file was played
function playSample(name) {
  const c = getCtx()
  const vol = getSettings().sfx
  const buf = buffers[name]
  if (!c || c.state !== 'running' || vol <= 0 || !buf) return false

  const level = vol * SAMPLES[name].gain
  const t = c.currentTime
  const end = Math.min(buf.duration, MAX_SECONDS)

  const src = c.createBufferSource()
  const g = c.createGain()
  src.buffer = buf

  // Fade out over the last quarter second so a cut never clicks
  g.gain.setValueAtTime(level, t)
  g.gain.setValueAtTime(level, t + Math.max(end - 0.25, 0))
  g.gain.linearRampToValueAtTime(0, t + end)

  src.connect(g).connect(c.destination)
  src.start(t)
  src.stop(t + end)
  return true
}

const SOUNDS = {
  // Slot machine flicker
  tick: () => tone({ freq: 1000, dur: 0.035, type: 'square', gain: 0.07 }),

  // A reel locking onto its result
  land: () => {
    tone({ freq: 523, dur: 0.14, type: 'triangle', gain: 0.3 })
    tone({ freq: 784, start: 0.1, dur: 0.26, type: 'triangle', gain: 0.3 })
  },

  // "It's you"
  picked: () => {
    tone({ freq: 660, dur: 0.1, type: 'square', gain: 0.12 })
    tone({ freq: 660, start: 0.15, dur: 0.1, type: 'square', gain: 0.12 })
    tone({ freq: 880, start: 0.3, dur: 0.22, type: 'square', gain: 0.12 })
  },

  // Answer revealed
  reveal: () => {
    ;[523, 659, 784, 1047].forEach((freq, i) =>
      tone({ freq, start: i * 0.08, dur: 0.3, type: 'triangle', gain: 0.25 })
    )
  },

  // Glass clink, then a gulp
  shot: () => {
    tone({ freq: 2400, to: 2200, dur: 0.35, gain: 0.22 })
    tone({ freq: 3600, dur: 0.2, gain: 0.08 })
    tone({ freq: 180, to: 90, start: 0.18, dur: 0.22, gain: 0.35 })
  },

  // Fallbacks for the three that can use files
  start: () => {
    ;[392, 523, 659].forEach((freq, i) =>
      tone({ freq, start: i * 0.1, dur: 0.25, type: 'triangle', gain: 0.25 })
    )
  },
  lock: () => tone({ freq: 440, to: 660, dur: 0.12, type: 'triangle', gain: 0.25 }),
  round: () => tone({ freq: 330, to: 660, dur: 0.25, type: 'triangle', gain: 0.25 }),
}

export function playSound(name) {
  if (playSample(name)) return
  SOUNDS[name]?.()
}

// Vibration (Android and most Chromium browsers; iPhones don't support it)
export function buzz(pattern = [120, 60, 120]) {
  if (!getSettings().vibrate) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported */
  }
}

export function getAudioContext() {
  return getCtx()
}