import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Download } from 'lucide-react'
import { downloadUtilsFile } from '../lib/api'

function getExtension(fileName) {
  return (fileName?.split('.').pop() || '').toLowerCase()
}

export default function UtilsPreview() {
  const [searchParams] = useSearchParams()
  const fileName = searchParams.get('file') || ''
  const extension = getExtension(fileName)
  const [loading, setLoading] = useState(true)
  const [textContent, setTextContent] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [objectUrl, setObjectUrl] = useState('')

  const isPreviewable = useMemo(
    () => Boolean(fileName) && ['txt', 'pdf', 'html'].includes(extension),
    [fileName, extension]
  )

  useEffect(() => {
    let nextObjectUrl = ''
    const load = async () => {
      if (!fileName || !isPreviewable) {
        setLoading(false)
        return
      }

      try {
        const blob = await downloadUtilsFile(fileName)
        if (extension === 'txt') {
          const content = await blob.text()
          setTextContent(content)
        } else if (extension === 'html') {
          const content = await blob.text()
          setHtmlContent(content)
        } else if (extension === 'pdf') {
          nextObjectUrl = window.URL.createObjectURL(
            new Blob([blob], { type: 'application/pdf' })
          )
          setObjectUrl(nextObjectUrl)
        }
      } catch (error) {
        toast.error(error?.response?.data?.error || 'Failed to load preview.')
      } finally {
        setLoading(false)
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return () => {
      if (nextObjectUrl) window.URL.revokeObjectURL(nextObjectUrl)
    }
  }, [extension, fileName, isPreviewable])

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to="/utils"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Utils
          </Link>
          <div className="text-sm text-slate-400 truncate">{fileName || 'No file selected'}</div>
        </div>

        <div className="bg-dark-800 border border-slate-700 rounded-xl p-4 min-h-[70vh]">
          {loading ? (
            <p className="text-slate-300">Loading preview...</p>
          ) : !isPreviewable ? (
            <div className="space-y-3">
              <p className="text-slate-300">
                This file type is download-only. Preview is available for txt, pdf and html.
              </p>
              <Link
                to="/utils"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-lg"
              >
                <Download size={14} />
                Go back and download
              </Link>
            </div>
          ) : extension === 'txt' ? (
            <pre className="whitespace-pre-wrap break-words text-slate-100 text-sm">{textContent}</pre>
          ) : extension === 'html' ? (
            <iframe
              title="HTML preview"
              className="w-full h-[70vh] rounded-lg bg-white"
              sandbox="allow-same-origin"
              srcDoc={htmlContent}
            />
          ) : (
            <iframe title="PDF preview" className="w-full h-[70vh] rounded-lg" src={objectUrl} />
          )}
        </div>
      </div>
    </div>
  )
}
