/** Pull distances are viewport pixels, independent of the fitted ticket scale. */
export function ticketTearProgress(dx: number, dy: number, stubWidth: number) {
  const distance = Math.max(0, dx + Math.max(0, dy) * 0.85)
  const threshold = Math.min(88, Math.max(48, stubWidth * 0.32))
  return Math.min(1, distance / threshold)
}

/** Only the already-torn portion gets paper teeth; the remainder stays straight. */
export function ticketTearEdge(progress: number) {
  const end = Math.min(100, Math.max(0, progress * 100))
  const points = ['0 0', '100% 0', '100% 100%', '0 100%', `0 ${end}%`]
  for (let y = Math.floor(end / 2) * 2; y > 0; y -= 2) {
    points.push(`${y % 4 === 0 ? '0' : '2px'} ${y}%`)
  }
  return `polygon(${points.join(', ')})`
}

/** A shared curve keeps adjacent paper strips continuous and the uncut seam fixed. */
export function ticketPaperOffset(
  y: number,
  progress: number,
  pullX: number,
  pullY: number,
) {
  if (progress <= 0 || y >= progress) return { x: 0, y: 0 }
  const bend = ((progress - y) / progress) ** 2
  return {
    x:
      Math.min(76, Math.max(0, pullX) * 0.52 + Math.max(0, pullY) * 0.24) *
      bend,
    y: Math.min(28, Math.max(0, pullY) * 0.22) * bend,
  }
}

export function ticketPaperStrip(
  index: number,
  count: number,
  height: number,
  progress: number,
  pullX: number,
  pullY: number,
) {
  const top = index / count
  const bottom = (index + 1) / count
  const start = ticketPaperOffset(top, progress, pullX, pullY)
  const end = ticketPaperOffset(bottom, progress, pullX, pullY)
  const stripHeight = Math.max(1, height) / count
  const shear = (end.x - start.x) / stripHeight
  const stretch = (end.y - start.y) / stripHeight
  return [
    1,
    0,
    shear,
    1 + stretch,
    start.x - shear * top * height,
    start.y - stretch * top * height,
  ]
}
