import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pickQuestion } from '../lib/questions'

export function useLobby(initialRoom) {
  const roomId = initialRoom.id
  const [room, setRoom] = useState(initialRoom)
  const [players, setPlayers] = useState([])
  const [questions, setQuestions] = useState([])
  const [userId, setUserId] = useState(null)

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
      if (p.data) setPlayers(p.data)
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
        (payload) => setRoom(payload.new)
      )
      .subscribe((status) => {
        // Load once we're listening, so nothing is missed in between
        if (status === 'SUBSCRIBED') load()
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [roomId])

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

  return { room, players, questions, userId, addQuestion, removeQuestion, startGame }
}