// Imperative escape hatch: OrbitControls must not fight pointer interactions.
// Grab the store getter with useThree((s) => s.get) and pass it here — the
// eslint react-hooks immutability rule blocks mutating useThree((s) => s.controls)
// directly inside components.
export function setControls(getThree, on) {
  const c = getThree().controls
  if (c) c.enabled = on
}
