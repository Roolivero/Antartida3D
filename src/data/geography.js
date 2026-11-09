// South-polar stereographic view, unit sphere scaled for a display model.
// This is not a survey coordinate system or an elevation model.
export function project([longitude, latitude]) {
  const radius = 15 * Math.tan(((90 + latitude) * Math.PI) / 360)
  const angle = ((longitude + 15) * Math.PI) / 180
  return [radius * Math.sin(angle), -radius * Math.cos(angle)]
}

// Intentionally illustrative: deterministic sculpted ice and mountain shapes.
export function illustrativeHeight(x, z) {
  const dome = 0.36 * Math.exp(-((x - 0.6) ** 2 + (z - 0.2) ** 2) / 5)
  const ridge = 0.34 * Math.exp(-((z - 0.55 * x - 0.3) ** 2) / 0.1) * Math.exp(-(x * x) / 6)
  const detail = 0.045 * Math.sin(x * 17 + z * 5) * Math.cos(z * 14 - x * 4)
  return 0.17 + dome + ridge + detail
}
