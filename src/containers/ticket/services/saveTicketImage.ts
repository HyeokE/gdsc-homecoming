/** @scopeDefault src/containers/ticket */
// Image export is shared by result, preview and full-ticket download consumers.
import { toBlob } from 'html-to-image';
export async function saveTicketImage(node: HTMLElement, ticketId: string) {
  await document.fonts.ready;
  const blob = await toBlob(node, {
    pixelRatio: 3,
    style: { margin: '0' },
  });
  if (!blob || blob.type !== 'image/png' || !blob.size) {
    throw new Error('Image unavailable');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `gdg-boarding-pass-${ticketId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64)}.png`;
  link.href = url;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
