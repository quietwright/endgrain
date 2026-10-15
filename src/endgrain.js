// endgrain — deterministic growth-ring identicons.
// Every seed grows its own tree; the SVG is the cross-section of its trunk.

/** @typedef {{ name: string, early: string, late: string, heart: string, sap: string, bark: string, barkEdge: string, check: string, contrast: number }} Species */

/** @type {Record<string, Species>} */
export const SPECIES = {
  oak:    { name: 'oak',    early: '#dcb98a', late: '#9c6b3c', heart: '#c79a65', sap: '#e6cda4', bark: '#4b3828', barkEdge: '#2f2319', check: '#3a2a1d', contrast: 0.55 },
  walnut: { name: 'walnut', early: '#8c5d3e', late: '#3d2213', heart: '#73472d', sap: '#cfae84', bark: '#33261c', barkEdge: '#1f1712', check: '#22160f', contrast: 0.6 },
  cherry: { name: 'cherry', early: '#d89d70', late: '#9d5531', heart: '#bf7547', sap: '#ebc7a2', bark: '#4a2e25', barkEdge: '#2c1b16', check: '#3b2018', contrast: 0.5 },
  maple:  { name: 'maple',  early: '#f1e2c4', late: '#cfb07c', heart: '#e2c899', sap: '#f6ecd6', bark: '#6a5747', barkEdge: '#43372d', check: '#5b4632', contrast: 0.35 },
  pine:   { name: 'pine',   early: '#f2dba9', late: '#c4813f', heart: '#e0b675', sap: '#f6e6c0', bark: '#6b4733', barkEdge: '#3f2a1f', check: '#5a3a24', contrast: 0.8 },
  ash:    { name: 'ash',    early: '#eadabb', late: '#b4905e', heart: '#d6bd92', sap: '#f1e6d0', bark: '#5a5048', barkEdge: '#39322d', check: '#4d3f31', contrast: 0.6 },
}

const SPECIES_NAMES = Object.keys(SPECIES)
const TAU = Math.PI * 2

// cyrb128: string -> four 32-bit seeds.
function hash(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

// sfc32: small, fast, good enough, and identical on every JS engine.
function rng(seed) {
  let [a, b, c, d] = hash(String(seed))
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0
    const t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    const r = (t + d) | 0
    c = (c + r) | 0
    return (r >>> 0) / 4294967296
  }
  for (let i = 0; i < 12; i++) next()
  const range = (lo, hi) => lo + (hi - lo) * next()
  const pick = (list) => list[Math.floor(next() * list.length)]
  // Sum of uniforms: cheap, bounded, roughly normal.
  const gauss = () => (next() + next() + next() + next() - 2) * 1.732
  return { next, range, pick, gauss }
}

const fmt = (n) => {
  const s = (Math.round(n * 10) / 10).toFixed(1)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

// Closed Catmull-Rom spline through points, emitted as cubic Béziers.
function closedPath(pts) {
  const n = pts.length
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2[0])} ${fmt(p2[1])}`
  }
  return d + 'Z'
}

const DIRECTIONS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']
const compass = (angle) => DIRECTIONS[Math.round((((angle % TAU) + TAU) % TAU) / (TAU / 8)) % 8]

/**
 * Grow a tree from a seed. Pure data, no SVG yet.
 * @param {string} seed
 * @param {{ species?: string, age?: number }} [options]
 */
export function grow(seed, options = {}) {
  // Separate streams, so overriding one trait leaves the rest of the tree alone.
  const stream = (name) => rng(`${seed}\u0000${name}`)
  const r = stream('form')
  const seededSpecies = stream('species').pick(SPECIES_NAMES)
  const seededAge = Math.floor(stream('age').range(14, 46))
  const speciesName = options.species ?? seededSpecies
  const species = SPECIES[speciesName]
  if (!species) throw new Error(`unknown species "${speciesName}" (try: ${SPECIES_NAMES.join(', ')})`)

  const age = options.age ?? seededAge
  if (!Number.isInteger(age) || age < 3 || age > 200) throw new Error('age must be an integer between 3 and 200')

  // The tree leaned: rings are wider on one side (reaction wood).
  const leanAngle = r.range(0, TAU)
  const lean = r.range(0.03, 0.3)

  // Low-frequency wobble that drifts slowly from year to year.
  const harmonics = []
  for (let k = 2; k <= 7; k++) {
    harmonics.push({ k, amp: r.range(0.2, 1) / k, phase: r.range(0, TAU), drift: r.gauss() * 0.06 })
  }
  const ampSum = harmonics.reduce((s, h) => s + h.amp, 0)
  const wobble = r.range(0.1, 0.3)

  // Climate: good and bad years come in runs (AR(1)), and rings narrow with age.
  const weather = stream('climate')
  const widths = []
  let climate = 0
  for (let year = 0; year < age; year++) {
    climate = 0.7 * climate + 0.3 * weather.gauss()
    const trend = 1.6 / (1 + year * 0.06) + 0.35
    widths.push(Math.max(0.12, trend * Math.exp(0.45 * climate)))
  }

  // Per-angle cumulative growth: rings can never cross.
  const samples = 30
  const rings = []
  const radius = new Array(samples).fill(0)
  for (let year = 0; year < age; year++) {
    const ring = []
    for (let i = 0; i < samples; i++) {
      const theta = (i / samples) * TAU
      let n = 0
      for (const h of harmonics) n += h.amp * Math.sin(h.k * theta + h.phase + year * h.drift)
      const shape = Math.exp(wobble * (n / ampSum)) * (1 + lean * Math.cos(theta - leanAngle))
      radius[i] += widths[year] * shape
      ring.push(radius[i])
    }
    rings.push(ring)
  }

  // Bark: a ragged band whose thickness is a few percent of the trunk.
  const outer = rings[age - 1]
  const meanR = outer.reduce((s, v) => s + v, 0) / samples
  const barkSamples = 72
  const barkRng = stream('bark')
  const bark = []
  let roughness = 0
  for (let i = 0; i < barkSamples; i++) {
    roughness = 0.55 * roughness + 0.45 * barkRng.gauss()
    bark.push(meanR * (0.055 + 0.03 * Math.abs(roughness)))
  }

  const heartYear = Math.max(1, Math.round(age * r.range(0.55, 0.8)))

  // Checks: drying cracks. Radial ones start at the pith; one may come in from the bark.
  const checks = []
  const radialChecks = Math.floor(r.range(0, 2.6))
  for (let c = 0; c < radialChecks; c++) {
    checks.push({ from: 'pith', angle: r.range(0, TAU), reach: r.range(0.25, 0.6), width: r.range(0.012, 0.03), bend: r.gauss() * 0.06 })
  }
  if (r.next() < 0.3) {
    checks.push({ from: 'bark', angle: r.range(0, TAU), reach: r.range(0.15, 0.4), width: r.range(0.03, 0.06), bend: r.gauss() * 0.05 })
  }

  return { seed: String(seed), species, age, leanAngle, lean, samples, rings, bark, heartYear, checks, meanR }
}

/**
 * Plain-language description of a tree, used as the SVG's accessible title.
 * @param {ReturnType<typeof grow>} tree
 */
export function describe(tree) {
  const parts = [`A ${tree.age}-year-old ${tree.species.name}`]
  if (tree.lean > 0.18) parts.push(`that leaned ${compass(tree.leanAngle + Math.PI)}`)
  const pith = tree.checks.filter((c) => c.from === 'pith').length
  const bark = tree.checks.some((c) => c.from === 'bark')
  const cracks = []
  if (pith === 1) cracks.push('one heart check')
  if (pith > 1) cracks.push(`${pith === 2 ? 'two' : 'three'} heart checks`)
  if (bark) cracks.push('a split from the bark')
  if (cracks.length) parts.push(`with ${cracks.join(' and ')}`)
  return parts.join(' ') + '.'
}

/**
 * Render a seed as an SVG string.
 * @param {string} seed
 * @param {{ size?: number, species?: string, age?: number, shape?: 'log' | 'square' | 'circle', background?: string, title?: boolean }} [options]
 */
export function endgrain(seed, options = {}) {
  const tree = grow(seed, options)
  return render(tree, options)
}

/**
 * @param {ReturnType<typeof grow>} tree
 * @param {{ size?: number, shape?: 'log' | 'square' | 'circle', background?: string, title?: boolean }} [options]
 */
export function render(tree, options = {}) {
  const { size = 256, shape = 'log', background, title = true } = options
  if (!['log', 'square', 'circle'].includes(shape)) throw new Error(`unknown shape "${shape}" (try: log, square, circle)`)
  const { species: sp, rings, samples, bark, meanR } = tree

  // Place the pith so the whole section fits (log) or so the grain fills the frame (square/circle).
  const outer = rings[rings.length - 1]
  const pts = (ring, scale, cx, cy) => ring.map((rad, i) => {
    const t = (i / ring.length) * TAU
    return [cx + Math.cos(t) * rad * scale, cy + Math.sin(t) * rad * scale]
  })
  const barkRing = []
  for (let i = 0; i < bark.length; i++) {
    const t = (i / bark.length) * TAU
    const f = t / TAU * samples
    const a = Math.floor(f) % samples, b = (a + 1) % samples, w = f - Math.floor(f)
    barkRing.push(outer[a] * (1 - w) + outer[b] * w + bark[i])
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of pts(barkRing, 1, 0, 0)) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const V = 256
  let scale, cx, cy
  if (shape === 'log') {
    scale = (V * 0.92) / Math.max(maxX - minX, maxY - minY)
    cx = V / 2 - ((minX + maxX) / 2) * scale
    cy = V / 2 - ((minY + maxY) / 2) * scale
  } else {
    // Zoom in so the frame shows wood only: the frame's corners must stay inside the bark.
    const minR = Math.min(...outer)
    const reach = shape === 'square' ? Math.SQRT2 : 1
    scale = ((V / 2) * reach) / (minR * 0.8)
    // Keep the pith off-centre like a real offcut, but never so far the corners leave the wood.
    const slack = minR * scale - (V / 2) * reach
    cx = V / 2 - Math.cos(tree.leanAngle) * slack * 0.7
    cy = V / 2 - Math.sin(tree.leanAngle) * slack * 0.7
  }

  const out = []
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}" width="${size}" height="${size}" role="img">`)
  if (title) out.push(`<title>${escape(describe(tree))}</title>`)
  // Ids must not collide when several trees share a page.
  const clipId = `eg${hash(`${tree.seed}|${shape}|${tree.species.name}|${tree.age}`)[0].toString(36)}`
  if (shape !== 'log') {
    out.push(`<defs><clipPath id="${clipId}">${shape === 'circle' ? `<circle cx="128" cy="128" r="128"/>` : `<rect width="256" height="256"/>`}</clipPath></defs>`)
    out.push(`<g clip-path="url(#${clipId})">`)
  }
  if (background) out.push(`<rect width="256" height="256" fill="${escape(background)}"/>`)

  if (shape === 'log') {
    out.push(`<path d="${closedPath(pts(barkRing, scale, cx, cy))}" fill="${sp.bark}" stroke="${sp.barkEdge}" stroke-width="1.5"/>`)
    // The cambium: a thin dark line between bark and wood.
    out.push(`<path d="${closedPath(pts(outer, scale, cx, cy))}" fill="${sp.sap}" stroke="${sp.barkEdge}" stroke-width="1"/>`)
  } else {
    out.push(`<rect width="256" height="256" fill="${sp.sap}"/>`)
  }
  out.push(`<path d="${closedPath(pts(rings[tree.heartYear - 1], scale, cx, cy))}" fill="${sp.heart}"/>`)

  // Latewood: a stroke on each ring boundary, wider for wider years.
  const avgWidth = meanR / rings.length
  for (let year = 0; year < rings.length - (shape === 'log' ? 1 : 0); year++) {
    const ring = rings[year]
    const prev = year > 0 ? rings[year - 1] : null
    let w = 0
    for (let i = 0; i < samples; i++) w += ring[i] - (prev ? prev[i] : 0)
    w /= samples
    const stroke = Math.max(0.6, Math.min(3.4, w * scale * 0.34))
    const opacity = (0.55 + 0.45 * sp.contrast) * (year < tree.heartYear ? 1 : 0.8)
    out.push(`<path d="${closedPath(pts(ring, scale, cx, cy))}" fill="none" stroke="${sp.late}" stroke-width="${fmt(stroke)}" stroke-opacity="${fmt(opacity * 100) / 100}"/>`)
  }

  // Checks, as thin tapered wedges. In a log they stay inside the wood.
  const woodClip = `${clipId}w`
  if (shape === 'log' && tree.checks.length) {
    out.push(`<clipPath id="${woodClip}"><path d="${closedPath(pts(outer, scale, cx, cy))}"/></clipPath>`)
  }
  if (tree.checks.length) out.push(shape === 'log' ? `<g clip-path="url(#${woodClip})">` : '<g>')
  for (const c of tree.checks) {
    const len = meanR * c.reach
    const start = c.from === 'pith' ? meanR * 0.02 : meanR * 1.5
    const end = c.from === 'pith' ? start + len : meanR * (1 - c.reach)
    const steps = 8
    const left = [], right = []
    for (let s = 0; s <= steps; s++) {
      const f = s / steps
      const rad = start + (end - start) * f
      const a = c.angle + c.bend * f * f
      // Widest at the mouth of the crack, closing to a point.
      const half = meanR * c.width * (1 - f) * 0.5
      const nx = -Math.sin(a), ny = Math.cos(a)
      const x = cx + Math.cos(a) * rad * scale, y = cy + Math.sin(a) * rad * scale
      left.push([x + nx * half * scale, y + ny * half * scale])
      right.push([x - nx * half * scale, y - ny * half * scale])
    }
    const poly = left.concat(right.reverse()).map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(' L')
    out.push(`<path d="M${poly}Z" fill="${sp.check}" fill-opacity="0.85"/>`)
  }
  if (tree.checks.length) out.push('</g>')

  // The pith.
  const pithR = Math.max(1.2, avgWidth * scale * 0.35)
  out.push(`<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(pithR)}" ry="${fmt(pithR * 0.8)}" transform="rotate(${fmt((tree.leanAngle * 180) / Math.PI)} ${fmt(cx)} ${fmt(cy)})" fill="${sp.late}"/>`)

  if (shape !== 'log') out.push('</g>')
  out.push('</svg>')
  return out.join('')
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
}
