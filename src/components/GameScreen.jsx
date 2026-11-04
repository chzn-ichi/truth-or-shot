import { useState } from 'react'
import { useGame } from '../hooks/useGame'
import './GameScreen.css'
import SelectionScreen from './SelectionScreen'

export default function GameScreen({ room, players, userId }) {
  const { submitted, submitAnswer, decisions, myAnswer: pickedAnswer, decide } = useGame(room, userId)
  const [draft, setDraft] = useState('')
  const [myAnswer, setMyAnswer] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const hasAnswered = myAnswer !== null || submitted.includes(userId)

  async function handleSubmit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) {
      setError('Type an answer before you lock it in.')
      return
    }
    setError(null)
    setSending(true)
    try {
      await submitAnswer(text)
      setMyAnswer(text)
    } catch {
      setError('Couldn’t lock in your answer. Try again.')
    } finally {
      setSending(false)
    }
  }

  // Temporary: the "who's on the spot" animation goes here next
  if (room.status === 'selecting' || room.status === 'results') {
    return (
        <SelectionScreen
        room={room}
        players={players}
        userId={userId}
        decisions={decisions}
        myAnswer={pickedAnswer}
        decide={decide}
        />
    )
    }

  return (
    <main className="game">
      <p className="game__round">Round {room.round_number}</p>
      <h1 className="game__question">{room.current_question}</h1>

      {hasAnswered ? (
        <section className="game__block">
          <p className="game__locked">
            Your answer is locked in. Nobody else can see it unless you’re picked and choose to reveal it.
          </p>
        </section>
      ) : (
        <form className="game__block" onSubmit={handleSubmit}>
          <label htmlFor="answer" className="game__label">
            Your answer (only you can see it for now)
          </label>
          <textarea
            id="answer"
            className="game__input"
            value={draft}
            maxLength={280}
            rows={4}
            placeholder="Be honest…"
            aria-invalid={!!error}
            onChange={(e) => setDraft(e.target.value)}
          />
          <span className="game__count">{draft.length}/280</span>
          {error && (
            <p className="game__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="game__btn" disabled={sending}>
            {sending ? 'Locking in…' : 'Lock in answer'}
          </button>
        </form>
      )}

      <section className="game__block">
        <h2 className="game__subhead">
          {submitted.length} of {players.length} answered
        </h2>
        <ul className="game__players">
          {players.map((p) => {
            const done = submitted.includes(p.user_id)
            return (
              <li key={p.id}>
                <span>{p.name}</span>
                <span className={done ? 'game__done' : 'game__waiting'}>
                  {done ? 'Answered' : 'Typing…'}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}