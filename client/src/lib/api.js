import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})
// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// ---- Questions ----
// Fetch next batch of questions from the question bank
export const fetchQuestions = (topic, difficulty, count = 5, sessionId) =>
  api.post('/api/questions/next', { topic, difficulty, count, sessionId })

// Evaluate all answers at once at session end (server-side local checks)
export const evaluateSession = (answers) =>
  api.post('/api/questions/evaluate-session', { answers })

// ---- Sessions ----
export const createSession = (topic, difficulty) =>
  api.post('/api/sessions', { topic, difficulty })

export const completeSession = (sessionId, stats) =>
  api.patch(`/api/sessions/${sessionId}/complete`, stats)

export const getSessions = () =>
  api.get('/api/sessions')

export const getSessionResume = (sessionId) =>
  api.get(`/api/sessions/${sessionId}/resume`)

export const getSessionResults = (sessionId) =>
  api.get(`/api/sessions/${sessionId}/results`)

export const deleteSession = (sessionId) =>
  api.delete(`/api/sessions/${sessionId}`)

export const deleteAccountRequest = () =>
  api.delete('/api/account')

// ---- Dashboard ----
export const getDashboard = () =>
  api.get('/api/dashboard')

// ---- Admin ----
export const getAdminAnalytics = () =>
  api.get('/api/admin/analytics')

export const getQuestionBank = () =>
  api.get('/api/admin/question-bank')

export const updateQuestionBankItem = (id, payload) =>
  api.patch(`/api/admin/question-bank/${id}`, payload)

export const getUtilsFiles = () =>
  api.get('/api/utils/files')

export const uploadUtilsFile = (file) => {
  const data = new FormData()
  data.append('file', file)
  return api.post('/api/utils/files', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getUtilsFileDownloadUrl = (fileName) => {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const normalizedBase = apiBase.replace(/\/$/, '')
  return `${normalizedBase}/api/utils/files/${encodeURIComponent(fileName)}/download`
}

export const downloadUtilsFile = async (fileName) => {
  const url = `/api/utils/files/${encodeURIComponent(fileName)}/download`
  const response = await api.get(url, { responseType: 'blob' })
  return response.data
}

export const renameUtilsFile = (currentName, nextName) =>
  api.patch(`/api/utils/files/${encodeURIComponent(currentName)}`, { name: nextName })

export const deleteUtilsFile = (fileName) =>
  api.delete(`/api/utils/files/${encodeURIComponent(fileName)}`)

export default api
