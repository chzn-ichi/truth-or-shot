import { useEffect, useRef, useState } from 'react'
import { buzz, playSound } from '../lib/sound'
import './SelectionScreen.css'
import Avatar from './Avatar'


function Reel({ names, final, stopAfter, skip, calm, first }) {
  const [shown, setShown] = useState(skip ? final : calm ? '…' : names[0])
  const [done, setDone] = useState(skip)

  useEffect(() => {
    if (skip) {
      if (first) playSound('land')
      return
    }
    // "calm" (reduce motion): no flickering names, but the same waiting time
    const spin = calm
      ? null
      : setInterval(() => {
          setShown(names[Math.floor(Math.random() * names.length)])
          if (first) playSound('tick') // only one reel ticks, so it isn't a buzz
        }, 90)
    const stop = setTimeout(() => {
      if (spin) clearInterval(spin)
      setShown(final)
      setDone(true)
      playSound('land')
    }, stopAfter)
    return () => {
      if (spin) clearInterval(spin)
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
  const [skip] = useState(() => !!room.skip_animation)
  const [calm] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
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

  // Sound and buzz for the picked player once the spin finishes
  useEffect(() => {
    if (!spun) return
    if (pickedIds.includes(userId) && !decisions.some((d) => d.user_id === userId)) {
      playSound('picked')
      buzz()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spun])

  // A chime or a clink whenever a new decision arrives
  const seenDecisions = useRef(new Set(decisions.map((d) => d.user_id)))
  useEffect(() => {
    for (const d of decisions) {
      if (!seenDecisions.current.has(d.user_id)) {
        seenDecisions.current.add(d.user_id)
        playSound(d.choice === 'shot' ? 'shot' : 'reveal')
      }
    }
  }, [decisions])

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
            calm={calm}
            first={i === 0}
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
                Take a shot <img className="shot-icon" src="/icons/shot.png" alt="" />
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
                    <Avatar id={p.avatar} size={32} />
                    {p.name} is deciding…
                  </li>
                )
              }
              if (d.choice === 'shot') {
                return (
                  <li key={p.id} className="pick__row">
                    <Avatar id={p.avatar} size={32} />
                    <img className="shot-icon" src="/icons/shot.png" alt="" />
                    <span>{p.name} took a shot</span>
                  </li>
                )
              }
              return (
                <li key={p.id} className="pick__reveal">
                  <span className="pick__who">
                    <Avatar id={p.avatar} size={28} />
                    {p.name} revealed:
                  </span>
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