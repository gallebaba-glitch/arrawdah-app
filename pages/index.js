import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPelerins: 0, enAttente: 0, totalDeparts: 0,
    totalPaye: 0, totalDu: 0, docsManquants: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    try {
      const [{ data: pelerins }, { data: departs }] = await Promise.all([
        supabase.from('pelerins').select('*'),
        supabase.from('departs').select('*'),
      ])
      const p = pelerins || []
      const d = departs || []
      const totalPaye = p.reduce((s, x) => s + (x.montant_paye || 0), 0)
      const totalDu   = p.reduce((s, x) => s + (x.prix_total || 0), 0)
      const docsManquants = p.reduce((s, x) =>
        s + [x.doc_passeport, x.doc_photo, x.doc_vaccin, x.doc_visa, x.doc_billet].filter(v => !v).length, 0)
      setStats({
        totalPelerins: p.length,
        enAttente: p.filter(x => x.statut === 'inscrit').length,
        totalDeparts: d.length,
        totalPaye, totalDu, docsManquants,
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const taux = stats.totalDu > 0 ? Math.round((stats.totalPaye / stats.totalDu) * 100) : 0
  const restant = stats.totalDu - stats.totalPaye

  const KPI = [
    { label: 'Total pèlerins',   val: stats.totalPelerins, color: '#0F5229', icon: '🕋', href: '/pelerins' },
    { label: 'En attente',       val: stats.enAttente,     color: '#ED8936', icon: '⏳', href: '/pelerins' },
    { label: 'Départs',          val: stats.totalDeparts,  color: '#3B82F6', icon: '✈️', href: '/departs' },
    { label: 'Docs manquants',   val: stats.docsManquants, color: '#E53E3E', icon: '📋', href: '/documents' },
  ]

  const ACTIONS = [
    { label: '+ Nouveau pèlerin', href: '/pelerins', icon: '🕋', sub: 'Créer un dossier' },
    { label: '+ Nouveau départ',  href: '/departs',  icon: '✈️', sub: 'Planifier un groupe' },
    { label: 'Voir les finances', href: '/finances', icon: '💰', sub: 'Paiements & encaissement' },
    { label: 'Voir les documents',href: '/documents',icon: '📋', sub: 'Dossiers incomplets' },
  ]

  return (
    <Layout title="Tableau de bord">

      {/* Welcome */}
      <div className="rounded-xl p-6 mb-6 flex items-center justify-between"
           style={{ background: 'linear-gradient(135deg, #0F5229, #1A7A3C)' }}>
        <div>
          <h2 className="text-white text-xl font-bold mb-1">Bonjour, Hajja Mamy Fall 🤲</h2>
          <p style={{ color: '#F0D080' }} className="text-sm">
            Ar Rawdah Travel Tour — {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold" style={{ color: '#C9A84C' }}>{stats.totalPelerins}</div>
          <div className="text-white/70 text-sm">pèlerins accompagnés</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {KPI.map(k => (
          <Link key={k.label} href={k.href}
            className="card p-5 hover:shadow-md transition-shadow cursor-pointer block">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{k.icon}</span>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: k.color }}>
              {loading ? '…' : k.val}
            </div>
            <div className="text-xs text-gray-500 font-medium">{k.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">

        {/* Finances rapides */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-800 mb-4">💰 Finances</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total encaissé</span>
              <span className="font-bold text-green-700">{stats.totalPaye.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reste à encaisser</span>
              <span className="font-bold text-red-600">{restant.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total attendu</span>
              <span className="font-semibold">{stats.totalDu.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Taux d'encaissement</span>
                <span className="font-bold text-green-700">{taux}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                     style={{ width: taux + '%', background: '#1A7A3C' }}/>
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-800 mb-4">⚡ Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map(a => (
              <Link key={a.label} href={a.href}
                className="flex flex-col items-center p-3 rounded-lg border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all cursor-pointer text-center">
                <span className="text-2xl mb-1">{a.icon}</span>
                <span className="text-xs font-semibold text-gray-700">{a.sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
