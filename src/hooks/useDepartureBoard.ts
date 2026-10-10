import { useEffect, useRef, useState } from 'react'
import { fittingMockRows, mockAnimationWindow } from './departureBoardRows'

export function useDepartureBoard(
  detailsVisible: boolean,
  animateMocks: boolean,
  actualRows: number,
  onRowCapacity?: (count: number) => void,
) {
  const matrixRef = useRef<HTMLDivElement>(null)
  const [mockCount, setMockCount] = useState(3)
  const [mockElapsed, setMockElapsed] = useState(0)
  const countRef = useRef(mockCount)
  useEffect(() => {
    countRef.current = mockCount
  }, [mockCount])

  useEffect(() => {
    if (!detailsVisible) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const matrix = matrixRef.current
        if (!matrix) return
        const styles = getComputedStyle(matrix)
        const rowHeight = Number.parseFloat(styles.gridAutoRows)
        const rowGap = Number.parseFloat(styles.rowGap) || 0
        const top = matrix.getBoundingClientRect().top
        // Leave room for the matrix borders, lower case edge and page inset.
        const available = window.innerHeight - top - 20
        const count = fittingMockRows(available, rowHeight, rowGap, actualRows)
        setMockCount(count)
        onRowCapacity?.(count + 1)
      })
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    if (matrixRef.current) observer.observe(matrixRef.current)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [detailsVisible, actualRows, onRowCapacity])

  useEffect(() => {
    if (!animateMocks) return
    let frame = 0
    let timer = 0
    let elapsed = 0
    let lastAt = 0
    let active = false
    const landscape = window.matchMedia('(orientation: landscape)')
    const cancel = () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
    const tick = (now: number) => {
      if (!active) return
      elapsed += now - lastAt
      lastAt = now
      setMockElapsed(elapsed)
      const windowState = mockAnimationWindow(elapsed, countRef.current)
      if (windowState.active)
        timer = window.setTimeout(() => tick(performance.now()), 30)
      else if (Number.isFinite(windowState.nextAt))
        timer = window.setTimeout(
          () => tick(performance.now()),
          Math.max(0, windowState.nextAt - elapsed),
        )
    }
    const updateVisibility = () => {
      cancel()
      const now = performance.now()
      if (active) elapsed += now - lastAt
      active = !document.hidden && landscape.matches
      lastAt = now
      if (active) frame = requestAnimationFrame(tick)
    }
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    landscape.addEventListener('change', updateVisibility)
    return () => {
      active = false
      cancel()
      document.removeEventListener('visibilitychange', updateVisibility)
      landscape.removeEventListener('change', updateVisibility)
    }
  }, [animateMocks])

  return { matrixRef, mockCount, mockElapsed }
}
