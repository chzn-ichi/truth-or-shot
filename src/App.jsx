import { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import LobbyScreen from './components/LobbyScreen'
import { createRoom, joinRoom } from './lib/game'

export default function App() {
  const [room, setRoom] = useState(null)

  if (room) return <LobbyScreen room={room} />

  return (
    <HomeScreen
      onCreateRoom={async (name) => setRoom(await createRoom(name))}
      onJoinRoom={async (code, name) => setRoom(await joinRoom(code, name))}
    />
  )
}