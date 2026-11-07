import { useEffect, useRef, useState } from 'react'
import { playSound } from '../lib/sound'
import Avatar from './Avatar'
import './JoinRequests.css'

export default function JoinRequests({ requests, inGame, onRespond }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  // A chime when a new request arrives (not when the list shrinks)
  const prevCount = useRef(requests.length)
  useEffect(() => {
    if (requests.length > prevCount.current) playSound('land')
    prevCount.current = requests.length
  }, [requests.length])

  if (requests.length === 0) return null

  async function respond(req, approve) {
    setBusyId(req.user_id)
    setError(null)
    try {
      await onRespond(req.user_id, approve)
    } catch {
      setError('That didn’t work. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <aside className="joinreq" aria-live="polite" aria-label="Join requests">
      {requests.map((req) => (
        <div className="joinreq__item" key={req.user_id}>
          <Avatar id={req.avatar} size={40} />
          <div className="joinreq__text">
            <strong>{req.name}</strong> wants to join
            {inGame && <small>They’ll start from the next round.</small>}
          </div>
          <div className="joinreq__btns">
            <button
              type="button"
              className="joinreq__btn joinreq__btn--yes"
              disabled={busyId === req.user_id}
              onClick={() => respond(req, true)}
            >
              Let in
            </button>
            <button
              type="button"
              className="joinreq__btn joinreq__btn--no"
              disabled={busyId === req.user_id}
              onClick={() => respond(req, false)}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
      {error && (
        <p className="joinreq__error" role="alert">
          {error}
        </p>
      )}
    </aside>
  )
}