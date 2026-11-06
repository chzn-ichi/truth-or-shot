import { useEffect, useRef, useState } from 'react'
import './ConfirmModal.css'
import './HostPanel.css'

export default function HostPanel({ open, players, userId, onKick, onEndGame, onClose }) {
  const ref = useRef(null)
  const [confirm, setConfirm] = useState(null) // null | { kind: 'kick', player } | { kind: 'end' }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function close() {
    setConfirm(null)
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      if (confirm.kind === 'kick') {
        await onKick(confirm.player.user_id)
        setConfirm(null)
      } else {
        await onEndGame()
        close()
      }
    } catch {
      setError('That didn’t work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const others = players.filter((p) => p.user_id !== userId)

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby="host-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
    >
      <div className="confirm__body">
        {confirm ? (
          <>
            <h2 id="host-title" className="confirm__title">
              {confirm.kind === 'kick'
                ? `Remove ${confirm.player.name}?`
                : 'End the game for everyone?'}
            </h2>
            <p className="confirm__message">
              {confirm.kind === 'kick'
                ? 'They’ll be taken out of the room and can’t rejoin once the game has started.'
                : 'Everyone goes back to the home screen. This can’t be undone.'}
            </p>
            {error && (
              <p className="host__error" role="alert">
                {error}
              </p>
            )}
            <div className="confirm__actions">
              <button
                type="button"
                className="confirm__btn confirm__btn--stay"
                onClick={() => setConfirm(null)}
                disabled={busy}
              >
                {confirm.kind === 'kick' ? 'Keep them' : 'Keep playing'}
              </button>
              <button
                type="button"
                className="confirm__btn confirm__btn--danger"
                onClick={handleConfirm}
                disabled={busy}
              >
                {busy ? 'Working…' : confirm.kind === 'kick' ? 'Remove' : 'End game'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="host-title" className="confirm__title">
              Host controls
            </h2>
            <p className="confirm__message">Remove someone who left or got stuck.</p>
            {others.length === 0 ? (
              <p className="host__empty">No other players yet.</p>
            ) : (
              <ul className="host__list">
                {others.map((p) => (
                  <li key={p.id}>
                    <span>{p.name}</span>
                    <button
                      type="button"
                      className="host__remove"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => setConfirm({ kind: 'kick', player: p })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="confirm__actions">
              <button type="button" className="confirm__btn confirm__btn--stay" onClick={close}>
                Done
              </button>
              <button
                type="button"
                className="confirm__btn confirm__btn--danger"
                onClick={() => setConfirm({ kind: 'end' })}
              >
                End game for everyone
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}