import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { parseRoute } from './lib/routes.js'
import './index.css'

if (parseRoute().kind === 'not-found') {
  document.title = 'Page not found — ChemLab ZW'
  let robots = document.querySelector('meta[name="robots"]')
  if (!robots) {
    robots = document.createElement('meta')
    robots.name = 'robots'
    document.head.appendChild(robots)
  }
  robots.content = 'noindex, nofollow'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
