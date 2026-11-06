import { useState } from 'react'
import './HomeScreen.css'

// onCreateRoom(name) and onJoinRoom(code, name) are where the Supabase calls go.
// Each can be async; the buttons show a loading state until it finishes.
export default function HomeScreen({ onCreateRoom, onJoinRoom, notice }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(null) // 'create' | 'join' | null
  const [error, setError] = useState(null) // { field: 'name' | 'code' | 'form', message }


  const cleanName = name.trim()

  function checkName() {
    if (!cleanName) {
      setError({ field: 'name', message: 'Enter your name so your friends know who’s who.' })
      return false
    }
    return true
  }

  async function handleCreate() {
    setError(null)
    if (!checkName()) return
    setBusy('create')
    try {
      await onCreateRoom?.(cleanName)
    } catch (err) {
      setError({ field: 'form', message: 'Couldn’t create the room. Check your connection and try again.' })
    } finally {
      setBusy(null)
    }
  }

  async function handleJoin() {
    setError(null)
    if (!checkName()) return
    if (code.length !== 6) {
      setError({ field: 'code', message: 'Room codes are 6 letters or numbers. Ask the host for theirs.' })
      return
    }
    setBusy('join')
    try {
      await onJoinRoom?.(code, cleanName)
    } catch (err) {
      const message =
        err.message === 'ROOM_STARTED'
          ? 'That game has already started. Ask the host to start a new room.'
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
          <span className="wordmark__truth">Truth</span>
          <span className="wordmark__line">
            <span className="wordmark__or">or</span>
            <span className="wordmark__shot">Shot</span>
          </span>
        </h1>

        <p className="pitch">
          Everyone answers in secret. If you’re picked, reveal your answer or take a shot.
        </p>
      </header>

      <section className="controls">
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
          />
          {nameError && (
            <p id="name-error" className="error" role="alert">
              {nameError}
            </p>
          )}
        </div>

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

        <div className="divider">
          <span>Joining friends?</span>
        </div>

        <div className="field">
          <label htmlFor="room-code">Room code</label>
          <input
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
      </section>

      <footer className="home__foot">
        Taking a shot is always optional. Drink responsibly.
      </footer>
    </main>
  )
}
