import { useEffect, useId, useRef, type ReactNode } from 'react';
import './modal.css';
export interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}
export function Modal({ open, title, children, onClose, busy = false }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) {
      return;
    }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) {
      dialog.showModal();
    }
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (previous?.isConnected) {
        previous.focus();
      }
    };
  }, [open]);
  return (
    // Native dialog handles Escape via onCancel; the click handler only dismisses its backdrop.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-busy={busy}
      className="app-modal"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div className="app-modal__content">
        <header className="app-modal__header">
          <h2 id={titleId} className="app-modal__title">
            {title}
          </h2>
          <button ref={closeRef} type="button" disabled={busy} onClick={onClose} className="app-modal__close">
            닫기
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
