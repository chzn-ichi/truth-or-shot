import { useEffect, useRef, useState } from 'react'
import { updateSettings, useSettings } from '../lib/settings'
import './ConfirmModal.css'
import './SettingsPanel.css'
import { playSound } from '../lib/sound'

function Slider({ id, label, value, onChange, onCommit }) {
  const pct = Math.round(value * 100)
  return (
    <div className="set__slider">
      <label htmlFor={id}>{label}</label>
      <span aria-hidden="true">{pct}%</span>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        step="5"
        value={pct}
        aria-valuetext={`${pct}%`}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
    </div>
  )
}

function Toggle({ id, label, hint, checked, onChange }) {
  return (
    <label className="set__toggle" htmlFor={id}>
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

function confirmCopy(confirm, inGame) {
  if (confirm.kind === 'kick') {
    return {
        title: `Kick ${confirm.player.name}?`,
        message: 'They’ll be taken out of the room and can’t rejoin once the game has started.',
        keep: 'Keep them',
        go: 'Kick',
    }
  }
  if (confirm.kind === 'end') {
    return {
      title: 'End the game for everyone?',
      message: 'Everyone goes back to the home screen. This can’t be undone.',
      keep: 'Keep playing',
      go: 'End game',
    }
  }
  return {
    title: 'Leave this room?',
    message: inGame
      ? 'You won’t be able to rejoin once the game has started.'
      : 'You can rejoin later with the room code.',
    keep: 'Stay',
    go: 'Leave',
  }
}

export default function SettingsPanel({
  open,
  code,
  isHost,
  inGame,
  players,
  userId,
  skipAnimation,
  onSkipChange,
  onKick,
  onEndGame,
  onLeave,
  onClose,
}) {
  const ref = useRef(null)
  const settings = useSettings()
  const [confirm, setConfirm] = useState(null) // null | { kind: 'kick', player } | { kind: 'end' } | { kind: 'leave' }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function back() {
    setConfirm(null)
    setError(null)
  }

  async function copyCode() {
    try {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    } catch {
        /* clipboard blocked, the code is still on screen */
    }
  }  

  function close() {
    back()
    onClose()
  }

  // Escape or clicking outside: step back from a confirmation first, otherwise close
  function dismiss() {
    if (confirm) back()
    else close()
  }

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      if (confirm.kind === 'kick') {
        await onKick(confirm.player.user_id)
        setConfirm(null)
      } else if (confirm.kind === 'end') {
        await onEndGame()
        close()
      } else {
        close()
        await onLeave()
      }
    } catch {
      setError('That didn’t work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const others = players.filter((p) => p.user_id !== userId)
  const copy = confirm ? confirmCopy(confirm, inGame) : null

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby="settings-title"
      onCancel={(e) => {
        e.preventDefault()
        dismiss()
      }}
      onClick={(e) => {
        if (e.target === ref.current) dismiss()
      }}
    >
      <div className="confirm__body">
        {copy ? (
          <>
            <h2 id="settings-title" className="confirm__title">
              {copy.title}
            </h2>
            <p className="confirm__message">{copy.message}</p>
            {error && (
              <p className="host__error" role="alert">
                {error}
              </p>
            )}
            <div className="confirm__actions">
              <button
                type="button"
                className="confirm__btn confirm__btn--stay"
                onClick={back}
                disabled={busy}
              >
                {copy.keep}
              </button>
              <button
                type="button"
                className="confirm__btn confirm__btn--danger"
                onClick={handleConfirm}
                disabled={busy}
              >
                {busy ? 'Working…' : copy.go}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="settings-title" className="confirm__title">
              Settings
            </h2>

            <section className="set__code">
              <div>
                <span className="set__head">Room code</span>
                <strong className="set__codeval">{code}</strong>
              </div>
              <button type="button" className="set__copy" onClick={copyCode} aria-live="polite">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </section>

            <section className="set__group">
              <h3 className="set__head">Sound</h3>
              <Slider
                id="set-music"
                label="Music"
                value={settings.music}
                onChange={(v) => updateSettings({ music: v })}
              />
              <Slider
                id="set-sfx"
                label="Sound effects"
                value={settings.sfx}
                onChange={(v) => updateSettings({ sfx: v })}
                onCommit={() => playSound('land')}
              />
            </section>

            <section className="set__group">
              <h3 className="set__head">Gameplay</h3>
              <Toggle
                id="set-awake"
                label="Keep screen on"
                hint="Stops your phone from sleeping mid-game."
                checked={settings.keepAwake}
                onChange={(v) => updateSettings({ keepAwake: v })}
              />
              <Toggle
                id="set-vibrate"
                label="Vibration"
                hint="Buzz your phone when you’re picked. Not available on iPhones."
                checked={settings.vibrate}
                onChange={(v) => updateSettings({ vibrate: v })}
              />
            </section>

            {isHost && (
            <section className="set__group">
                <h3 className="set__head">Host</h3>
                <Toggle
                id="set-skip"
                label="Skip slot-machine animation"
                hint="Applies to everyone from the next round, so nobody sees the result early."
                checked={skipAnimation}
                onChange={(v) => onSkipChange(v).catch(() => {})}
                />
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
                        Kick
                        </button>
                    </li>
                    ))}
                </ul>
                )}
                <button
                type="button"
                className="confirm__btn confirm__btn--danger"
                onClick={() => setConfirm({ kind: 'end' })}
                >
                End game for everyone
                </button>
            </section>
            )}

            <div className="confirm__actions set__footer">
              <button type="button" className="confirm__btn confirm__btn--stay" onClick={close}>
                Done
              </button>
              <button
                type="button"
                className="confirm__btn confirm__btn--danger"
                onClick={() => setConfirm({ kind: 'leave' })}
              >
                Leave room
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}