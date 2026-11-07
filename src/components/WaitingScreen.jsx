import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { cancelJoin } from '../lib/game'
import Avatar from './Avatar'
import './WaitingScreen.css'

export default function WaitingScreen({ room, name, avatar, onApproved, onDenied, onCancel }) {
  const [cancelling, setCancelling] = useState(false)
  const finished = useRef(false)

  useEffect(() => {
    let active = true

    // You can only read your own request, so this returns just yours
    async function check() {
      if (!active || finished.current) return
      const { data } = await supabase
        .from('join_requests')
        .select('status')
        .eq('room_id', room.id)
        .maybeSingle()
      if (!active || finished.current || !data) return

      if (data.status === 'approved') {
        finished.current = true
        const { data: fresh } = await supabase
          .from('rooms')
          .select()
          .eq('id', room.id)
          .maybeSingle()
        onApproved(fresh ?? room)
      } else if (data.status === 'denied') {
        finished.current = true
        onDenied()
      }
    }

    const channel = supabase
      .channel(`join:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'join_requests', filter: `room_id=eq.${room.id}` },
        check
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') check()
      })

    // Backup in case a live update is missed
    const poll = setInterval(check, 5000)

    return () => {
      active = false
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id])

  async function handleCancel() {
    setCancelling(true)
    finished.current = true
    try {
      await cancelJoin(room.id)
    } catch {
      /* the request just expires on its own */
    }
    onCancel()
  }

  return (
    <main className="waiting">
      <div className="waiting__who">
        <span className="waiting__pulse">
          <Avatar id={avatar} size={64} />
        </span>
        <span className="waiting__name">{name}</span>
      </div>

      <h1 className="waiting__title">Waiting for the host…</h1>
      <p className="waiting__hint">
        A game is already in progress, so the host has to let you in. You’ll join from the next
        round.
      </p>

      <button
        type="button"
        className="waiting__btn"
        onClick={handleCancel}
        disabled={cancelling}
      >
        {cancelling ? 'Cancelling…' : 'Cancel'}
      </button>
    </main>
  )
}