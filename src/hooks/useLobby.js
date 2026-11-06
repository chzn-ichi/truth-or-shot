import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pickQuestion } from '../lib/questions'

export function useLobby(initialRoom) {
  const roomId = initialRoom.id
  const [room, setRoom] = useState(initialRoom)
  const [players, setPlayers] = useState([])
  const [questions, setQuestions] = useState([])
  const [userId, setUserId] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
    })
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      const [p, q] = await Promise.all([
        supabase.from('players').select().eq('room_id', roomId).order('joined_at'),
        supabase.from('custom_questions').select().eq('room_id', roomId).order('created_at'),
      ])
      if (!active) return
      if (p.data) {
        setPlayers(p.data)
        setLoaded(true)
      }
      if (q.data) setQuestions(q.data)
    }

    const channel = supabase
      .channel(`lobby:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        load
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_questions', filter: `room_id=eq.${roomId}` },
        load
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new)
          load() // players_version changes whenever someone leaves or is removed
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') load()
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // True once we know the player list and we're no longer on it
  const removed = loaded && !!userId && !players.some((p) => p.user_id === userId)

  const addQuestion = useCallback(
    async (text) => {
      const { error } = await supabase
        .from('custom_questions')
        .insert({ room_id: roomId, user_id: userId, text })
      if (error) throw error
    },
    [roomId, userId]
  )

  const removeQuestion = useCallback(async (id) => {
    const { error } = await supabase.from('custom_questions').delete().eq('id', id)
    if (error) throw error
  }, [])

  const startGame = useCallback(async () => {
    const used = room.used_questions ?? []
    const text = pickQuestion(
      questions.map((q) => q.text),
      used
    )
    const { error } = await supabase
      .from('rooms')
      .update({
        status: 'answering',
        round_number: 1,
        current_question: text,
        used_questions: [...used, text],
      })
      .eq('id', roomId)
    if (error) throw error
  }, [roomId, questions, room.used_questions])

  const nextRound = useCallback(async () => {
    const text = pickQuestion(
      questions.map((q) => q.text),
      room.used_questions ?? []
    )
    const { error } = await supabase.rpc('next_round', { p_room: roomId, p_question: text })
    if (error) throw error
  }, [roomId, questions, room.used_questions])

  const kickPlayer = useCallback(
    async (targetId) => {
      const { error } = await supabase.rpc('kick_player', { p_room: roomId, p_user: targetId })
      if (error) throw error
    },
    [roomId]
  )

  const endGame = useCallback(async () => {
    const { error } = await supabase.from('rooms').update({ status: 'ended' }).eq('id', roomId)
    if (error) throw error
  }, [roomId])

  return {
    room,
    players,
    questions,
    userId,
    removed,
    addQuestion,
    removeQuestion,
    startGame,
    nextRound,
    kickPlayer,
    endGame,
  }
}