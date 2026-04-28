import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, Eye, FilePenLine, FileUp, FolderOpen, Trash2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { deleteUtilsFile, downloadUtilsFile, getUtilsFiles, renameUtilsFile, uploadUtilsFile } from '../lib/api'

const ACCEPTED_TYPES = '.txt,.pdf,.docx,.pptx,.html'
const PREVIEWABLE_EXTENSIONS = new Set(['txt', 'pdf', 'html'])

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Utils() {
  const { isAdmin } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [renamingFile, setRenamingFile] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [deleteLoadingName, setDeleteLoadingName] = useState('')
  const [pendingDeleteFile, setPendingDeleteFile] = useState('')

  const sortedFiles = useMemo(
    () =>
      [...files].sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      ),
    [files]
  )

  const loadFiles = async () => {
    try {
      const { data } = await getUtilsFiles()
      setFiles(data?.items || [])
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load files.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFiles()
  }, [])

  const onUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      await uploadUtilsFile(file)
      toast.success('File uploaded successfully.')
      await loadFiles()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to upload file.')
    } finally {
      setUploading(false)
    }
  }

  const onDownload = async (fileName) => {
    try {
      const blob = await downloadUtilsFile(fileName)
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to download file.')
    }
  }

  const onPreview = async (fileName) => {
    const previewUrl = `/utils/preview?file=${encodeURIComponent(fileName)}`
    const previewLink = document.createElement('a')
    previewLink.href = previewUrl
    previewLink.target = '_blank'
    previewLink.rel = 'noopener'
    document.body.appendChild(previewLink)
    previewLink.click()
    previewLink.remove()
  }

  const startRename = (fileName) => {
    setRenamingFile(fileName)
    setRenameValue(fileName)
  }

  const cancelRename = () => {
    setRenamingFile('')
    setRenameValue('')
  }

  const submitRename = async (currentName) => {
    const nextName = renameValue.trim()
    if (!nextName) {
      toast.error('Please enter a valid file name.')
      return
    }
    setRenameLoading(true)
    try {
      await renameUtilsFile(currentName, nextName)
      toast.success('File renamed successfully.')
      cancelRename()
      await loadFiles()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to rename file.')
    } finally {
      setRenameLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDeleteFile) return
    const fileName = pendingDeleteFile
    setDeleteLoadingName(fileName)
    try {
      await deleteUtilsFile(fileName)
      toast.success('File deleted.')
      setPendingDeleteFile('')
      await loadFiles()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete file.')
    } finally {
      setDeleteLoadingName('')
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Utils</h1>
            <p className="text-slate-400 mt-1">
              Shared files for students: txt, pdf, docx, pptx and html.
            </p>
          </div>
          {isAdmin && (
            <label className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition disabled:opacity-60">
              <FileUp size={16} />
              {uploading ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={onUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="bg-dark-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-56 max-w-full bg-slate-700/60 rounded" />
                  <div className="h-3 w-36 bg-slate-700/50 rounded mt-2" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-8 w-20 bg-slate-700/60 rounded-lg" />
                  <div className="h-8 w-24 bg-slate-700/60 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="bg-dark-800 rounded-xl border border-slate-700 p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-dark-900 border border-slate-700 flex items-center justify-center mb-4">
              <FolderOpen size={22} className="text-slate-400" />
            </div>
            <p className="text-white font-medium">No files uploaded yet.</p>
            <p className="text-slate-400 text-sm mt-1">
              {isAdmin ? 'Upload the first file for your students.' : 'Ask an admin to upload files.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-dark-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  {renamingFile === file.name ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        className="bg-dark-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => submitRename(file.name)}
                        disabled={renameLoading}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white"
                      >
                        {renameLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        disabled={renameLoading}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-white font-medium truncate">{file.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {formatSize(file.size)} · {new Date(file.uploadedAt).toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {PREVIEWABLE_EXTENSIONS.has(file.extension) && (
                    <button
                      type="button"
                      onClick={() => onPreview(file.name)}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-900 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 transition"
                    >
                      <Eye size={14} />
                      Preview
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDownload(file.name)}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-900 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 transition"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  {isAdmin && renamingFile !== file.name && (
                    <button
                      type="button"
                      onClick={() => startRename(file.name)}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-900 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 transition"
                    >
                      <FilePenLine size={14} />
                      Rename
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteFile(file.name)}
                      disabled={deleteLoadingName === file.name}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700 text-red-200 hover:text-white hover:border-red-500 transition disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                      {deleteLoadingName === file.name ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {pendingDeleteFile && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white text-lg font-semibold">Confirm delete</h3>
            <p className="text-slate-300 text-sm mt-2 break-words">
              Are you sure you want to delete <span className="font-semibold">{pendingDeleteFile}</span>?
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteFile('')}
                disabled={deleteLoadingName === pendingDeleteFile}
                className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoadingName === pendingDeleteFile}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              >
                {deleteLoadingName === pendingDeleteFile ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
