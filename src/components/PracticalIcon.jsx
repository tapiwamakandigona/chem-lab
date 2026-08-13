// Line-art apparatus icons, one per practical. Drawn to read as the real
// glassware at 19px (library card) and still hold up at 120px (featured
// watermark). Sized in `em` so existing font-size rules keep controlling scale.
// Replaces the previous single-character unicode glyphs, which looked like
// placeholder text rather than a designed icon set.

const ICONS = {
  // Burette clamped above a conical flask, tip dripping.
  titration: (
    <>
    <path d="M10.4 2.4h3.2v8.2h-3.2z" />
      <circle cx="12" cy="12.4" r="1.5" />
      <path d="M12 14.6v1.4" />
      <path d="M6.2 21.6h11.6L13.6 13.8h-3.2z" />
    </>
  ),
  // Stopwatch: the clock reaction is timed to the disappearing cross.
  clock: (
    <>
    <circle cx="12" cy="14" r="6.6" />
      <path d="M12 10.6V14l2.4 1.7" />
      <path d="M9.9 3h4.2M12 3v3.9" />
    </>
  ),
  // Thermometer standing in an insulated calorimeter cup.
  enthalpy: (
    <>
    <path d="M6.4 8.2h11.2l-1.4 12.6H7.8z" />
      <path d="M7.4 12.4h9.2" />
      <path d="M14 2.4v8.4" />
      <circle cx="14" cy="12.4" r="1.7" />
    </>
  ),
  qual: (
    <>
    <path d="M6 5.4v9.4a2.6 2.6 0 005.2 0V5.4" />
      <path d="M12.8 5.4v9.4a2.6 2.6 0 005.2 0V5.4" />
      <path d="M4.4 5.4h15.2" />
      <path d="M6.2 11.4h4.8M13 11.4h4.8" />
    </>
  ),
  // Crucible on a pipe-clay triangle over a flame: heat to constant mass.
  grav: (
    <>
    <path d="M7.6 6.6h8.8l-1.6 5.4H9.2z" />
      <path d="M5.8 13.2h12.4" />
      <path d="M8 13.2l-1.6 3.6M16 13.2l1.6 3.6" />
      <path d="M12 21.6c-2-1.7-1.3-3.6 0-5.2 1.3 1.6 2 3.5 0 5.2z" />
    </>
  ),
  // Gas syringe: plunger driven out by evolved gas.
  gas: (
    <>
    <path d="M8 2.6v16.2a2.6 2.6 0 005.6 0V2.6" />
      <path d="M6.6 2.6h8.4" />
      <path d="M8 7h2.2M8 10.2h2.2M8 13.4h2.2" />
      <path d="M17.8 18.4V7.6" />
      <path d="M15.6 10l2.2-2.4 2.2 2.4" />
    </>
  ),
  // Aromatic ring with a functional-group tail.
  organic: (
    <>
    <path d="M12 2.8l7 4v8.4l-7 4-7-4V6.8z" />
      <path d="M9.1 8.4h5.8M9.6 12h4.8M10.3 15.5h3.4" />
    </>
  ),
  // Two electrodes in electrolyte, wired through a meter.
  electro: (
    <>
    <path d="M4.4 10.4v7.6a2.6 2.6 0 002.6 2.6h10a2.6 2.6 0 002.6-2.6v-7.6" />
      <path d="M4.6 13.8h14.8" />
      <path d="M8.8 6.6v9.4M15.2 6.6v9.4" />
      <path d="M7.2 4.2h3.2M8.8 2.6v3.2" />
      <path d="M13.6 4.2h3.2" />
    </>
  ),
  // Chromatography paper: baseline spots separated below the solvent front.
  chroma: (
    <>
    <path d="M9 2.4h6v18.2H9z" />
      <path d="M9 6.8h6" />
      <path d="M4.6 17.4h14.8" />
      <circle cx="10.9" cy="14.4" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="13.2" cy="11.2" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="11.4" cy="9.2" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  // Bunsen burner with a luminous flame — cation flame tests.
  flame: (
    <>
    <path d="M12 1.8c-3.4 3.7-2 6.6 0 8.9 2-2.3 3.4-5.2 0-8.9z" />
      <path d="M10.6 11.2h2.8v6.4h-2.8z" />
      <path d="M9.2 17.6h5.6l1.4 3.2H7.8z" />
    </>
  ),
  // Pear flask feeding an inclined condenser into a receiver.
  distill: (
    <>
    <circle cx="6.6" cy="16.4" r="4.2" />
      <path d="M6.6 12.2V6.8h2.6" />
      <path d="M9.4 5.8l7.8 6M8.6 7.4l7.8 6" />
      <path d="M15.8 16.8v4.2h4.4v-4.2" />
      <path d="M18 14.2v2.6" />
    </>
  ),
  // Saturated solution cooling: crystals forming under a thermometer.
  solubility: (
    <>
    <path d="M4.8 6.6v11a2.8 2.8 0 002.8 2.8h6.2a2.8 2.8 0 002.8-2.8v-11" />
      <path d="M3.4 6.6h14" />
      <path d="M4.9 14h11.7" />
      <path d="M7.4 17.6l1.5-2 1.5 2-1.5 2z" />
      <path d="M11.8 18.2l1.3-1.7 1.3 1.7-1.3 1.7z" />
      <path d="M19.6 3v9.4" />
      <circle cx="19.6" cy="14.2" r="1.5" />
    </>
  ),
  // Catalysed decomposition: oxygen bubbling out of the flask.
  peroxide: (
    <>
    <path d="M9.6 4.4v3.8L5.4 20.8h13.2L14.4 8.2V4.4z" />
      <path d="M9.2 4.4h5.6" />
      <circle cx="10.6" cy="16.6" r="1.1" />
      <circle cx="13.6" cy="14.4" r="0.9" />
      <circle cx="11.8" cy="12" r="0.8" />
    </>
  ),
  // --- landing "what you get" row (was ⌖ / f / ✓) ---
  // A burette stopcock you turn: technique under your control.
  'outcome-technique': (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 3.2v4.4M12 16.4v4.4M3.2 12h4.4M16.4 12h4.4" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  // Readings becoming a plotted result.
  'outcome-results': (
    <>
      <path d="M4.4 3.6v16.4h15.6" />
      <path d="M7 16.6l3.6-4.4 3.2 2.2 4.4-6.2" />
      <circle cx="10.6" cy="12.2" r="1" />
      <circle cx="13.8" cy="14.4" r="1" />
    </>
  ),
  // Marked script: feedback checked against your evidence.
  'outcome-feedback': (
    <>
      <rect x="4.6" y="3.4" width="14.8" height="17.2" rx="1.6" />
      <path d="M8.2 8.4h7.6M8.2 11.6h4.4" />
      <path d="M8.4 16.2l2.2 2.2 4.8-5" />
    </>
  ),
  // Zero-order decay: [I2] falling on a straight line against time.
  'iodine-rate': (
    <>
    <path d="M4.4 3v17h16.2" />
      <path d="M7 6.6l10.6 10.6" />
      <circle cx="7" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12.3" cy="11.9" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17.6" cy="17.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function PracticalIcon({ id, className }) {
  const art = ICONS[id]
  if (!art) return null
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {art}
    </svg>
  )
}

export const PRACTICAL_ICON_IDS = Object.keys(ICONS)
