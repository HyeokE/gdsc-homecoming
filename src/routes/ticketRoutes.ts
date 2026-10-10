export const TICKET_ROUTES = {
  home: '/',
  email: '/email',
  nickname: '/nickname',
  departure: '/departure',
  issuer: '/issuer',
  ticket: '/ticket',
} as const
export function guardedTicketRoute(
  path: string,
  email: string | null,
  hasTicket: boolean,
) {
  if (path === '/' || path === '/email') return path
  if (!email) return TICKET_ROUTES.email
  if (path === '/nickname') return hasTicket ? TICKET_ROUTES.ticket : path
  if (!hasTicket) return TICKET_ROUTES.nickname
  return path
}
