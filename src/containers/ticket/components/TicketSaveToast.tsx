import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/ticket-save-toast.css';

/** Each completed save replaces the previous notification, including other ticket formats. */
export function TicketSaveToast({ message, error = false }: { message: string; error?: boolean }) {
  const id = useId();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const replace = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) {
        setVisible(false);
      }
    };
    window.dispatchEvent(new CustomEvent('ticket-save-notification', { detail: id }));
    window.addEventListener('ticket-save-notification', replace);
    const timer = window.setTimeout(() => setVisible(false), error ? 7000 : 4000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('ticket-save-notification', replace);
    };
  }, [id, error]);

  return visible
    ? createPortal(
        <div className="ticket-save-toast" role={error ? 'alert' : 'status'}>
          <span className="ticket-save-toast__icon" aria-hidden="true">
            {error ? '!' : '✓'}
          </span>
          <span>{message}</span>
          <button type="button" aria-label="알림 닫기" onClick={() => setVisible(false)}>
            ×
          </button>
        </div>,
        document.body,
      )
    : null;
}
