import { supabase } from './supabase'

// No 0/O or 1/I/L, so codes are easy to read out loud
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

async function ensureUser() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user
  const { data: signedIn, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signedIn.user
}

export async function createRoom(name) {
  const user = await ensureUser()

  // Retry in the unlikely case the random code is already taken
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ code: makeCode(), host_id: user.id })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') continue // duplicate code, try again
      throw error
    }

    const { error: playerError } = await supabase
      .from('players')
      .insert({ room_id: room.id, user_id: user.id, name })
    if (playerError) throw playerError

    return room
  }
  throw new Error('CODE_GENERATION_FAILED')
}

export async function joinRoom(code, name) {
  const user = await ensureUser()

  const { data: room, error } = await supabase
    .from('rooms')
    .select()
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.status !== 'lobby') throw new Error('ROOM_STARTED')

  const { error: playerError } = await supabase
    .from('players')
    .insert({ room_id: room.id, user_id: user.id, name })

  // 23505 = you're already in this room (e.g. you refreshed), that's fine
  if (playerError && playerError.code !== '23505') throw playerError

  return room
}