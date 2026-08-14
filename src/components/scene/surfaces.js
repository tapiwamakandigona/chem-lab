import * as THREE from 'three'

/**
 * Procedural surface textures for the lab room (F5 bench/room texture pass).
 *
 * Rule being enforced: no large surface may be a single flat colour. Every
 * maker paints one seeded, non-repeating canvas that covers its whole surface
 * (ClampToEdge, no tiling period anywhere a camera can point). Deterministic
 * mulberry32 PRNG keeps renders stable for screenshot evidence, matching the
 * SHELF_JITTER practice. Zero network, zero bundle assets, SwiftShader-safe.
 */

/** Deterministic 32-bit PRNG — same sequence every load. */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCanvas(w, h, base) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.fillStyle = base
  g.fillRect(0, 0, w, h)
  return [c, g]
}

/** Luminance stddev of a painted canvas (sampled). Recorded on
 *  window.__labSurfaceStats so the gfx gate can assert no large surface
 *  shipped flat — the F5 rule as a testable invariant. */
function recordStats(key, canvas) {
  if (!key) return
  try {
    const g = canvas.getContext('2d')
    const { data } = g.getImageData(0, 0, canvas.width, canvas.height)
    let n = 0
    let sum = 0
    let sq = 0
    for (let i = 0; i < data.length; i += 64) { // every 16th pixel
      const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      n++
      sum += y
      sq += y * y
    }
    const mean = sum / n
    const std = Math.sqrt(Math.max(0, sq / n - mean * mean))
    window.__labSurfaceStats = window.__labSurfaceStats || {}
    window.__labSurfaceStats[key] = {
      w: canvas.width, h: canvas.height,
      mean: Math.round(mean * 100) / 100, std: Math.round(std * 100) / 100,
    }
  } catch { /* stats are diagnostics; never break rendering */ }
}

function toTexture(canvas, { linear = false } = {}) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  t.anisotropy = 8
  return t
}

/** Soft irregular blotches — the large-scale unevenness real surfaces have. */
function mottle(g, rnd, w, h, { count, rMin, rMax, light, dark, alpha }) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const r = rMin + rnd() * (rMax - rMin)
    const tone = rnd() < 0.5 ? light : dark
    const grad = g.createRadialGradient(x, y, r * 0.1, x, y, r)
    grad.addColorStop(0, tone.replace('A', (alpha * (0.6 + rnd() * 0.4)).toFixed(3)))
    grad.addColorStop(1, tone.replace('A', '0'))
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
}

/** Fine per-spot grain. */
function speckle(g, rnd, w, h, { count, size, tones, alpha }) {
  for (let i = 0; i < count; i++) {
    const s = 1 + rnd() * size
    g.globalAlpha = alpha * (0.5 + rnd() * 0.5)
    g.fillStyle = tones[(rnd() * tones.length) | 0]
    g.fillRect(rnd() * w, rnd() * h, s, s)
  }
  g.globalAlpha = 1
}

/**
 * Black epoxy-resin bench top: large matte mottling, fine grain, faint
 * scratches mostly along the bench axis, a few ghost rings where hot
 * glassware once stood. seed varies per surface so the back counter never
 * repeats the bench.
 */
export function makeEpoxyTexture({ seed = 7, base = '#31363c', w = 1024, h = 512, statKey } = {}) {
  const rnd = mulberry32(seed)
  const [c, g] = makeCanvas(w, h, base)

  mottle(g, rnd, w, h, {
    count: 74, rMin: 60, rMax: 300,
    light: 'rgba(104,116,130,A)', dark: 'rgba(6,8,11,A)', alpha: 0.42,
  })
  speckle(g, rnd, w, h, {
    count: 7000, size: 2.8,
    tones: ['#525a64', '#161a1f', '#414851', '#626a75'], alpha: 0.45,
  })

  // scratches: thin, low-alpha, biased along x like years of sliding apparatus
  for (let i = 0; i < 34; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const len = 30 + rnd() * 180
    const ang = (rnd() - 0.5) * 0.5 + (rnd() < 0.12 ? Math.PI / 2 : 0)
    g.strokeStyle = rnd() < 0.6 ? 'rgba(150,160,170,0.22)' : 'rgba(8,10,13,0.28)'
    g.lineWidth = 0.8 + rnd() * 0.7
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(
      x + Math.cos(ang) * len * 0.5 + (rnd() - 0.5) * 14,
      y + Math.sin(ang) * len * 0.5 + (rnd() - 0.5) * 14,
      x + Math.cos(ang) * len,
      y + Math.sin(ang) * len,
    )
    g.stroke()
  }

  // ghost rings from hot beakers / bottles
  for (let i = 0; i < 4; i++) {
    const x = w * (0.12 + rnd() * 0.76)
    const y = h * (0.15 + rnd() * 0.7)
    const r = 14 + rnd() * 24
    g.strokeStyle = 'rgba(160,168,178,0.13)'
    g.lineWidth = 2.5 + rnd() * 2
    g.beginPath()
    g.arc(x, y, r, rnd() * 6.3, rnd() * 4 + 2)
    g.stroke()
  }

  recordStats(statKey, c)
  return toTexture(c)
}

/** Matching roughness map for the epoxy: worn matte patches over a semi-gloss
 *  base. Sheen variation under the key light is what makes the surface read
 *  as resin instead of a flat gradient. Linear space, use with roughness={1}. */
export function makeEpoxyRoughness({ seed = 8, w = 512, h = 256 } = {}) {
  const rnd = mulberry32(seed)
  const [c, g] = makeCanvas(w, h, '#5e5e5e') // base roughness ~0.37
  mottle(g, rnd, w, h, {
    count: 44, rMin: 30, rMax: 170,
    light: 'rgba(150,150,150,A)', dark: 'rgba(58,58,58,A)', alpha: 0.5,
  })
  speckle(g, rnd, w, h, {
    count: 2200, size: 2.0,
    tones: ['#8a8a8a', '#4a4a4a'], alpha: 0.4,
  })
  return toTexture(c, { linear: true })
}

/** Continuous vinyl lab floor: three-tone terrazzo flecks over soft blotches,
 *  with a faint traffic-wear darkening in front of the bench. */
export function makeVinylFloorTexture({ seed = 21, base = '#c9d2da', w = 1024, h = 1024, statKey } = {}) {
  const rnd = mulberry32(seed)
  const [c, g] = makeCanvas(w, h, base)

  mottle(g, rnd, w, h, {
    count: 40, rMin: 90, rMax: 340,
    light: 'rgba(230,236,242,A)', dark: 'rgba(144,155,167,A)', alpha: 0.26,
  })
  speckle(g, rnd, w, h, {
    count: 5200, size: 3.0,
    tones: ['#9aa5b0', '#e2e8ee', '#8892a0', '#b6bfc9'], alpha: 0.65,
  })

  // traffic wear where people stand at the bench (texture centre = world
  // origin; bench front edge sits just +z of centre)
  const grad = g.createRadialGradient(w * 0.5, h * 0.56, 30, w * 0.5, h * 0.56, w * 0.24)
  grad.addColorStop(0, 'rgba(112,122,134,0.18)')
  grad.addColorStop(1, 'rgba(120,130,140,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)

  recordStats(statKey, c)
  return toTexture(c)
}

/** Painted plasterboard wall: barely-there blotches + vertical roller streaks.
 *  Amplitude kept low — walls should read as texture, not dirt. */
export function makePlasterTexture({ seed = 40, base = '#e3e9f0', w = 512, h = 256, statKey } = {}) {
  const rnd = mulberry32(seed)
  const [c, g] = makeCanvas(w, h, base)

  mottle(g, rnd, w, h, {
    count: 30, rMin: 40, rMax: 170,
    light: 'rgba(244,248,252,A)', dark: 'rgba(193,203,214,A)', alpha: 0.34,
  })
  for (let i = 0; i < 18; i++) {
    const x = rnd() * w
    g.fillStyle = rnd() < 0.5 ? 'rgba(240,244,249,0.12)' : 'rgba(200,209,219,0.12)'
    g.fillRect(x, 0, 6 + rnd() * 22, h)
  }
  speckle(g, rnd, w, h, {
    count: 1400, size: 1.4,
    tones: ['#cdd6df', '#f0f4f8'], alpha: 0.3,
  })

  recordStats(statKey, c)
  return toTexture(c)
}
