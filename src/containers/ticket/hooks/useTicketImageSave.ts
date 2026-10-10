import { useEffect, useRef, useState } from 'react';
import { saveTicketImage } from '../services/saveTicketImage';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

/** Own the capture target, duplicate-click lock and lifetime of one image save. */
export function useTicketImageSave(ticketId: string | null) {
  const captureRef = useRef<HTMLDivElement>(null);
  const request = useRef<object | null>(null);
  const [state, setState] = useState<{ ticketId: string | null; status: SaveStatus }>({
    ticketId,
    status: 'idle',
  });

  useEffect(
    () => () => {
      request.current = null;
    },
    [ticketId],
  );

  function reset() {
    request.current = null;
    setState({ ticketId, status: 'idle' });
  }

  async function save() {
    const node = captureRef.current;
    if (!node || !ticketId || request.current) {
      return;
    }
    const current = {};
    request.current = current;
    setState({ ticketId, status: 'saving' });
    try {
      await saveTicketImage(node, ticketId);
      if (request.current === current) {
        setState({ ticketId, status: 'success' });
      }
    } catch {
      if (request.current === current) {
        setState({ ticketId, status: 'error' });
      }
    } finally {
      if (request.current === current) {
        request.current = null;
      }
    }
  }

  return {
    captureRef,
    status: state.ticketId === ticketId ? state.status : 'idle',
    save,
    reset,
  };
}
