import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

import questionsRouter from './routes/questions.js'
import sessionsRouter from './routes/sessions.js'
import dashboardRouter from './routes/dashboard.js'
import adminRouter from './routes/admin.js'
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

// ---- Middleware ----
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (curl/postman/server-to-server).
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
}))
app.use(express.json())

// General API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please slow down.' },
})
app.use('/api', limiter)

// Questions endpoint stricter limit
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many AI requests, please wait a moment.' },
})
app.use('/api/questions', aiLimiter)

// ---- Auth middleware on all /api routes ----
app.use('/api', authenticate)

// ---- Routes ----
app.use('/api/questions', questionsRouter)
app.use('/api/sessions',  sessionsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/admin',     adminRouter)

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
