import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState } from 'react'
import Head from 'next/head'

const NAV = [
  { href: '/',          icon: '📊', label: 'Dashboard' },
  { href: '/pelerins',  icon: '🕋', label: 'Pèlerins' },
  { href: '/departs',   icon: '✈️', label: 'Départs' },
  { href: '/finances',  icon: '💰', label: 'Finances' },
  { href: '/documents', icon: '📋', label: 'Documents' },
  { href: '/alertes',   icon: '🔔', label: 'Alertes' },
]

export default function Layout({ children, title = '', action }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <Head>
        <title>{title ? title + ' — Ar Rawdah' : 'Ar Rawdah Travel Tour'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0F5229" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <div className="flex min-h-screen" style={{ background: '#F7F9F7' }}>

        {/* Overlay mobile */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col w-60 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ background: '#0F5229' }}
        >

          {/* LOGO */}
          <div
            className="p-4 border-b flex justify-center"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <img
                src="/logo-ar-rawdah.png"
                alt="Ar Rawdah"
                className="h-40 w-auto object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </Link>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV.map((item) => {
              const active = router.pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all hover:bg-white/10"
                  style={
                    active
                      ? { background: '#C9A84C', color: '#0F5229', fontWeight: '600' }
                      : { color: 'rgba(255,255,255,0.8)' }
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* FOOTER */}
          <div
            className="p-4 border-t text-center"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="text-white text-xs font-semibold tracking-wide">
              Ar Rawdah As'Sherif SARL
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col min-w-0">

          {/* HEADER */}
          <div
            className="bg-white/95 backdrop-blur border-b px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
            style={{ borderColor: '#E5EDE8' }}
          >
            <div className="flex items-center gap-3">

              {/* MENU BUTTON MOBILE */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 rounded-lg"
                style={{ background: '#F7F9F7' }}
              >
                <div style={{ width: '20px', height: '2px', background: '#374151', marginBottom: '4px' }}></div>
                <div style={{ width: '20px', height: '2px', background: '#374151', marginBottom: '4px' }}></div>
                <div style={{ width: '20px', height: '2px', background: '#374151' }}></div>
              </button>

              {/* TITLE */}
              <h1 className="text-base lg:text-lg font-bold text-gray-800 truncate">
                {title}
              </h1>
            </div>

            {/* ACTION BUTTON */}
            {action && (
              <button
                onClick={action.fn}
                className="flex-shrink-0 px-3 lg:px-5 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ background: '#0F5229' }}
              >
                {action.label}
              </button>
            )}
          </div>

          {/* CONTENT */}
          <div className="flex-1 p-4 lg:p-6">
            {children}
          </div>

        </main>
      </div>
    </>
  )
}
