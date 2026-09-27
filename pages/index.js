import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/useAuth'
import Link from 'next/link'

export default function Dashboard() {
  const { user } = useAuth()
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
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const fmt = (n) => n.toLocaleString('fr-FR')
  const taux = stats.totalDu > 0 ? Math.round((stats.totalPaye / stats.totalDu) * 100) : 0
  const prenom = user?.nom || ''

  return (
    <Layout title="Tableau de bord">
      <div className="space-y-6">

        {/* Bannière bonjour */}
        <div className="rounded-2xl p-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0F5229 0%, #1A7A3C 100%)' }}>
          <div>
            <h2 className="text-white text-xl font-bold">
              Bonjour, {prenom} 👋
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#C9A84C' }}>
              Ar Rawdah Travel Tour — {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold" style={{ color: '#C9A84C' }}>
              {loading ? '...' : fmt(stats.totalPelerins)}
            </div>
            <div className="text-white/70 text-sm">pèlerins accompagnés</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon:'🕋', label:'Total pèlerins',   val: loading ? '...' : fmt(stats.totalPelerins), color:'#0F5229' },
            { icon:'⏳', label:'En attente',        val: loading ? '...' : fmt(stats.enAttente),     color:'#D97706' },
            { icon:'✈️', label:'Départs',           val: loading ? '...' : fmt(stats.totalDeparts),  color:'#2563EB' },
            { icon:'📋', label:'Docs manquants',    val: loading ? '...' : fmt(stats.docsManquants), color:'#DC2626' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border" style={{ borderColor:'#E5EDE8' }}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Finances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor:'#E5EDE8' }}>
            <h3 className="font-bold text-gray-700 mb-4">💰 Finances</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total encaissé</span>
                <span className="font-bold" style={{ color:'#0F5229' }}>{loading ? '...' : fmt(stats.totalPaye)} FCFA</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Reste à encaisser</span>
                <span className="font-bold text-red-500">{loading ? '...' : fmt(stats.totalDu - stats.totalPaye)} FCFA</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total attendu</span>
                <span className="font-bold text-gray-700">{loading ? '...' : fmt(stats.totalDu)} FCFA</span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Taux d'encaissement</span>
                  <span className="font-semibold" style={{ color:'#0F5229' }}>{taux}%</span>
                </div>
                <div className="h-2 rounded-full" style={{ background:'#E5EDE8' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: taux+'%', background:'#0F5229' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor:'#E5EDE8' }}>
            <h3 className="font-bold text-gray-700 mb-4">⚡ Actions rapides</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href:'/pelerins', icon:'🕋', label:'Créer un dossier' },
                { href:'/departs',  icon:'✈️', label:'Planifier un groupe' },
                { href:'/finances', icon:'💰', label:'Paiements & encaissement' },
                { href:'/pelerins?filter=incomplete', icon:'📋', label:'Dossiers incomplets' },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className="flex flex-col items-center justify-center p-4 rounded-xl text-center transition-all hover:shadow-md cursor-pointer"
                  style={{ background:'#F0FFF4', border:'1px solid #E5EDE8' }}>
                  <span className="text-2xl mb-1">{a.icon}</span>
                  <span className="text-xs text-gray-600 font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
