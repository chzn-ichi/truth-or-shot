import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'
import { AVATARS, loadProfile, saveProfile } from '../lib/avatars'
import './ConfirmModal.css'
import './HomeScreen.css'

const NAME_MESSAGE = 'Enter your name so your friends know who’s who.'

// onCreateRoom(name, avatar) and onJoinRoom(code, name, avatar) do the Supabase work
export default function HomeScreen({ onCreateRoom, onJoinRoom, notice }) {
  const [initial] = useState(loadProfile)
  const [name, setName] = useState(initial.name)
  const [avatar, setAvatar] = useState(initial.avatar)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(null) // 'create' | 'join' | null
  const [error, setError] = useState(null) // { field: 'name' | 'code' | 'form', message }
  const [pickerOpen, setPickerOpen] = useState(!initial.name) // first visit: ask who you are
  const [joinOpen, setJoinOpen] = useState(false)

  const dialogRef = useRef(null)
  const codeRef = useRef(null)

  const cleanName = name.trim()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (pickerOpen && !dialog.open) dialog.showModal()
    if (!pickerOpen && dialog.open) dialog.close()
  }, [pickerOpen])

  useEffect(() => {
    if (joinOpen) codeRef.current?.focus()
  }, [joinOpen])

  // Escape, clicking outside, or Done all end up here
  function closePicker() {
    saveProfile({ name: cleanName, avatar })
    setError((e) => (e?.field === 'name' ? null : e))
    setPickerOpen(false)
  }

  function donePicker() {
    if (!cleanName) {
      setError({ field: 'name', message: NAME_MESSAGE })
      return
    }
    closePicker()
  }

  // Returns true (and opens the popup) when there's no name yet
  function needName() {
    if (cleanName) return false
    setError({ field: 'name', message: NAME_MESSAGE })
    setPickerOpen(true)
    return true
  }

  async function handleCreate() {
    setError(null)
    if (needName()) return
    saveProfile({ name: cleanName, avatar })
    setBusy('create')
    try {
      await onCreateRoom?.(cleanName, avatar)
    } catch (err) {
      setError({ field: 'form', message: 'Couldn’t create the room. Check your connection and try again.' })
    } finally {
      setBusy(null)
    }
  }

  async function handleJoin() {
    setError(null)
    if (needName()) return
    if (code.length !== 6) {
      setError({ field: 'code', message: 'Room codes are 6 letters or numbers. Ask the host for theirs.' })
      return
    }
    saveProfile({ name: cleanName, avatar })
    setBusy('join')
    try {
      await onJoinRoom?.(code, cleanName, avatar)
    } catch (err) {
      const message =
        err.message === 'ROOM_ENDED'
          ? 'That game has ended. Ask the host to start a new room.'
          : err.message === 'ROOM_NOT_FOUND'
            ? 'No room found with that code. Check it and try again.'
            : 'Couldn’t join. Check your connection and try again.'
      setError({ field: 'code', message })
    } finally {
      setBusy(null)
    }
  }

  const nameError = error?.field === 'name' ? error.message : null
  const codeError = error?.field === 'code' ? error.message : null
  const formError = error?.field === 'form' ? error.message : null

  return (
    <main className="home">
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <header className="home__brand">
        <svg className="glass" viewBox="0 0 64 80" aria-hidden="true">
          <defs>
            <clipPath id="glass-clip">
              <path d="M8 8H56L50 72Q49.5 76 45 76H19Q14.5 76 14 72Z" />
            </clipPath>
          </defs>
          <g clipPath="url(#glass-clip)">
            <rect className="glass__liquid" x="0" y="30" width="64" height="50" />
          </g>
          <path
            className="glass__outline"
            d="M8 8H56L50 72Q49.5 76 45 76H19Q14.5 76 14 72Z"
          />
        </svg>

        <h1 className="wordmark">
          <span className="wordmark__truth">Last</span>
          <span className="wordmark__line">
            <span className="wordmark__or">Call</span>
            <span className="wordmark__shot">Confessions</span>
          </span>
        </h1>

        <p className="pitch">
          Everyone answers in secret. If you’re picked, reveal your answer or take a shot.
        </p>
      </header>

      <section className="controls">
        <button
          type="button"
          className="chip"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
        >
          <Avatar id={avatar} size={44} />
          <span className="chip__text">
            <span className="chip__name">{cleanName || 'Who are you?'}</span>
            <span className="chip__hint">{cleanName ? 'Tap to change' : 'Set up your player'}</span>
          </span>
        </button>

        <button
          type="button"
          className="btn btn--create"
          onClick={handleCreate}
          disabled={busy !== null}
        >
          {busy === 'create' ? 'Creating room…' : 'Create a room'}
        </button>
        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}

        {joinOpen ? (
          <div className="join">
            <div className="field">
              <label htmlFor="room-code">Room code</label>
              <input
                ref={codeRef}
                id="room-code"
                className="code-input"
                type="text"
                value={code}
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="A1B2C3"
                aria-invalid={!!codeError}
                aria-describedby={codeError ? 'code-error' : undefined}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              {codeError && (
                <p id="code-error" className="error" role="alert">
                  {codeError}
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn--join"
              onClick={handleJoin}
              disabled={busy !== null}
            >
              {busy === 'join' ? 'Joining…' : 'Join room'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--join"
            onClick={() => setJoinOpen(true)}
            disabled={busy !== null}
          >
            Join with a code
          </button>
        )}
      </section>

      <footer className="home__foot">
        Taking a shot is always optional. Drink responsibly.
      </footer>

      <dialog
        ref={dialogRef}
        className="confirm profile-dialog"
        aria-labelledby="profile-title"
        onCancel={(e) => {
          e.preventDefault()
          closePicker()
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) closePicker()
        }}
      >
        <div className="confirm__body">
          <h2 id="profile-title" className="confirm__title">
            Who are you?
          </h2>

          <fieldset className="avatar-pick">
            <legend className="sr-only">Pick your character</legend>
            <div className="avatar-pick__grid">
              {AVATARS.map((a) => (
                <label key={a.id} className="avatar-pick__item">
                  <input
                    type="radio"
                    name="avatar"
                    value={a.id}
                    checked={avatar === a.id}
                    onChange={() => setAvatar(a.id)}
                  />
                  <Avatar id={a.id} />
                  <span className="sr-only">{a.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="player-name">Your name</label>
            <input
              id="player-name"
              type="text"
              value={name}
              maxLength={16}
              autoComplete="off"
              placeholder="e.g. Harry"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && donePicker()}
            />
            {nameError && (
              <p id="name-error" className="error" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div className="confirm__actions">
            <button type="button" className="confirm__btn confirm__btn--stay" onClick={donePicker}>
              Done
            </button>
          </div>
        </div>
      </dialog>
    </main>
  )
}