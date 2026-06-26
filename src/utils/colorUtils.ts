function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}

function perceivedBrightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

// Background darkest point is ~#07111f (brightness ≈ 0.06)
// Colors need to be noticeably brighter to read against it
const MIN_BRIGHTNESS = 0.24

export function isTooCloseToBackground(hex: string): boolean {
  return perceivedBrightness(hex) < MIN_BRIGHTNESS
}

// Blend toward white until brightness threshold is met, preserving hue
export function ensureContrast(hex: string): string {
  if (!isTooCloseToBackground(hex)) return hex
  const [r, g, b] = hexToRgb(hex)
  for (let t = 0.05; t <= 1; t += 0.05) {
    const nr = Math.round(r + (255 - r) * t)
    const ng = Math.round(g + (255 - g) * t)
    const nb = Math.round(b + (255 - b) * t)
    const result = `#${[nr, ng, nb].map(c => c.toString(16).padStart(2, '0')).join('')}`
    if (!isTooCloseToBackground(result)) return result
  }
  return '#888888'
}
