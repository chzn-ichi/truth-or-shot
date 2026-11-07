export const AVATARS = [
  { id: 'fox', emoji: '🦊', color: '#ff9a55', label: 'Fox' },
  { id: 'frog', emoji: '🐸', color: '#7be0a4', label: 'Frog' },
  { id: 'panda', emoji: '🐼', color: '#d8d2e4', label: 'Panda' },
  { id: 'cat', emoji: '🐱', color: '#ffc93c', label: 'Cat' },
  { id: 'octopus', emoji: '🐙', color: '#ff5c8a', label: 'Octopus' },
  { id: 'unicorn', emoji: '🦄', color: '#b79cff', label: 'Unicorn' },
  { id: 'robot', emoji: '🤖', color: '#6cc7ff', label: 'Robot' },
  { id: 'alien', emoji: '👽', color: '#a6e65a', label: 'Alien' },
  { id: 'ghost', emoji: '👻', color: '#efe9f7', label: 'Ghost' },
  { id: 'devil', emoji: '😈', color: '#ff6b5c', label: 'Devil' },
  { id: 'taco', emoji: '🌮', color: '#f2b36b', label: 'Taco' },
  { id: 'pizza', emoji: '🍕', color: '#ff8fb3', label: 'Pizza' },
]

const BY_ID = Object.fromEntries(AVATARS.map((a) => [a.id, a]))

// Unknown ids (for example from an older version) fall back to the first one
export function getAvatar(id) {
  return BY_ID[id] ?? AVATARS[0]
}

function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id
}

const KEY = 'truth-or-shot:profile'

export function loadProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw && typeof raw === 'object') {
      return {
        name: typeof raw.name === 'string' ? raw.name.slice(0, 16) : '',
        avatar: BY_ID[raw.avatar] ? raw.avatar : randomAvatar(),
      }
    }
  } catch {
    /* corrupted or blocked storage, start fresh */
  }
  return { name: '', avatar: randomAvatar() }
}

export function saveProfile({ name, avatar }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, avatar }))
  } catch {
    /* storage blocked, it just won't be remembered */
  }
}