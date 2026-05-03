import { Router } from 'express'
import multer from 'multer'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadDir = path.join(__dirname, '..', 'uploads', 'utils')
const ALLOWED_EXTENSIONS = new Set(['.txt', '.pdf', '.docx', '.pptx', '.html'])

await fs.mkdir(uploadDir, { recursive: true })

/** Keep Unicode letters/numbers (e.g. Hebrew); strip controls and path/reserved chars. */
function safeBaseName(fileName) {
  const s = String(fileName)
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/[^\p{L}\p{M}\p{N}._\- ]/gu, '_')
    .replace(/ +/g, ' ')
    .trim()
  if (!s || /^\.+$/.test(s)) return 'file'
  return s
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const rawName = path.basename(file.originalname || 'file', ext)
    const safeName = safeBaseName(rawName).slice(0, 80) || 'file'
    cb(null, `${Date.now()}-${safeName}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error('Only txt, pdf, docx, pptx and html files are allowed.'))
      return
    }
    cb(null, true)
  },
})

router.get('/files', async (_req, res) => {
  try {
    const entries = await fs.readdir(uploadDir, { withFileTypes: true })
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const fullPath = path.join(uploadDir, entry.name)
          const stat = await fs.stat(fullPath)
          const ext = path.extname(entry.name).toLowerCase()
          return {
            id: entry.name,
            name: entry.name,
            extension: ext.replace('.', ''),
            size: stat.size,
            uploadedAt: stat.birthtime.toISOString(),
            downloadUrl: `/api/utils/files/${encodeURIComponent(entry.name)}/download`,
          }
        })
    )
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    return res.json({ items: files })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load files.' })
  }
})

router.post('/files', (req, res) => {
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ error: 'Admin role required.' })
  }
  return upload.single('file')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || 'Upload failed.' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File is required.' })
    }
    return res.status(201).json({
      item: {
        id: req.file.filename,
        name: req.file.filename,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        downloadUrl: `/api/utils/files/${encodeURIComponent(req.file.filename)}/download`,
      },
    })
  })
})

router.patch('/files/:name', async (req, res) => {
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ error: 'Admin role required.' })
  }

  const currentName = path.basename(req.params.name || '')
  const requestedName = String(req.body?.name || '').trim()
  if (!currentName || !requestedName) {
    return res.status(400).json({ error: 'Current and new file names are required.' })
  }

  const currentExt = path.extname(currentName).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(currentExt)) {
    return res.status(400).json({ error: 'Invalid current file type.' })
  }

  let nextName = path.basename(requestedName)
  const nextExt = path.extname(nextName).toLowerCase()
  if (!nextExt) {
    const rawBase = path.basename(nextName, path.extname(nextName))
    nextName = `${rawBase}${currentExt}`
  }

  const finalExt = path.extname(nextName).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(finalExt)) {
    return res.status(400).json({ error: 'Only txt, pdf, docx, pptx and html files are allowed.' })
  }

  const safeBase = safeBaseName(path.basename(nextName, finalExt)).slice(0, 80) || 'file'
  const safeNextName = `${safeBase}${finalExt}`

  const currentPath = path.join(uploadDir, currentName)
  const nextPath = path.join(uploadDir, safeNextName)
  try {
    await fs.access(currentPath)
    if (currentName !== safeNextName) {
      try {
        await fs.access(nextPath)
        return res.status(409).json({ error: 'A file with this name already exists.' })
      } catch {
        // destination does not exist, expected
      }
      await fs.rename(currentPath, nextPath)
    }
    const stat = await fs.stat(nextPath)
    return res.json({
      item: {
        id: safeNextName,
        name: safeNextName,
        extension: finalExt.replace('.', ''),
        size: stat.size,
        uploadedAt: stat.birthtime.toISOString(),
        downloadUrl: `/api/utils/files/${encodeURIComponent(safeNextName)}/download`,
      },
    })
  } catch {
    return res.status(404).json({ error: 'File not found.' })
  }
})

router.delete('/files/:name', async (req, res) => {
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ error: 'Admin role required.' })
  }
  const safeName = path.basename(req.params.name || '')
  if (!safeName) return res.status(400).json({ error: 'Invalid file name.' })
  const fullPath = path.join(uploadDir, safeName)
  try {
    await fs.unlink(fullPath)
    return res.status(204).send()
  } catch {
    return res.status(404).json({ error: 'File not found.' })
  }
})

router.get('/files/:name/download', async (req, res) => {
  const safeName = path.basename(req.params.name || '')
  if (!safeName) return res.status(400).json({ error: 'Invalid file name.' })
  const fullPath = path.join(uploadDir, safeName)
  try {
    await fs.access(fullPath)
    return res.download(fullPath)
  } catch {
    return res.status(404).json({ error: 'File not found.' })
  }
})

export default router
