import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pickQuestion } from '../lib/questions'

// Requests older than this are hidden, in case the person closed their tab
const REQUEST_WINDOW_MS = 10 * 60 * 1000

export function useLobby(initialRoom) {
  const roomId = initialRoom.id
  const [room, setRoom] = useState(initialRoom)
  const [players, setPlayers] = useState([])
  const [questions, setQuestions] = useState([])
  const [requests, setRequests] = useState([])
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
      const since = new Date(Date.now() - REQUEST_WINDOW_MS).toISOString()
      const [p, q, j] = await Promise.all([
        supabase.from('players').select().eq('room_id', roomId).order('joined_at'),
        supabase.from('custom_questions').select().eq('room_id', roomId).order('created_at'),
        // Only the host can read these, everyone else just gets an empty list
        supabase
          .from('join_requests')
          .select()
          .eq('room_id', roomId)
          .eq('status', 'pending')
          .gte('created_at', since)
          .order('created_at'),
      ])
      if (!active) return
      if (p.data) {
        setPlayers(p.data)
        setLoaded(true)
      }
      if (q.data) setQuestions(q.data)
      if (j.data) setRequests(j.data)
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
        { event: '*', schema: 'public', table: 'join_requests', filter: `room_id=eq.${roomId}` },
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

  const setSkipAnimation = useCallback(
    async (value) => {
      setRoom((r) => ({ ...r, skip_animation: value })) // update the toggle right away
      const { error } = await supabase
        .from('rooms')
        .update({ skip_animation: value })
        .eq('id', roomId)
      if (error) {
        setRoom((r) => ({ ...r, skip_animation: !value })) // put it back if it failed
        throw error
      }
    },
    [roomId]
  )

  const respondJoin = useCallback(
    async (targetId, approve) => {
      const { error } = await supabase.rpc('respond_join', {
        p_room: roomId,
        p_user: targetId,
        p_approve: approve,
      })
      if (error) throw error
      setRequests((list) => list.filter((r) => r.user_id !== targetId))
    },
    [roomId]
  )

  return {
    room,
    players,
    questions,
    requests,
    userId,
    removed,
    addQuestion,
    removeQuestion,
    startGame,
    nextRound,
    kickPlayer,
    endGame,
    setSkipAnimation,
    respondJoin,
  }
}