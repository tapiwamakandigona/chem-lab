export default function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-lab-bg z-50">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">⚗</div>
        <p className="text-lab-muted text-sm">Loading lab...</p>
      </div>
    </div>
  )
}
