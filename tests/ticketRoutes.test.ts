import { expect, test } from 'bun:test'
import {
  guardedTicketRoute,
  restoredTicketRoute,
  ticketIdFromResultPath,
  ticketMatchesResultRoute,
  ticketResultPath,
} from '../src/routes/ticketRoutes'

const ticketId = '31b8b681-07da-49ea-b75f-4de3db0c1968'
const otherTicketId = '96fbdb39-4d91-42c7-a91c-c657b6901c1b'
const resultPath = `/user/result/${ticketId}`

test('protected links require verified participant and saved result', () => {
  expect(guardedTicketRoute('/ticket', null, null)).toBe('/email')
  expect(guardedTicketRoute(resultPath, null, ticketId)).toBe('/email')
  expect(guardedTicketRoute('/ticket', 'demo@gdg.example', null)).toBe(
    '/nickname',
  )
  expect(guardedTicketRoute('/nickname', 'demo@gdg.example', ticketId)).toBe(
    resultPath,
  )
  expect(guardedTicketRoute('/issuer', 'demo@gdg.example', ticketId)).toBe(
    '/issuer',
  )
  expect(guardedTicketRoute('/ticket', 'demo@gdg.example', ticketId)).toBe(
    resultPath,
  )
  expect(guardedTicketRoute(resultPath, 'demo@gdg.example', ticketId)).toBe(
    resultPath,
  )
})

test('result paths use existing ticket ids and parse safely', () => {
  expect(ticketResultPath(ticketId)).toBe(resultPath)
  expect(ticketIdFromResultPath(resultPath)).toBe(ticketId)
  expect(ticketIdFromResultPath(`${resultPath}/`)).toBe(ticketId)
  expect(ticketIdFromResultPath('/ticket')).toBeNull()
  expect(ticketIdFromResultPath('/user/result/')).toBeNull()
  expect(ticketIdFromResultPath('/user/result/%')).toBeNull()
  expect(ticketIdFromResultPath(`${resultPath}/extra`)).toBeNull()
})

test('restoring or verifying a session preserves an explicitly requested result', () => {
  expect(restoredTicketRoute(resultPath, ticketId)).toBe(resultPath)
  expect(restoredTicketRoute(resultPath, otherTicketId)).toBe(resultPath)
  expect(restoredTicketRoute(resultPath, null)).toBe(resultPath)
  expect(restoredTicketRoute('/ticket', ticketId)).toBe(resultPath)
  expect(restoredTicketRoute('/email', ticketId)).toBe(resultPath)
  expect(restoredTicketRoute('/email', null)).toBe('/nickname')
})

test('a mismatched or missing result stays on its URL and never renders another ticket', () => {
  expect(
    guardedTicketRoute(resultPath, 'demo@gdg.example', otherTicketId),
  ).toBe(resultPath)
  expect(guardedTicketRoute(resultPath, 'demo@gdg.example', null)).toBe(
    resultPath,
  )
  expect(ticketMatchesResultRoute(resultPath, ticketId)).toBe(true)
  expect(ticketMatchesResultRoute(resultPath, otherTicketId)).toBe(false)
  expect(ticketMatchesResultRoute(resultPath, null)).toBe(false)
  expect(ticketMatchesResultRoute('/ticket', ticketId)).toBe(false)
})
