import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const rootEl = document.getElementById('root')

if (!rootEl) {
  throw new Error('Root element #root was not found in index.html')
}

async function bootstrap() {
  try {
    const { default: App } = await import('./App.jsx')
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (err) {
    console.error('App bootstrap failed:', err)
    rootEl.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#e2e8f0;font-family:Inter,Arial,sans-serif;padding:24px;">
        <div style="max-width:700px;width:100%;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;">Application failed to load</h1>
          <p style="margin:0 0 10px 0;color:#94a3b8;">Open browser DevTools Console and share the first red error line.</p>
          <pre style="margin:0;background:#020617;border:1px solid #1e293b;border-radius:8px;padding:12px;white-space:pre-wrap;word-break:break-word;color:#fca5a5;">${String(err?.stack || err?.message || err)}</pre>
        </div>
      </div>
    `
  }
}

bootstrap()
