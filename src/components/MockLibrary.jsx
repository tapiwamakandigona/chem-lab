import { MOCK_PAPERS, routeForExperiment } from '../lib/routes.js'

export default function MockLibrary({ onBack, onOpenExperiment }) {
  return (
    <main className="route-page" data-testid="mocks-page">
      <header className="route-page__bar">
        <button type="button" onClick={onBack}>← Lab home</button>
        <span className="route-page__brand">ChemLab</span>
        <span className="route-page__code">9701 · MOCKS</span>
      </header>
      <div className="route-page__shell">
        <p className="section-kicker">MARKED FROM YOUR OWN RESULTS</p>
        <h1>Three mock-paper doors. No hunting through the lab.</h1>
        <p className="route-page__intro">
          Each question uses the readings you produce in its practical. Run the
          experiment first, then the paper unlocks inside that lab with error
          carried forward just like the marking workflow you are practising.
        </p>
        <div className="mock-library">
          {MOCK_PAPERS.map((paper, index) => (
            <article key={paper.id} data-testid={`mock-library-${paper.id}`}>
              <span className="mock-library__number">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <small>{paper.subtitle}</small>
                <h2>{paper.title}</h2>
                <p>{paper.requirement}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenExperiment(paper.experiment)}
                data-route={routeForExperiment(paper.experiment)}
              >
                Run prerequisite practical <span aria-hidden="true">↗</span>
              </button>
            </article>
          ))}
        </div>
        <p className="route-page__note">
          Your best scores stay on this device and are included in a ChemLab progress backup.
        </p>
      </div>
    </main>
  )
}

