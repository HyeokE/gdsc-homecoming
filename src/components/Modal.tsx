import { useEffect, useId, useRef, type ReactNode } from 'react'
import { secondaryButtonClass } from './screens/InputScreen'
import '../styles/modal.css'
export interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}
export function Modal({
  open,
  title,
  children,
  onClose,
  busy = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    if (!dialog.open) dialog.showModal()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [open])
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-busy={busy}
      className="app-modal rounded-panel border border-border bg-surface-raised text-foreground shadow-panel"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div className="app-modal__content">
        <header className="mb-6 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-body font-semibold">
            {title}
          </h2>
          <button
            autoFocus
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`${secondaryButtonClass} shrink-0`}
          >
            닫기
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
