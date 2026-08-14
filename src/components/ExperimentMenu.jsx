import { useCallback, useEffect, useState } from 'react'
import { QUALITY, useLabStore } from '../store.js'
import { COURSE_UNITS, courseProgressCount } from '../lib/course.js'
import PracticalIcon from './PracticalIcon.jsx'

const EXPERIMENTS = [
  {
    id: 'titration',
    title: 'Acid-Base & Redox Titration',
    short: 'Titration',
    skill: 'Measure an endpoint and calculate from concordant titres.',
    desc: 'Use a burette, pipette and conical flask. Read the meniscus yourself, reach the first permanent colour change and complete an S22-style marked question.',
    papers: ['9701/31/M/J/22', '9701/31/M/J/21'],
    category: 'paper',
    featured: true,
    featuredTitle: 'Run a precise titration',
  },
  {
    id: 'clock',
    title: 'Iodine Clock Reaction',
    short: 'Rates',
    skill: 'Turn reaction times into rates and read a gradient.',
    desc: 'Run five thiosulfate concentrations, observe the cross disappear, plot rate against concentration and complete an S23-style question.',
    papers: ['9701/31/M/J/23'],
    category: 'paper',
    featured: true,
    featuredTitle: 'See rates become a graph',
  },
  {
    id: 'enthalpy',
    title: 'Enthalpy of Solution',
    short: 'Energetics',
    skill: 'Correct a cooling curve and calculate ΔH.',
    desc: 'Measure an exothermic dissolution, extrapolate heat loss and use q = mcΔT in an S20-style marked question.',
    papers: ['9701/31/M/J/20'],
    category: 'paper',
    featured: true,
    featuredTitle: 'Correct for heat loss',
  },
  {
    id: 'qual',
    title: 'Qualitative Analysis',
    short: 'Ion tests',
    skill: 'Identify unknown ions from your own observations.',
    desc: 'Test five unknowns with NaOH, NH₃, gas tests, BaCl₂ and AgNO₃. Evidence—not guessing—earns the identification marks.',
    papers: ['9701 P3 Q3 style'],
    category: 'paper',
    featured: true,
    featuredTitle: 'Identify an unknown',
  },
  {
    id: 'grav',
    title: 'Water of Crystallisation',
    short: 'Gravimetry',
    skill: 'Heat to constant mass and determine x.',
    desc: 'Heat, cool and reweigh MgSO₄·xH₂O until two readings agree, then calculate x from the masses you measured.',
    papers: ['9701 P3 Q2 style'],
    category: 'paper',
  },
  {
    id: 'gas',
    title: 'Molar Gas Volume',
    short: 'Gas collection',
    skill: 'Read a gas syringe and calculate percentage purity.',
    desc: 'Collect CO₂ from impure CaCO₃ and HCl until the volume becomes constant, then mark a purity calculation from your result.',
    papers: ['9701 P3 Q2 style'],
    category: 'paper',
  },
  {
    id: 'organic',
    title: 'Organic Analysis',
    short: 'Organic tests',
    skill: 'Deduce a functional group with deciding tests.',
    desc: 'Use 2,4-DNPH, Tollens’, Fehling’s, dichromate, bromine water and other tests to identify five unknown liquids.',
    papers: ['9701 P3 Q4 style'],
    category: 'paper',
  },
  {
    id: 'electro',
    title: 'Electrochemical Cells',
    short: 'E° cells',
    skill: 'Wire half-cells and identify an unknown metal.',
    desc: 'Measure E cell against two reference electrodes, track polarity and use Data Booklet values to identify the unknown.',
    papers: ['electrochemistry enrichment'],
    category: 'enrichment',
  },
  {
    id: 'chroma',
    title: 'Paper Chromatography',
    short: 'Chromatography',
    skill: 'Measure Rf values and identify a dye mixture.',
    desc: 'Develop a food-dye chromatogram, measure spot and solvent-front distances and match two dyes to a reference table.',
    papers: ['analysis enrichment'],
    category: 'enrichment',
  },
  {
    id: 'flame',
    title: 'Flame Tests',
    short: 'Flame tests',
    skill: 'Control contamination and identify metal ions.',
    desc: 'Clean a nichrome loop, confirm a colourless blank and diagnose lithium, sodium, potassium, calcium and copper.',
    papers: ['qualitative enrichment'],
    category: 'enrichment',
  },
  {
    id: 'distill',
    title: 'Simple Distillation',
    short: 'Distillation',
    skill: 'Set up cooling flow and collect pure distillate.',
    desc: 'Choose the condenser direction, prevent bumping, control boiling and separate colourless water from CuSO₄(aq).',
    papers: ['separation enrichment'],
    category: 'enrichment',
  },
  {
    id: 'solubility',
    title: 'Solubility & Crystallisation',
    short: 'Solubility',
    skill: 'Detect saturation and build a solubility curve.',
    desc: 'Heat assigned KNO₃ mixtures, cool to the first crystals and plot measured solubilities against temperature.',
    papers: ['temperature investigation'],
    category: 'enrichment',
  },
  {
    id: 'peroxide',
    title: 'Catalytic Decomposition Kinetics',
    short: 'Kinetics',
    skill: 'Compare complete O₂ curves and initial gradients.',
    desc: 'Collect oxygen every 20 s while changing one variable: concentration, catalyst surface area or temperature.',
    papers: ['9701 P3 / P5 kinetics'],
    category: 'enrichment',
    featured: true,
    featuredTitle: 'Compare initial rates',
  },
  {
    id: 'iodine-rate',
    title: 'Iodine–Propanone Rate Titration',
    short: 'Timed titration',
    skill: 'Quench a timed sample and calculate rate from residual iodine.',
    desc: 'Stop the acid-catalysed reaction at 80 s, add starch only at pale yellow, obtain concordant thiosulfate titres and calculate the iodine rate.',
    papers: ['9701/34/O/N/24 technique'],
    category: 'paper',
    featured: true,
    featuredTitle: 'Quench, titre and calculate',
  },
]

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Choose a practical',
    text: 'Start with the ordered Learner’s Guide or open any experiment from the full lab.',
  },
  {
    n: '02',
    title: 'Do the chemistry',
    text: 'Operate the apparatus, record readings and see the model respond to your technique.',
  },
  {
    n: '03',
    title: 'Use your result',
    text: 'Calculate, conclude and answer exam-style work marked from the evidence you produced.',
  },
]

const FAQS = [
  {
    q: 'Is ChemLab free?',
    a: 'Yes. You can start every practical and the full Learner’s Guide without payment or an account.',
  },
  {
    q: 'Does it work without internet?',
    a: 'After the first successful load, the installable web app caches the lab shell, fonts and experiment code for offline use on that device.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. The lab supports portrait and landscape layouts, touch controls and pinch or on-screen zoom. Lower graphics modes help on slower phones.',
  },
  {
    q: 'Does Cambridge International operate or endorse ChemLab?',
    a: 'No. ChemLab is an independent learning tool. “Cambridge 9701” describes the syllabus context; Cambridge International does not endorse or operate this site.',
  },
  {
    q: 'Does a simulation replace the real laboratory?',
    a: 'No. Use ChemLab to rehearse method, observations, calculations and exam decisions. Practical safety and supervised hands-on technique still need a real laboratory.',
  },
]

function FlaskMark({ small = false }) {
  return (
    <span className={`brand-mark ${small ? 'brand-mark--small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img">
        <path d="M25 8h14M27 8v16L13 51a4 4 0 0 0 3.5 5.9h31A4 4 0 0 0 51 51L37 24V8" />
        <path d="M20 43h24" />
        <circle cx="29" cy="36" r="2" />
        <circle cx="36.5" cy="31" r="1.5" />
      </svg>
    </span>
  )
}

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>
}

function scrollToLibrary() {
  const target = document.getElementById('practicals')
  if (!target) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

export default function ExperimentMenu({ onSelect, onOpenGuide, onOpenMocks }) {
  const { quality, setQuality, courseDone, setCourseOpen } = useLabStore()
  const courseCount = courseProgressCount(courseDone)
  const [navOpen, setNavOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [openFaq, setOpenFaq] = useState(null)

  const begin = useCallback(() => {
    scrollToLibrary()
    setNavOpen(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const visibleExperiments = EXPERIMENTS.filter((exp) => filter === 'all' || exp.category === filter)
  const featured = EXPERIMENTS.filter((exp) => exp.featured)

  return (
    <div className="landing-page" data-testid="landing-page">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <header className="site-header" data-testid="site-header">
        <a className="wordmark" href="#top" aria-label="ChemLab home">
          <FlaskMark small />
          <span>Chem<b>Lab</b></span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={navOpen}
          aria-controls="primary-navigation"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setNavOpen((v) => !v)}
        >
          <span />
          <span />
        </button>

        <nav
          id="primary-navigation"
          className={`site-nav ${navOpen ? 'site-nav--open' : ''}`}
          aria-label="Primary navigation"
        >
          <a href="#how-it-works" onClick={() => setNavOpen(false)}>How it works</a>
          <a href="#practicals" onClick={() => setNavOpen(false)}>Practicals</a>
          <a href="#offline" onClick={() => setNavOpen(false)}>Offline & mobile</a>
          <a href="#faq" onClick={() => setNavOpen(false)}>FAQ</a>
        </nav>

        <button className="nav-cta" type="button" data-testid="header-primary-cta" onClick={begin}>
          Start practising <ArrowIcon />
        </button>
      </header>

      <main id="main-content" tabIndex="-1">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-orbit hero-orbit--one" aria-hidden="true" />
          <div className="hero-orbit hero-orbit--two" aria-hidden="true" />
          <div className="landing-shell hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="live-dot" aria-hidden="true" />
                Free · no account needed
              </div>
              <h1 id="hero-title">
                Practise Cambridge Chemistry <em>practicals anywhere.</em>
              </h1>
              <p className="hero-lede">
                Operate the apparatus, collect your own readings and turn them into
                exam-ready answers—on the phone or computer you already have.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="primary-cta"
                  data-testid="hero-primary-cta"
                  onClick={begin}
                >
                  Start practising free <ArrowIcon />
                </button>
                <button
                  type="button"
                  className="text-cta"
                  data-testid="hero-course-cta"
                  onClick={onOpenGuide ?? (() => setCourseOpen(true))}
                >
                  Open Learner’s Guide <span aria-hidden="true">→</span>
                </button>
              </div>
              <p className="hero-note">Independent study tool · Cambridge 9701 syllabus context</p>
            </div>

            <div className="hero-product" data-testid="hero-product">
              <div className="product-halo" aria-hidden="true" />
              <div className="product-window">
                <div className="product-bar">
                  <span className="product-status"><i /> LIVE PRACTICAL</span>
                  <span className="product-code">9701 · KINETICS</span>
                </div>
                <img
                  src="/media/lab-kinetics.webp"
                  width="1280"
                  height="720"
                  alt="ChemLab catalytic kinetics practical showing a flask, oxygen gas syringe, graph and marked learner controls"
                />
                <div className="product-readout product-readout--rate">
                  <span>INITIAL RATE</span>
                  <strong>1.32</strong>
                  <small>cm³ s⁻¹</small>
                </div>
                <div className="product-readout product-readout--mark">
                  <span aria-hidden="true">✓</span>
                  <strong>3 / 3</strong>
                  <small>evidence marks</small>
                </div>
              </div>
              <p className="product-caption">
                <span>CATALYTIC DECOMPOSITION</span>
                Real run data · automatic graph · evidence marking
              </p>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="Product facts" data-testid="proof-strip">
          <div className="landing-shell proof-grid">
            <div><strong>14</strong><span>interactive practicals</span></div>
            <div><strong>19</strong><span>guided milestones</span></div>
            <button
              type="button"
              className="proof-grid__link"
              onClick={onOpenMocks}
              data-testid="mocks-open"
            >
              <strong>3</strong><span>marked mock papers · open →</span>
            </button>
            <div><strong>1×</strong><span>load once, then practise offline</span></div>
          </div>
        </section>

        <section className="landing-section problem-section" aria-labelledby="problem-title">
          <div className="landing-shell split-heading">
            <div>
              <p className="section-kicker">PRACTICAL ACCESS, REBUILT</p>
              <h2 id="problem-title">You cannot learn practical chemistry by only reading about it.</h2>
            </div>
            <div className="section-copy">
              <p>
                Notes can explain the method. Videos can show somebody else doing it.
                ChemLab gives you the decisions: when to slow the burette, what to record,
                which evidence supports a conclusion and how your result carries into a calculation.
              </p>
              <p>
                Make the mistake here, understand it, reset and try again—before the real practical.
              </p>
            </div>
          </div>

          <div className="landing-shell outcome-grid">
            <article>
              <span className="outcome-icon"><PracticalIcon id="outcome-technique" /></span>
              <h3>Technique you control</h3>
              <p>Dispense, pour, heat, cool, wire and measure. The procedure responds to what you actually do.</p>
            </article>
            <article>
              <span className="outcome-icon"><PracticalIcon id="outcome-results" /></span>
              <h3>Results you calculate</h3>
              <p>Your readings feed graphs, gradients, percentage purity, Rf values, ΔH and marked conclusions.</p>
            </article>
            <article>
              <span className="outcome-icon"><PracticalIcon id="outcome-feedback" /></span>
              <h3>Feedback that uses evidence</h3>
              <p>Correct names alone are not enough. The lab checks whether your run supports the answer.</p>
            </article>
          </div>
        </section>

        <section className="landing-section featured-section" aria-labelledby="featured-title">
          <div className="landing-shell">
            <div className="section-heading-row">
              <div>
                <p className="section-kicker">INSIDE THE LAB</p>
                <h2 id="featured-title">Practise the decision, not the demo.</h2>
              </div>
              <button type="button" className="text-cta" onClick={scrollToLibrary}>
                View all 14 practicals <span aria-hidden="true">↓</span>
              </button>
            </div>

            <div className="featured-grid">
              {featured.map((exp, index) => (
                <button
                  key={exp.id}
                  type="button"
                  className={`featured-card featured-card--${index + 1}`}
                  onClick={() => onSelect(exp.id)}
                  aria-label={`Open ${exp.title}`}
                >
                  <span className="featured-number">0{index + 1}</span>
                  <span className="featured-icon"><PracticalIcon id={exp.id} /></span>
                  <span className="featured-copy">
                    <small>{exp.short}</small>
                    <strong>{exp.featuredTitle}</strong>
                    <span>{exp.skill}</span>
                  </span>
                  <span className="featured-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section course-section" id="how-it-works" aria-labelledby="course-title">
          <div className="landing-shell course-grid">
            <div className="course-copy">
              <p className="section-kicker">LEARN BY DOING</p>
              <h2 id="course-title">A route through the lab, not a pile of simulations.</h2>
              <p>
                The Learner’s Guide orders technique, analysis and exam practice.
                A milestone ticks only when you complete its real action in the lab,
                and progress stays on this device.
              </p>
              <button
                type="button"
                className="primary-cta primary-cta--compact"
                data-testid="course-open"
                onClick={onOpenGuide ?? (() => setCourseOpen(true))}
              >
                <span>Open Learner’s Guide</span>
                {courseCount > 0 && <b>{courseCount}/{COURSE_UNITS.length}</b>}
              </button>
            </div>

            <div className="course-board" aria-label="Example learner path">
              <div className="course-board__top">
                <div>
                  <small>YOUR PRACTICAL PATH</small>
                  <strong>Foundations → exam decisions</strong>
                </div>
                <span>{courseCount}/{COURSE_UNITS.length}</span>
              </div>
              <div className="course-progress-track" aria-hidden="true">
                <i style={{ width: `${Math.max(4, (courseCount / COURSE_UNITS.length) * 100)}%` }} />
              </div>
              {HOW_IT_WORKS.map((item, index) => (
                <div className="course-step" key={item.n}>
                  <span>{item.n}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                  <i className={index === 0 ? 'course-step__active' : ''} aria-hidden="true">
                    {index === 0 ? 'START' : 'NEXT'}
                  </i>
                </div>
              ))}
              <p className="course-board__note">Progress saved locally · no sign-in required</p>
            </div>
          </div>
        </section>

        <section className="landing-section device-section" id="offline" aria-labelledby="device-title">
          <div className="landing-shell device-grid">
            <div className="phone-stage" aria-hidden="true">
              <div className="phone-shell">
                <div className="phone-speaker" />
                <img src="/media/lab-mobile.webp" width="390" height="844" alt="" />
              </div>
              <span className="device-chip device-chip--touch">PINCH TO ZOOM</span>
              <span className="device-chip device-chip--offline">OFFLINE READY</span>
            </div>
            <div className="device-copy">
              <p className="section-kicker">BUILT FOR THE DEVICE YOU HAVE</p>
              <h2 id="device-title">A lab that still opens when the connection does not.</h2>
              <p>
                ChemLab is an installable web app. Once the current build has loaded and
                cached successfully, you can reopen the practicals without a live connection.
              </p>
              <ul>
                <li><span>✓</span><div><strong>Portrait or landscape</strong><small>Controls reflow around the practical, not over it.</small></div></li>
                <li><span>✓</span><div><strong>Four graphics modes</strong><small>Choose LOW through ULTRA for the device in your hand.</small></div></li>
                <li><span>✓</span><div><strong>Touch and zoom</strong><small>Pinch, wheel or use the always-visible zoom controls.</small></div></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="landing-section library-section" id="practicals" aria-labelledby="library-title">
          <div className="landing-shell">
            <div className="library-heading">
              <div>
                <p className="section-kicker">THE PRACTICAL LIBRARY</p>
                <h2 id="library-title">Choose your next experiment.</h2>
              </div>
              <div className="library-filters" aria-label="Filter practicals">
                {[
                  ['all', 'All 14'],
                  ['paper', '9701 exam skills'],
                  ['enrichment', 'Enrichment'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="experiment-grid" data-testid="experiment-library">
              {visibleExperiments.map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  data-testid={`experiment-${exp.id}`}
                  className="experiment-card"
                  onClick={() => onSelect(exp.id)}
                >
                  <span className="experiment-card__index">
                    {String(EXPERIMENTS.indexOf(exp) + 1).padStart(2, '0')}
                  </span>
                  <span className="experiment-card__icon"><PracticalIcon id={exp.id} /></span>
                  <span className="experiment-card__body">
                    <strong>{exp.title}</strong>
                    <span>{exp.desc}</span>
                    <small>{exp.papers[0]}</small>
                  </span>
                  <span className="experiment-card__arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>

            <div className="quality-panel">
              <div>
                <span className="quality-panel__label">GRAPHICS PROFILE</span>
                <strong>Match the lab to your device.</strong>
                <p>LOW is lightest; ULTRA is an opt-in mode for a capable GPU.</p>
              </div>
              <div className="quality-options" aria-label="Graphics quality">
                {[QUALITY.LOW, QUALITY.MED, QUALITY.HIGH, QUALITY.ULTRA].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    data-testid={`quality-${q}`}
                    aria-pressed={quality === q}
                    className={quality === q ? 'quality-active text-lab-accent' : ''}
                  >
                    {q.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section faq-section" id="faq" aria-labelledby="faq-title">
          <div className="landing-shell faq-grid">
            <div>
              <p className="section-kicker">QUESTIONS, ANSWERED</p>
              <h2 id="faq-title">Before you light the burner.</h2>
              <p>Clear boundaries, no small-print surprises.</p>
            </div>
            <div className="faq-list">
              {FAQS.map((item, index) => {
                const open = openFaq === index
                return (
                  <div className="faq-item" key={item.q}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`faq-answer-${index}`}
                        onClick={() => setOpenFaq(open ? null : index)}
                      >
                        <span>{item.q}</span>
                        <i aria-hidden="true">{open ? '−' : '+'}</i>
                      </button>
                    </h3>
                    <div
                      id={`faq-answer-${index}`}
                      className={`faq-answer ${open ? 'faq-answer--open' : ''}`}
                      hidden={!open}
                    >
                      <p>{item.a}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="final-cta-section" aria-labelledby="final-cta-title">
          <div className="landing-shell final-cta">
            <FlaskMark />
            <p className="section-kicker">YOUR NEXT READING STARTS HERE</p>
            <h2 id="final-cta-title">Stop watching the practical.<br />Start making the decisions.</h2>
            <button type="button" className="primary-cta" onClick={scrollToLibrary}>
              Choose a practical <ArrowIcon />
            </button>
            <small>Free · no account · progress saved on this device</small>
          </div>
        </section>
      </main>

      <footer className="site-footer" data-testid="independent-disclaimer">
        <div className="landing-shell footer-grid">
          <div>
            <a className="wordmark" href="#top">
              <FlaskMark small />
              <span>Chem<b>Lab</b></span>
            </a>
            <p>Cambridge 9701 practicals—in your browser.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#practicals">Practicals</a>
            <button type="button" onClick={onOpenMocks}>Mock papers</button>
            <a
              href="mailto:tapiwamakandigoner@gmail.com?subject=ChemLab%20feedback"
              data-testid="feedback-link"
            >
              Feedback
            </a>
          </nav>
        </div>
        <div className="landing-shell footer-legal">
          <p>
            ChemLab is an independent learning tool. Cambridge International
            is not affiliated with or responsible for this site.
          </p>
          <p>© 2026 ChemLab · Built in Zimbabwe · <a href="mailto:tapiwamakandigoner@gmail.com">Contact</a></p>
        </div>
      </footer>
    </div>
  )
}
