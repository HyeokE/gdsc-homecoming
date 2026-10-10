import { expect, test } from 'bun:test'
import { guardedTicketRoute } from '../src/routes/ticketRoutes'
test('protected links require verified participant and saved result', () => {
  expect(guardedTicketRoute('/ticket', null, false)).toBe('/email')
  expect(guardedTicketRoute('/ticket', 'demo@gdg.example', false)).toBe(
    '/nickname',
  )
  expect(guardedTicketRoute('/nickname', 'demo@gdg.example', true)).toBe(
    '/ticket',
  )
  expect(guardedTicketRoute('/issuer', 'demo@gdg.example', true)).toBe(
    '/issuer',
  )
  expect(guardedTicketRoute('/ticket', 'demo@gdg.example', true)).toBe(
    '/ticket',
  )
})
