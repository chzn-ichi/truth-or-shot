import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useGame(room, userId) {
  const roomId = room.id
  const round = room.round_number
  const status = room.status
  const iAmPicked = !!userId && !!room.picked_ids?.includes(userId)

  const [submitted, setSubmitted] = useState([]) // user ids who have answered
  const [decisions, setDecisions] = useState([])
  const [myAnswer, setMyAnswer] = useState(null)

  const loadSubmitted = useCallback(async () => {
    const { data } = await supabase
      .from('submissions')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('round_number', round)
    if (data) setSubmitted(data.map((r) => r.user_id))
  }, [roomId, round])

  const loadDecisions = useCallback(async () => {
    const { data } = await supabase
      .from('decisions')
      .select()
      .eq('room_id', roomId)
      .eq('round_number', round)
    if (data) setDecisions(data)
  }, [roomId, round])

  useEffect(() => {
    if (!round) return

    const channel = supabase
      .channel(`round:${roomId}:${round}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions', filter: `room_id=eq.${roomId}` },
        loadSubmitted
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'decisions', filter: `room_id=eq.${roomId}` },
        loadDecisions
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          loadSubmitted()
          loadDecisions()
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, round, loadSubmitted, loadDecisions])

  // If I'm picked, fetch my own answer so I can see it before deciding
  useEffect(() => {
    if (status !== 'selecting' || !iAmPicked) return
    supabase
      .from('answers')
      .select('text')
      .eq('room_id', roomId)
      .eq('round_number', round)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setMyAnswer(data?.text ?? null))
  }, [status, iAmPicked, roomId, round, userId])

  const submitAnswer = useCallback(
    async (text) => {
      const { error } = await supabase
        .from('answers')
        .insert({ room_id: roomId, round_number: round, user_id: userId, text })
      if (error) throw error
    },
    [roomId, round, userId]
  )

  const decide = useCallback(
    async (choice) => {
      const { error } = await supabase.rpc('decide', { p_room: roomId, p_choice: choice })
      if (error) throw error
      await loadDecisions()
    },
    [roomId, loadDecisions]
  )

  return { submitted, submitAnswer, decisions, myAnswer, decide }
}