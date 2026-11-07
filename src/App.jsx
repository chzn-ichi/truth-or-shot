import { useCallback, useEffect, useRef, useState } from 'react'
import HomeScreen from './components/HomeScreen'
import LobbyScreen from './components/LobbyScreen'
import WaitingScreen from './components/WaitingScreen'
import { createRoom, joinRoom, leaveRoom, restoreRoom, saveRoomCode, clearSavedRoom } from './lib/game'

export default function App() {
  const [room, setRoom] = useState(null)
  const [waiting, setWaiting] = useState(null) // { room, name, avatar } while the host decides
  const [restoring, setRestoring] = useState(true)
  const [notice, setNotice] = useState(null)
  const leaving = useRef(false)

  useEffect(() => {
    restoreRoom()
      .then((saved) => {
        if (saved) setRoom(saved)
      })
      .finally(() => setRestoring(false))
  }, [])

  function enter(r) {
    saveRoomCode(r.code)
    setNotice(null)
    setWaiting(null)
    setRoom(r)
  }

  async function leave() {
    leaving.current = true
    try {
      await leaveRoom(room.id)
    } catch {
      // Offline or already removed: still let this player out
    }
    clearSavedRoom()
    setRoom(null)
    leaving.current = false
  }

  // Called when the host removes us. Ignored if we're leaving on our own.
  const handleRemoved = useCallback(() => {
    if (leaving.current) return
    clearSavedRoom()
    setNotice('The host removed you from the room.')
    setRoom(null)
  }, [])

  if (restoring) return null

  if (room) return <LobbyScreen room={room} onLeave={leave} onRemoved={handleRemoved} />

  if (waiting) {
    return (
      <WaitingScreen
        room={waiting.room}
        name={waiting.name}
        avatar={waiting.avatar}
        onApproved={enter}
        onDenied={() => {
          setWaiting(null)
          setNotice('The host didn’t let you in.')
        }}
        onCancel={() => setWaiting(null)}
      />
    )
  }

  return (
    <HomeScreen
      notice={notice}
      onCreateRoom={async (name, avatar) => enter(await createRoom(name, avatar))}
      onJoinRoom={async (code, name, avatar) => {
        const result = await joinRoom(code, name, avatar)
        if (result.pending) {
          setNotice(null)
          setWaiting({ room: result.room, name, avatar })
        } else {
          enter(result.room)
        }
      }}
    />
  )
}