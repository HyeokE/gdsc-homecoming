export const TICKET_ROUTES = {
  home: '/',
  email: '/email',
  nickname: '/nickname',
  departure: '/departure',
  issuer: '/issuer',
  ticket: '/ticket',
  result: '/user/result/:ticketId',
} as const;

export function ticketResultPath(ticketId: string) {
  return `/user/result/${encodeURIComponent(ticketId)}`;
}

export function ticketIdFromResultPath(path: string): string | null {
  const match = /^\/user\/result\/([^/]+)\/?$/.exec(path);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function restoredTicketRoute(requestedPath: string, ticketId: string | null, preserveRequestedResult = true) {
  if (preserveRequestedResult && ticketIdFromResultPath(requestedPath) !== null) {
    return requestedPath;
  }
  return ticketId ? ticketResultPath(ticketId) : TICKET_ROUTES.nickname;
}

export function ticketMatchesResultRoute(path: string, ticketId: string | null) {
  return ticketId !== null && ticketIdFromResultPath(path) === ticketId;
}

export function guardedTicketRoute(path: string, email: string | null, ticketId: string | null) {
  if (path === '/' || path === '/email') {
    return path;
  }
  if (!email) {
    return TICKET_ROUTES.email;
  }
  // A requested result must be checked against the restored ticket by the view,
  // including missing results. Redirecting here could hide a mismatched URL.
  if (ticketIdFromResultPath(path) !== null) {
    return path;
  }
  if (path === '/nickname' || path === '/ticket') {
    return ticketId ? ticketResultPath(ticketId) : TICKET_ROUTES.nickname;
  }
  if (!ticketId) {
    return TICKET_ROUTES.nickname;
  }
  return path;
}
