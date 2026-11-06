import { useEffect, useState } from 'react'
import './SelectionScreen.css'

// One slot-machine window: flickers through names, then lands on `final`
function Reel({ names, final, stopAfter, skip }) {
  const [shown, setShown] = useState(skip ? final : names[0])
  const [done, setDone] = useState(skip)

  useEffect(() => {
    if (skip) return
    const spin = setInterval(() => {
      setShown(names[Math.floor(Math.random() * names.length)])
    }, 90)
    const stop = setTimeout(() => {
      clearInterval(spin)
      setShown(final)
      setDone(true)
    }, stopAfter)
    return () => {
      clearInterval(spin)
      clearTimeout(stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`pick__reel ${done ? 'pick__reel--done' : ''}`} aria-hidden={!done}>
      {shown}
    </div>
  )
}

export default function SelectionScreen({room, players, userId, decisions, myAnswer, decide, isHost, onNextRound,}) {
  const [skip] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const [spun, setSpun] = useState(skip)
  const [deciding, setDeciding] = useState(false)
  const [error, setError] = useState(null)

  const [advancing, setAdvancing] = useState(false)
  const [nextError, setNextError] = useState(null)

  const pickedIds = room.picked_ids ?? []
  const picked = pickedIds
    .map((id) => players.find((p) => p.user_id === id))
    .filter(Boolean)

  const everyone = players.length > 1 && picked.length === players.length
  const finals = everyone ? ['Everyone'] : picked.map((p) => p.name)
  const names = players.map((p) => p.name)
  const lastStop = 1800 + Math.max(finals.length - 1, 0) * 800

  useEffect(() => {
    if (skip) return
    const t = setTimeout(() => setSpun(true), lastStop + 600)
    return () => clearTimeout(t)
  }, [skip, lastStop])

  if (picked.length === 0) {
    return (
      <main className="pick">
        <p className="pick__round">Round {room.round_number}</p>
        <p className="pick__question">{room.current_question}</p>
        <p className="pick__hint">
          {room.status === 'results'
            ? 'Everyone who was on the spot left the game.'
            : 'Picking who’s on the spot…'}
        </p>
        {room.status === 'results' && isHost && (
          <button
            type="button"
            className="pick__btn pick__btn--reveal"
            disabled={advancing}
            onClick={handleNext}
          >
            {advancing ? 'Starting…' : 'Next round'}
          </button>
        )}
      </main>
    )
  }

  const myDecision = decisions.find((d) => d.user_id === userId)
  const iAmPicked = pickedIds.includes(userId)

  async function choose(choice) {
    setError(null)
    setDeciding(true)
    try {
      await decide(choice)
    } catch {
      setError('Couldn’t save your choice. Try again.')
      setDeciding(false)
    }
  }

  async function handleNext() {
    setNextError(null)
    setAdvancing(true)
    try {
      await onNextRound()
    } catch {
      setNextError('Couldn’t start the next round. Try again.')
      setAdvancing(false)
    }
  }

  const title = !spun
    ? 'Who’s on the spot?'
    : everyone
      ? 'Everyone’s on the spot!'
      : 'On the spot'

  return (
    <main className="pick">
      <p className="pick__round">Round {room.round_number}</p>
      <p className="pick__question">{room.current_question}</p>

      <h1 className="pick__title">{title}</h1>

      <div className="pick__reels">
        {finals.map((final, i) => (
          <Reel
            key={`${final}-${i}`}
            names={names}
            final={final}
            stopAfter={1800 + i * 800}
            skip={skip}
          />
        ))}
      </div>

      {spun && (
        <>
          {iAmPicked && !myDecision && (
            <section className="pick__block">
              <h2 className="pick__subhead">Your answer</h2>
              <p className="pick__answer">{myAnswer ?? 'Loading your answer…'}</p>
              <p className="pick__hint">
                Reveal shows it to everyone. A shot keeps it secret forever.
              </p>
              <button
                type="button"
                className="pick__btn pick__btn--reveal"
                disabled={deciding || !myAnswer}
                onClick={() => choose('reveal')}
              >
                Reveal answer
              </button>
              <button
                type="button"
                className="pick__btn pick__btn--shot"
                disabled={deciding || !myAnswer}
                onClick={() => choose('shot')}
              >
                Take a shot 🥃
              </button>
              {error && (
                <p className="pick__error" role="alert">
                  {error}
                </p>
              )}
            </section>
          )}

          <ul className="pick__results">
            {picked.map((p) => {
              const d = decisions.find((x) => x.user_id === p.user_id)
              if (!d) {
                return (
                  <li key={p.id} className="pick__row pick__row--wait">
                    {p.name} is deciding…
                  </li>
                )
              }
              if (d.choice === 'shot') {
                return (
                  <li key={p.id} className="pick__row">
                    🥃 {p.name} took a shot
                  </li>
                )
              }
              return (
                <li key={p.id} className="pick__reveal">
                  <span className="pick__who">{p.name} revealed:</span>
                  <p className="pick__said">{d.answer_text}</p>
                </li>
              )
            })}
          </ul>

          {room.status === 'results' && (
            isHost ? (
              <>
                <button
                  type="button"
                  className="pick__btn pick__btn--reveal"
                  disabled={advancing}
                  onClick={handleNext}
                >
                  {advancing ? 'Starting…' : 'Next round'}
                </button>
                {nextError && (
                  <p className="pick__error" role="alert">
                    {nextError}
                  </p>
                )}
              </>
            ) : (
              <p className="pick__hint">Waiting for the host to start the next round…</p>
            )
          )}
        </>
      )}
    </main>
  )
}