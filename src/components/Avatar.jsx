import { getAvatar } from '../lib/avatars'
import './Avatar.css'

// Decorative: the player's name is always shown next to it
export default function Avatar({ id, size = 36 }) {
  const a = getAvatar(id)
  return (
    <span
      className="avatar"
      style={{ '--avatar-size': `${size}px`, background: a.color }}
      aria-hidden="true"
    >
      <img src={a.src} alt="" draggable="false" />
    </span>
  )
}