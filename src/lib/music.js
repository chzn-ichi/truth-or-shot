import { getAudioContext } from './sound'
import { getSettings, subscribeSettings } from './settings'

const TRACK = '/music/theme.mp3'
const MAX_GAIN = 0.6 // keeps music a bit quieter than effects at the same slider position

let audio = null
let gain = null
let wanted = false // true while the player is inside a room

// Routed through Web Audio because iPhones ignore volume changes on a plain <audio> element
function setup() {
  if (audio) return true
  const ctx = getAudioContext()
  if (!ctx) return false

  audio = new Audio(TRACK)
  audio.loop = true
  audio.preload = 'auto'

  const source = ctx.createMediaElementSource(audio)
  gain = ctx.createGain()
  gain.gain.value = 0
  source.connect(gain).connect(ctx.destination)
  return true
}

function applyVolume() {
  const ctx = getAudioContext()
  if (!gain || !ctx) return
  // A short time constant makes volume changes (and the start) fade instead of jump
  gain.gain.setTargetAtTime(getSettings().music * MAX_GAIN, ctx.currentTime, 0.15)
}

function tryPlay() {
  if (!wanted || document.hidden) return
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running') return // still locked until the first tap
  if (!setup()) return

  if (getSettings().music <= 0) {
    audio.pause() // slider at zero: stop completely instead of playing silently
    return
  }
  applyVolume()
  audio.play().catch(() => {})
}

export function startMusic() {
  wanted = true
  tryPlay()
}

export function stopMusic() {
  wanted = false
  audio?.pause()
}

if (typeof window !== 'undefined') {
  // Browsers only allow sound after a tap, so try again on every tap
  window.addEventListener('pointerdown', () => {
    if (!wanted) return
    getAudioContext()
      ?.resume()
      .then(tryPlay)
      .catch(() => {})
  })

  // Don't keep playing while the tab is in the background
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio?.pause()
    else tryPlay()
  })

  subscribeSettings(() => {
    applyVolume()
    tryPlay()
  })
}