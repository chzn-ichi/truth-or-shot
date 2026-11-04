import { useState } from 'react'
import { useLobby } from '../hooks/useLobby'
import './LobbyScreen.css'
import GameScreen from './GameScreen'

export default function LobbyScreen({ room: initialRoom }) {
  const { room, players, questions, userId, addQuestion, removeQuestion, startGame } =
    useLobby(initialRoom)

  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null) // { field: 'question' | 'start', message }

  const isHost = userId === room.host_id
  const host = players.find((p) => p.user_id === room.host_id)
  const myQuestions = questions.filter((q) => q.user_id === userId)
  const canStart = players.length >= 2 // change to >= 1 to test solo

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked, the code is still on screen */
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    const text = draft.trim()
    if (text.length < 3) {
      setError({ field: 'question', message: 'Write a question with at least 3 characters.' })
      return
    }
    setError(null)
    try {
      await addQuestion(text)
      setDraft('')
    } catch {
      setError({ field: 'question', message: 'Couldn’t add that question. Try again.' })
    }
  }

  async function handleStart() {
    setError(null)
    setStarting(true)
    try {
      await startGame()
    } catch {
      setError({ field: 'start', message: 'Couldn’t start the game. Try again.' })
      setStarting(false)
    }
  }

  // Temporary: this becomes the real game screen later
  if (room.status !== 'lobby') {
    return (
      <GameScreen
        key={room.round_number}
        room={room}
        players={players}
        userId={userId}
      />
    )
  }

  return (
    <main className="lobby">
      <header className="lobby__code">
        <span className="lobby__label">Room code</span>
        <button type="button" className="code-btn" onClick={copyCode}>
          {room.code}
        </button>
        <span className="lobby__hint" aria-live="polite">
          {copied ? 'Copied!' : 'Tap the code to copy it, then send it to your friends.'}
        </span>
      </header>

      <section className="block">
        <h2>Players ({players.length})</h2>
        <ul className="players">
          {players.map((p) => (
            <li key={p.id}>
              <span>
                {p.name}
                {p.user_id === userId && <em> (you)</em>}
              </span>
              {p.user_id === room.host_id && <span className="tag">Host</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h2>Add your own questions</h2>
        <p className="lobby__hint">
          They’re mixed into the game. {questions.length} in the pool so far.
        </p>
        <form className="ask" onSubmit={handleAdd}>
          <input
            type="text"
            value={draft}
            maxLength={140}
            placeholder="What’s your most embarrassing moment?"
            aria-label="New question"
            aria-invalid={error?.field === 'question'}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn--add">
            Add
          </button>
        </form>
        {error?.field === 'question' && (
          <p className="error" role="alert">
            {error.message}
          </p>
        )}
        <ul className="mine">
          {myQuestions.map((q) => (
            <li key={q.id}>
              <span>{q.text}</span>
              <button
                type="button"
                className="remove"
                aria-label={`Remove question: ${q.text}`}
                onClick={() => removeQuestion(q.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="lobby__foot">
        {isHost ? (
          <>
            <button
              type="button"
              className="btn btn--start"
              onClick={handleStart}
              disabled={!canStart || starting}
            >
              {starting ? 'Starting…' : 'Start game'}
            </button>
            {!canStart && <p className="lobby__hint">You need at least 2 players to start.</p>}
          </>
        ) : (
          <p className="lobby__hint">
            Waiting for {host ? host.name : 'the host'} to start the game…
          </p>
        )}
        {error?.field === 'start' && (
          <p className="error" role="alert">
            {error.message}
          </p>
        )}
      </footer>
    </main>
  )
}