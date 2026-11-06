import { useEffect, useRef } from 'react'
import './ConfirmModal.css'

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onCancel={(e) => {
        // Escape key: let our own state close it
        e.preventDefault()
        onCancel()
      }}
      onClick={(e) => {
        // Clicking the dimmed area outside the box closes it
        if (e.target === ref.current) onCancel()
      }}
    >
      <div className="confirm__body">
        <h2 id="confirm-title" className="confirm__title">
          {title}
        </h2>
        <p id="confirm-message" className="confirm__message">
          {message}
        </p>
        <div className="confirm__actions">
          <button
            type="button"
            className="confirm__btn confirm__btn--stay"
            onClick={onCancel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm__btn confirm__btn--danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}