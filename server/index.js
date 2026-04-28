import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import questionsRouter from './routes/questions.js'
import sessionsRouter from './routes/sessions.js'
import dashboardRouter from './routes/dashboard.js'
import adminRouter from './routes/admin.js'
import accountRouter from './routes/account.js'
import utilsRouter from './routes/utils.js'
import { authenticate } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 3001

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5175',
]
const envAllowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])]
const allowedOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/,
]

// ---- Middleware ----
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (curl/postman/server-to-server).
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
      return callback(null, true)
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
}))
app.use(express.json())

// ---- Auth middleware on all /api routes ----
app.use('/api', authenticate)

// ---- Routes ----
app.use('/api/questions', questionsRouter)
app.use('/api/sessions',  sessionsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/admin',     adminRouter)
app.use('/api/account',   accountRouter)
app.use('/api/utils',     utilsRouter)

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Coding Tutor server running on http://localhost:${PORT}`)
})
