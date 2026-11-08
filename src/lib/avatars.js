export const AVATARS = [
  { id: 'cat1', src: '/avatars/cat1.png', color: '#731f16', label: 'Cat 1' },
  { id: 'cat2', src: '/avatars/cat2.png', color: '#a6551e', label: 'Cat 2' },
  { id: 'cat3', src: '/avatars/cat3.png', color: '#a27b19', label: 'Cat 3' },
  { id: 'cat4', src: '/avatars/cat4.png', color: '#1e8c4a', label: 'Cat 4' },
  { id: 'cat5', src: '/avatars/cat5.png', color: '#1c76ae', label: 'Cat 5' },
  { id: 'cat6', src: '/avatars/cat6.png', color: '#522fb2', label: 'Cat 6' },
  { id: 'cat7', src: '/avatars/cat7.png', color: '#22839e', label: 'Cat 7' },
  { id: 'cat8', src: '/avatars/cat8.png', color: '#aba4b9', label: 'Cat 8' },
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