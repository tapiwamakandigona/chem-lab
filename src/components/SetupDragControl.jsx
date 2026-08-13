import { useRef, useState } from 'react'

/**
 * Pointer/touch placement surface shared by hands-on practicals. The target is
 * DOM-based so it remains reliable on low-end phones and does not depend on a
 * WebGL raycast. Keyboard users always receive the separate fallback action.
 */
export default function SetupDragControl({
  part,
  onPlace,
  dragTestId = 'setup-drag-part',
  feedbackTestId = 'setup-drag-feedback',
  dropZoneTestId = 'setup-drop-zone',
  label = part,
}) {
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [feedback, setFeedback] = useState('')
  const origin = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const pointerRef = useRef({ x: 0, y: 0 })

  const finish = (event) => {
    if (!draggingRef.current) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    draggingRef.current = false
    setDragging(false)
    setOffset({ x: 0, y: 0 })
    const zone = document.querySelector(
      `[data-testid="${dropZoneTestId}"]`,
    )?.getBoundingClientRect()
    // Pointer capture can report the release target using the button's
    // transformed local position on some touch/Chromium paths; the last
    // pointer-move viewport coordinates are the stable drop point.
    const point = pointerRef.current
    const aligned = zone
      && point.x >= zone.left
      && point.x <= zone.right
      && point.y >= zone.top
      && point.y <= zone.bottom
    if (aligned) {
      setFeedback('')
      onPlace()
    } else {
      setFeedback('Not aligned — drop the part inside the cyan bench zone.')
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        data-testid={dragTestId}
        aria-label={`Drag ${label} to the highlighted bench zone`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId)
          origin.current = { x: event.clientX, y: event.clientY }
          pointerRef.current = { x: event.clientX, y: event.clientY }
          draggingRef.current = true
          setDragging(true)
          setFeedback('')
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return
          pointerRef.current = { x: event.clientX, y: event.clientY }
          setOffset({
            x: event.clientX - origin.current.x,
            y: event.clientY - origin.current.y,
          })
        }}
        onPointerUp={finish}
        onPointerCancel={(event) => {
          event.currentTarget.releasePointerCapture?.(event.pointerId)
          draggingRef.current = false
          setDragging(false)
          setOffset({ x: 0, y: 0 })
        }}
        style={{
          touchAction: 'none',
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
        className={`relative z-30 min-h-11 w-full rounded-lg border px-3 text-xs font-medium shadow-lg ${
          dragging
            ? 'border-lab-accent bg-lab-accent text-lab-bg scale-[1.03]'
            : 'border-lab-accent/50 bg-[#0c1e35] text-lab-accent'
        }`}
      >
        <span aria-hidden="true">⠿</span> Drag {label} to the bench
      </button>
      {feedback && (
        <p data-testid={feedbackTestId} role="status" className="mt-1 text-[10px] text-lab-warning">
          {feedback}
        </p>
      )}
    </div>
  )
}
