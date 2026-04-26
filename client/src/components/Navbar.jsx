import { Link, NavLink } from 'react-router-dom'
import { Code2, LayoutDashboard, BookOpen, History, Menu, X, Settings, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAdmin } = useAuth()

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg transition text-sm font-medium ${
      isActive
        ? 'text-white bg-primary-600/20 border border-primary-500/40'
        : 'text-slate-300 hover:text-white hover:bg-slate-700'
    }`

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2.5 rounded-lg transition text-sm ${
      isActive
        ? 'text-white bg-primary-600/20 border border-primary-500/40'
        : 'text-slate-300 hover:text-white hover:bg-slate-700'
    }`

  return (
    <nav className="bg-dark-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-700 transition">
            <Code2 size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">CodeTutor</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          <NavLink to="/dashboard" className={navLinkClass}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink to="/topics" className={navLinkClass}>
            <BookOpen size={16} />
            Practice
          </NavLink>
          <NavLink to="/sessions" className={navLinkClass}>
            <History size={16} />
            Sessions
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            <Settings size={16} />
            Profile
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/analytics" className={navLinkClass}>
              <ShieldCheck size={16} />
              Analytics
            </NavLink>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden text-slate-300 hover:text-white p-1"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-700 bg-dark-800 px-4 py-3 flex flex-col gap-1">
          <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className={mobileNavLinkClass}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/topics" onClick={() => setMenuOpen(false)} className={mobileNavLinkClass}>
            <BookOpen size={16} /> Practice
          </NavLink>
          <NavLink to="/sessions" onClick={() => setMenuOpen(false)} className={mobileNavLinkClass}>
            <History size={16} /> Sessions
          </NavLink>
          <NavLink to="/profile" onClick={() => setMenuOpen(false)} className={mobileNavLinkClass}>
            <Settings size={16} /> Profile
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/analytics" onClick={() => setMenuOpen(false)} className={mobileNavLinkClass}>
              <ShieldCheck size={16} /> Analytics
            </NavLink>
          )}
        </div>
      )}
    </nav>
  )
}
