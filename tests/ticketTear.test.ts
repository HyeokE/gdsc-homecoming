import { expect, test } from 'bun:test'
import {
  ticketTearEdge,
  ticketTearProgress,
  ticketPaperOffset,
  ticketPaperStrip,
} from '../src/hooks/ticketTear'

test('a tap and inward pull never tear; a down-right pull works near the screen edge', () => {
  expect(ticketTearProgress(0, 0, 220)).toBe(0)
  expect(ticketTearProgress(-40, -30, 220)).toBe(0)
  expect(ticketTearProgress(12, 70, 220)).toBe(1)
  expect(ticketTearProgress(10, 10, 220)).toBeLessThan(1)
})

test('completion distance remains reachable for both small and large rendered stubs', () => {
  expect(ticketTearProgress(47, 0, 50)).toBeLessThan(1)
  expect(ticketTearProgress(48, 0, 50)).toBe(1)
  expect(ticketTearProgress(88, 0, 800)).toBe(1)
  expect(ticketTearProgress(1000, 1000, 220)).toBe(1)
})

test('paper teeth appear only along the torn portion of the edge', () => {
  expect(ticketTearEdge(0)).not.toContain('2px')
  expect(ticketTearEdge(0.2)).toContain('0 20%')
  expect(ticketTearEdge(0.2)).toContain('2px 18%')
  expect(ticketTearEdge(0.2)).not.toContain('2px 22%')
  expect(ticketTearEdge(1)).toContain('2px 98%')
})

test('a strong inward pull cannot be completed by downward movement alone', () => {
  expect(ticketTearProgress(-150, 90, 220)).toBe(0)
})

test('uncut paper stays fixed and mesh bands meet at exactly the same boundary', () => {
  expect(ticketPaperOffset(0.7, 0.5, 50, 20)).toEqual({ x: 0, y: 0 })
  expect(ticketPaperOffset(0.5, 0.5, 50, 20)).toEqual({ x: 0, y: 0 })
  expect(ticketPaperOffset(0, 0.5, 50, 20).x).toBeGreaterThan(0)
  const height = 280,
    count = 28
  for (let index = 0; index < count - 1; index++) {
    const current = ticketPaperStrip(index, count, height, 0.65, 70, 35)
    const next = ticketPaperStrip(index + 1, count, height, 0.65, 70, 35)
    const y = ((index + 1) / count) * height
    expect(current[2] * y + current[4]).toBeCloseTo(next[2] * y + next[4], 8)
    expect(current[3] * y + current[5]).toBeCloseTo(next[3] * y + next[5], 8)
  }
})
