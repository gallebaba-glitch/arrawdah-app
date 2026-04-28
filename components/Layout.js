import { useRouter } from 'next/router'
import Link from 'next/link'

const NAV = [
  { href: '/',           icon: '📊', label: 'Dashboard' },
  { href: '/pelerins',   icon: '🕋', label: 'Pèlerins' },
  { href: '/departs',    icon: '✈️', label: 'Départs' },
  { href: '/finances',   icon: '💰', label: 'Finances' },
  { href: '/documents',  icon: '📋', label: 'Documents' },
]

export default function Layout({ children, title = '', action }) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen">

      {/* SIDEBAR */}
      <aside className="w-56 fixed top-0 left-0 bottom-0 z-50 flex flex-col" style={{ background: '#0F5229' }}>

        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
               style={{ background: '#C9A84C', color: '#0F5229' }}>R</div>
          <div>
            <div className="text-white text-xs font-bold leading-tight">Ar Rawdah<br/>Travel Tour</div>
            <div className="text-xs mt-0.5" style={{ color: '#F0D080' }}>Rawda Sherif SARL</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => {
            const active = router.pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active
                    ? 'text-brand-dark font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                style={active ? { background: '#C9A84C' } : {}}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                 style={{ background: '#C9A84C', color: '#0F5229' }}>HM</div>
            <div>
              <div className="text-white text-xs font-semibold">Hajja Mamy Fall</div>
              <div className="text-xs" style={{ color: '#F0D080' }}>PDG</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ml-56 flex-1">

        {/* Topbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <h1 className="text-lg font-bold text-gray-800">{title}</h1>
          </div>
          {action && (
            <button onClick={action.fn} className="btn btn-primary text-sm">
              {action.label}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
