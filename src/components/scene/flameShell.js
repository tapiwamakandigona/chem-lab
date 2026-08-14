import * as THREE from 'three'

/** Shared Bunsen-flame shell (iter-56 rule, extracted iter-62).
 *  A straight-sided cone silhouette reads as a *diagram* of a flame — the
 *  stranger-tell first fixed in FlameScene. Any burner flame in the app must
 *  use this lathe teardrop (bulge + rounded tip) faded vertically by the
 *  alpha map, never a bare <coneGeometry>.
 */

export const BUNSEN_BLUE_OUTER = '#2588ff'
export const BUNSEN_BLUE_INNER = '#b8e5ff'

/** Curved teardrop flame shell: bulge at ~28% height, smooth taper to a
 *  rounded tip. rBase/rBulge/h in scene metres. */
export function flameGeometry(rBase, rBulge, h) {
  const pts = []
  const N = 24
  for (let i = 0; i <= N; i += 1) {
    const t = i / N
    const bulge = Math.sin(Math.min(t / 0.28, 1) * Math.PI * 0.5)
    const taper = Math.pow(1 - Math.max(0, (t - 0.28) / 0.72), 1.6)
    const r = t < 0.28 ? rBase + (rBulge - rBase) * bulge : rBulge * taper
    pts.push(new THREE.Vector2(Math.max(r, 0.0004), t * h))
  }
  return new THREE.LatheGeometry(pts, 28)
}

/** 1x64 vertical gradient alpha map: soft root, solid body, faded tip. */
export function flameAlphaMap() {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 64
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 64, 0, 0)
  grad.addColorStop(0, 'rgb(140,140,140)')
  grad.addColorStop(0.35, 'rgb(255,255,255)')
  grad.addColorStop(0.85, 'rgb(200,200,200)')
  grad.addColorStop(1, 'rgb(0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 1, 64)
  return new THREE.CanvasTexture(c)
}
