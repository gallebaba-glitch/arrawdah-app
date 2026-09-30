import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './useAuth'

const NAV = [
  { href: '/',            icon: '🏠', label: 'Tableau de bord', adminOnly: false },
  { href: '/pelerins',    icon: '👥', label: 'Pèlerins',        adminOnly: false },
  { href: '/pipeline',    icon: '🎯', label: 'Prospects',       adminOnly: false },
  { href: '/departs',     icon: '✈️', label: 'Départs',         adminOnly: false },
  { href: '/finances',    icon: '💰', label: 'Finances',        adminOnly: true  },
  { href: '/documents',   icon: '📄', label: 'Documents',       adminOnly: false },
]

// Composant de lien de navigation
function NavLink({ href, icon, label, active, onClick }) {
  return (
    <a
      href={href}
      onClick={e => { e.preventDefault(); onClick(); window.location.href = href }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
      style={active ? { background: 'rgba(255,255,255,0.15)' } : {}}>
      <span>{icon}</span>
      <span>{label}</span>
    </a>
  )
}

export default function Layout({ children, title, action }) {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Redirection si non connecté
  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        router.push('/login')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FFF4' }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🕌</div>
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Prénom uniquement pour le bonjour
  const prenom = user.nom ? user.nom.split(' ')[0] : ''

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-30 w-64 flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `} style={{ background: '#0F5229' }}>

        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="text-white font-bold text-lg">🕌 Ar Rawdah</div>
          <div className="text-white/60 text-xs mt-0.5">Travel Tour</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV.filter(item => !item.adminOnly || user?.role === 'admin').map(item => {
            const active = router.pathname === item.href
            return (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={active}
                onClick={() => setSidebarOpen(false)}
              />
            )
          })}
        </nav>

        {/* Profil utilisateur */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: '#C9A84C', color: '#0F5229' }}>
              {user.nom ? user.nom[0].toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{user.nom}</div>
              <div className="text-white/50 text-xs truncate">{user.role === 'admin' ? 'Administrateur' : 'Chargée clientèle'}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
            🚪 Se déconnecter
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10"
          style={{ borderColor: '#E5EDE8' }}>
          <div className="flex items-center gap-3">
            {/* Hamburger mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              ☰
            </button>
            <div>
              <div className="font-bold text-gray-800">{title}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bonjour personnalisé */}
            <div className="hidden sm:block text-sm text-gray-500">
              Bonjour, <span className="font-semibold" style={{ color: '#0F5229' }}>{user.nom}</span> 👋
            </div>

            {/* Bouton action */}
            {action && (
              <button
                onClick={action.fn}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#0F5229' }}>
                {action.label}
              </button>
            )}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-6">
          {/* Bonjour mobile */}
          <div className="sm:hidden mb-4 px-1">
            <p className="text-sm text-gray-500">
              Bonjour, <span className="font-semibold" style={{ color: '#0F5229' }}>{user.nom}</span> 👋
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
