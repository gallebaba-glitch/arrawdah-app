import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const DOCS = [
  { key: 'doc_passeport', label: 'Passeport',        icon: '🪪' },
  { key: 'doc_photo',     label: 'Photo identité',   icon: '📷' },
  { key: 'doc_vaccin',    label: 'Vaccin méningite', icon: '💉' },
  { key: 'doc_visa',      label: 'Visa Oumrah',      icon: '📋' },
  { key: 'doc_billet',    label: 'Billet avion',     icon: '✈️' },
]

export default function Documents() {
  const [pelerins, setPelerins] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('tous')
  const [updating, setUpdating] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('pelerins')
      .select('id, prenom, nom, doc_passeport, doc_photo, doc_vaccin, doc_visa, doc_billet')
      .order('created_at', { ascending: false })
    setPelerins(data || [])
    setLoading(false)
  }

  async function toggleDoc(pelId, docKey, current) {
    setUpdating(pelId + docKey)
    await supabase.from('pelerins').update({ [docKey]: !current }).eq('id', pelId)
    setPelerins(prev => prev.map(p => p.id === pelId ? { ...p, [docKey]: !current } : p))
    setUpdating(null)
  }

  function getStatus(p) {
    const vals = DOCS.map(d => p[d.key])
    const ok = vals.filter(Boolean).length
    if (ok === vals.length) return 'complet'
    if (ok === 0) return 'incomplet'
    return 'partiel'
  }

  const filtered = pelerins.filter(p => {
    if (filter === 'complet')  return getStatus(p) === 'complet'
    if (filter === 'incomplet') return getStatus(p) !== 'complet'
    return true
  })

  const total    = pelerins.length
  const complets = pelerins.filter(p => getStatus(p) === 'complet').length
  const manquants = pelerins.reduce((s, p) => s + DOCS.filter(d => !p[d.key]).length, 0)

  return (
    <Layout title="Documents & Visas">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Dossiers complets</div>
          <div className="text-3xl font-bold text-green-700">{complets}<span className="text-lg text-gray-400">/{total}</span></div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Documents manquants</div>
          <div className="text-3xl font-bold text-red-500">{manquants}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Taux de complétion</div>
          <div className="text-3xl font-bold" style={{ color: '#0F5229' }}>
            {total > 0 ? Math.round((complets/total)*100) : 0}%
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {[['tous','Tous'],['complet','Complets ✅'],['incomplet','Incomplets ⚠️']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`text-sm px-4 py-2 rounded-lg font-semibold transition-all ${filter===v ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={filter===v ? { background: '#0F5229' } : {}}>
            {l}
          </button>
        ))}
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4 opacity-30">📋</div>
          <div className="font-semibold text-gray-600">Aucun pèlerin trouvé</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase">Pèlerin</th>
                {DOCS.map(d => (
                  <th key={d.key} className="text-center px-3 py-3 text-xs text-gray-500 font-semibold uppercase">
                    <div>{d.icon}</div>
                    <div className="text-xs">{d.label}</div>
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs text-gray-500 font-semibold uppercase">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = getStatus(p)
                return (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{p.prenom} {p.nom}</td>
                    {DOCS.map(d => (
                      <td key={d.key} className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleDoc(p.id, d.key, p[d.key])}
                          disabled={updating === p.id + d.key}
                          className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all font-bold text-sm
                            ${p[d.key]
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-50 text-red-400 hover:bg-red-100'}`}
                          title={p[d.key] ? 'Marquer comme manquant' : 'Marquer comme reçu'}>
                          {updating === p.id + d.key ? '…' : p[d.key] ? '✓' : '✗'}
                        </button>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${st==='complet'?'badge-ok':st==='incomplet'?'badge-err':'badge-warn'}`}>
                        {st==='complet'?'Complet':st==='incomplet'?'Incomplet':'Partiel'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Légende */}
      <div className="mt-4 text-xs text-gray-400 flex items-center gap-4">
        <span>💡 Cliquez sur ✓ ou ✗ pour basculer le statut d'un document instantanément</span>
      </div>
    </Layout>
  )
}
