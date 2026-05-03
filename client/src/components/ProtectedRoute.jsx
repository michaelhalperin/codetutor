import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MustChangePasswordModal from './MustChangePasswordModal'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin, adminLoading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && adminLoading) {
    return (
      <>
        {children}
        <MustChangePasswordModal />
      </>
    )
  }
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />
  return (
    <>
      {children}
      <MustChangePasswordModal />
    </>
  )
}
