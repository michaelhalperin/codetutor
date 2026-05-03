import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, Eye, ExternalLink, FilePenLine, FileUp, FolderOpen, Link2, Trash2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import {
  createUtilsLink,
  deleteUtilsFile,
  deleteUtilsLink,
  downloadUtilsFile,
  getUtilsFiles,
  renameUtilsFile,
  renameUtilsLink,
  uploadUtilsFile,
} from '../lib/api'

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
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [renamingFile, setRenamingFile] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [renamingLinkId, setRenamingLinkId] = useState('')
  const [renameLinkValue, setRenameLinkValue] = useState('')
  const [deleteLoadingKey, setDeleteLoadingKey] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)

  const sortedFiles = useMemo(() => {
    const files = items.filter((row) => row.kind !== 'link')
    return files.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }, [items])

  const sortedLinks = useMemo(() => {
    const links = items.filter((row) => row.kind === 'link')
    return links.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }, [items])

  const loadItems = async () => {
    try {
      const { data } = await getUtilsFiles()
      setItems(data?.items || [])
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load files.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems()
  }, [])

  const onUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      await uploadUtilsFile(file)
      toast.success('File uploaded successfully.')
      await loadItems()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to upload file.')
    } finally {
      setUploading(false)
    }
  }

  const onAddLink = async (event) => {
    event.preventDefault()
    const url = linkUrl.trim()
    if (!url) {
      toast.error('Enter a URL.')
      return
    }
    setLinkSaving(true)
    try {
      const title = linkTitle.trim()
      await createUtilsLink(title ? { url, title } : { url })
      toast.success('Link added.')
      setLinkUrl('')
      setLinkTitle('')
      await loadItems()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to add link.')
    } finally {
      setLinkSaving(false)
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

  const onOpenLink = (href) => {
    window.open(href, '_blank', 'noopener,noreferrer')
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
    setRenamingLinkId('')
    setRenameLinkValue('')
    setRenamingFile(fileName)
    setRenameValue(fileName)
  }

  const cancelRename = () => {
    setRenamingFile('')
    setRenameValue('')
    setRenamingLinkId('')
    setRenameLinkValue('')
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
      await loadItems()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to rename file.')
    } finally {
      setRenameLoading(false)
    }
  }

  const startRenameLink = (linkId, title) => {
    setRenamingLinkId(linkId)
    setRenameLinkValue(title)
    setRenamingFile('')
    setRenameValue('')
  }

  const submitRenameLink = async (linkId) => {
    const nextTitle = renameLinkValue.trim()
    if (!nextTitle) {
      toast.error('Please enter a title.')
      return
    }
    setRenameLoading(true)
    try {
      await renameUtilsLink(linkId, { title: nextTitle })
      toast.success('Link renamed.')
      cancelRename()
      await loadItems()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to rename link.')
    } finally {
      setRenameLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const key =
      pendingDelete.kind === 'link' ? `link:${pendingDelete.linkId}` : `file:${pendingDelete.fileName}`
    setDeleteLoadingKey(key)
    try {
      if (pendingDelete.kind === 'link') {
        await deleteUtilsLink(pendingDelete.linkId)
        toast.success('Link removed.')
      } else {
        await deleteUtilsFile(pendingDelete.fileName)
        toast.success('File deleted.')
      }
      setPendingDelete(null)
      await loadItems()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete.')
    } finally {
      setDeleteLoadingKey('')
    }
  }

  const sectionShell =
    'rounded-2xl border border-slate-700/80 bg-dark-900/40 shadow-lg shadow-black/20 overflow-hidden'

  const renderFileRow = (item) => {
    const deleteKey = `file:${item.name}`
    return (
      <div
        key={item.id}
        className="bg-dark-800/80 border border-slate-700/60 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="min-w-0">
          {renamingFile === item.name ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="bg-dark-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => submitRename(item.name)}
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
              <p className="text-white font-medium truncate">{item.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {formatSize(item.size)} · {new Date(item.uploadedAt).toLocaleString()}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
          {PREVIEWABLE_EXTENSIONS.has(item.extension) && (
            <button
              type="button"
              onClick={() => onPreview(item.name)}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-900 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 transition"
            >
              <Eye size={14} />
              Preview
            </button>
          )}
          <button
            type="button"
            onClick={() => onDownload(item.name)}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-900 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 transition"
          >
            <Download size={14} />
            Download
          </button>
          {isAdmin && renamingFile !== item.name && (
            <button
              type="button"
              onClick={() => startRename(item.name)}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-900 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 transition"
            >
              <FilePenLine size={14} />
              Rename
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                setPendingDelete({ kind: 'file', fileName: item.name, label: item.name })
              }
              disabled={deleteLoadingKey === deleteKey}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700 text-red-200 hover:text-white hover:border-red-500 transition disabled:opacity-60"
            >
              <Trash2 size={14} />
              {deleteLoadingKey === deleteKey ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderLinkRow = (item) => {
    const deleteKey = `link:${item.id}`
    return (
      <div
        key={item.id}
        className="bg-dark-800/80 border border-slate-700/60 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="min-w-0">
          {renamingLinkId === item.id ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={renameLinkValue}
                onChange={(event) => setRenameLinkValue(event.target.value)}
                className="bg-dark-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500 min-w-[12rem]"
              />
              <button
                type="button"
                onClick={() => submitRenameLink(item.id)}
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
              <p className="text-white font-medium truncate">{item.title}</p>
              <p className="text-slate-400 text-xs mt-0.5 truncate" title={item.url}>
                {item.url}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                Added {new Date(item.uploadedAt).toLocaleString()}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
          <button
            type="button"
            onClick={() => onOpenLink(item.url)}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-900 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 transition"
          >
            <ExternalLink size={14} />
            Open
          </button>
          {isAdmin && renamingLinkId !== item.id && (
            <button
              type="button"
              onClick={() => startRenameLink(item.id, item.title)}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-900 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 transition"
            >
              <FilePenLine size={14} />
              Rename
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                setPendingDelete({ kind: 'link', linkId: item.id, label: item.title })
              }
              disabled={deleteLoadingKey === deleteKey}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700 text-red-200 hover:text-white hover:border-red-500 transition disabled:opacity-60"
            >
              <Trash2 size={14} />
              {deleteLoadingKey === deleteKey ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-white tracking-tight">Utils</h1>
          <p className="text-slate-400 mt-1 max-w-2xl">
            Course materials below: downloadable files first, then quick links to external sites.
          </p>
        </header>

        {loading ? (
          <div className="space-y-10 animate-pulse">
            {[0, 1].map((section) => (
              <div key={section} className={sectionShell}>
                <div className="h-16 border-b border-slate-700/60 bg-dark-800/50 px-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-700/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 bg-slate-700/50 rounded" />
                    <div className="h-3 w-48 bg-slate-700/40 rounded" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {Array.from({ length: section === 0 ? 3 : 2 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[4.25rem] rounded-xl bg-dark-800/60 border border-slate-700/40"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {/* —— Files —— */}
            <section className={sectionShell} aria-labelledby="utils-files-heading">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-700/60 bg-gradient-to-r from-dark-800/90 to-dark-900/30">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400 border border-primary-500/25">
                    <FolderOpen size={20} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h2 id="utils-files-heading" className="text-lg font-semibold text-white">
                      Files
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      txt, pdf, docx, pptx, html · {sortedFiles.length}{' '}
                      {sortedFiles.length === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <label
                    className={`inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition shrink-0 w-full sm:w-auto ${
                      uploading ? 'opacity-60 pointer-events-none' : ''
                    }`}
                  >
                    <FileUp size={16} />
                    {uploading ? 'Uploading...' : 'Upload file'}
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
              <div className="p-4 sm:p-5 space-y-2">
                {sortedFiles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-600/80 bg-dark-950/40 px-6 py-12 text-center">
                    <FolderOpen size={28} className="mx-auto text-slate-500 mb-3" strokeWidth={1.5} />
                    <p className="text-slate-300 font-medium">No files yet</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {isAdmin ? 'Use Upload file to add materials.' : 'An admin can add files here.'}
                    </p>
                  </div>
                ) : (
                  sortedFiles.map(renderFileRow)
                )}
              </div>
            </section>

            {/* —— Links —— */}
            <section className={sectionShell} aria-labelledby="utils-links-heading">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-700/60 bg-gradient-to-r from-slate-800/80 to-dark-900/30">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Link2 size={20} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h2 id="utils-links-heading" className="text-lg font-semibold text-white">
                      Links
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      External URLs · {sortedLinks.length}{' '}
                      {sortedLinks.length === 1 ? 'link' : 'links'}
                    </p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="px-4 sm:px-5 pt-4 pb-2 border-b border-slate-700/40 bg-dark-950/20">
                  <form
                    onSubmit={onAddLink}
                    className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3"
                  >
                    <div className="flex-1 min-w-[12rem] space-y-1.5">
                      <label htmlFor="utils-link-url" className="text-xs font-medium text-slate-400">
                        URL
                      </label>
                      <input
                        id="utils-link-url"
                        type="url"
                        inputMode="url"
                        placeholder="https://…"
                        value={linkUrl}
                        onChange={(event) => setLinkUrl(event.target.value)}
                        className="w-full bg-dark-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="flex-1 min-w-[10rem] space-y-1.5">
                      <label htmlFor="utils-link-title" className="text-xs font-medium text-slate-400">
                        Label <span className="text-slate-500 font-normal">(optional)</span>
                      </label>
                      <input
                        id="utils-link-title"
                        type="text"
                        placeholder="e.g. Course syllabus"
                        value={linkTitle}
                        onChange={(event) => setLinkTitle(event.target.value)}
                        className="w-full bg-dark-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={linkSaving}
                      className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-60 transition lg:shrink-0"
                    >
                      {linkSaving ? 'Saving…' : 'Add link'}
                    </button>
                  </form>
                </div>
              )}

              <div className="p-4 sm:p-5 space-y-2">
                {sortedLinks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-600/80 bg-dark-950/40 px-6 py-12 text-center">
                    <Link2 size={28} className="mx-auto text-slate-500 mb-3" strokeWidth={1.5} />
                    <p className="text-slate-300 font-medium">No links yet</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {isAdmin ? 'Add a URL above to list it for students.' : 'An admin can add links here.'}
                    </p>
                  </div>
                ) : (
                  sortedLinks.map(renderLinkRow)
                )}
              </div>
            </section>
          </div>
        )}
      </div>
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white text-lg font-semibold">Confirm delete</h3>
            <p className="text-slate-300 text-sm mt-2 break-words">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{pendingDelete.label}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={
                  deleteLoadingKey ===
                  (pendingDelete.kind === 'link'
                    ? `link:${pendingDelete.linkId}`
                    : `file:${pendingDelete.fileName}`)
                }
                className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={
                  deleteLoadingKey ===
                  (pendingDelete.kind === 'link'
                    ? `link:${pendingDelete.linkId}`
                    : `file:${pendingDelete.fileName}`)
                }
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              >
                {deleteLoadingKey ===
                (pendingDelete.kind === 'link'
                  ? `link:${pendingDelete.linkId}`
                  : `file:${pendingDelete.fileName}`)
                  ? 'Deleting...'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
