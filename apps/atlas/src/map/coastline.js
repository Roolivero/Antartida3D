/** Natural Earth's pole/dateline closure becomes an artificial slit in a polar mesh. */
export function displayRings(feature) {
  return feature.geometry.coordinates.map(ring => {
    const result = []
    for (let i = 0; i < ring.length; i++) {
      const start = i
      if (Math.abs(ring[i][0]) === 180) {
        while (i + 1 < ring.length && Math.abs(ring[i + 1][0]) === 180) i++
        const run = ring.slice(start, i + 1)
        if (run.some(p => p[1] < -89) && Math.abs(run[0][1] - run.at(-1)[1]) < 0.00001) {
          result.push(run[0]); continue
        }
      }
      result.push(...ring.slice(start, i + 1))
    }
    return result
  })
}
