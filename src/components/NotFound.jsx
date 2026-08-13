function FlaskMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M24 7h16M28 7v18L14 49a5 5 0 0 0 4 8h28a5 5 0 0 0 4-8L36 25V7" />
      <path d="M20 43h24M22 38c7 3 13-3 20 0" />
    </svg>
  )
}

export default function NotFound() {
  return (
    <main className="not-found" data-testid="not-found">
      <section className="not-found__card" aria-labelledby="not-found-title">
        <div className="not-found__mark"><FlaskMark /></div>
        <p className="not-found__eyebrow">404 · Route not found</p>
        <h1 id="not-found-title">This bench is empty.</h1>
        <p>
          That address does not lead to a ChemLab practical. Return to the
          launcher to choose from the available simulations and learner guide.
        </p>
        <a data-testid="not-found-home" href="/">Return to ChemLab</a>
        <small>
          ChemLab ZW is an independent learning tool. Cambridge International
          is not affiliated with or responsible for this site.
        </small>
      </section>
    </main>
  )
}
