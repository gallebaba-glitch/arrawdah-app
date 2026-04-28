import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

export default function Finances() {
  const [pelerins, setPelerins] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('tous')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('pelerins').select('id, prenom, nom, formule, prix_total, montant_paye, statut').order('created_at', { ascending: false })
    setPelerins(data || [])
    setLoading(false)
  }

  async function relancer(p) {
    alert(`Relance envoyée à ${p.prenom} ${p.nom}\nReste : ${((p.prix_total||0)-(p.montant_paye||0)).toLocaleString('fr-FR')} FCFA`)
  }

  const totalDu   = pelerins.reduce((s, p) => s + (p.prix_total   || 0), 0)
  const totalPaye = pelerins.reduce((s, p) => s + (p.montant_paye || 0), 0)
  const restant   = totalDu - totalPaye
  const taux      = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 0
  const nbSoldes  = pelerins.filter(p => (p.montant_paye||0) >= (p.prix_total||1) && (p.prix_total||0) > 0).length

  const filtered = pelerins.filter(p => {
    if (filter === 'solde')   return (p.montant_paye || 0) >= (p.prix_total || 0)
    if (filter === 'partiel') return (p.montant_paye || 0) > 0 && (p.montant_paye || 0) < (p.prix_total || 0)
    if (filter === 'aucun')   return (p.montant_paye || 0) === 0
    return true
  })

  const KPI = [
    { label: 'Total attendu',        val: totalDu.toLocaleString('fr-FR') + ' FCFA',   color: '#0F5229' },
    { label: 'Total encaissé',       val: totalPaye.toLocaleString('fr-FR') + ' FCFA',  color: '#1A7A3C' },
    { label: 'Reste à encaisser',    val: restant.toLocaleString('fr-FR') + ' FCFA',   color: '#E53E3E' },
    { label: "Taux d'encaissement",  val: taux + '%',                                  color: taux >= 80 ? '#1A7A3C' : taux >= 50 ? '#ED8936' : '#E53E3E' },
  ]

  return (
    <Layout title="Finances">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {KPI.map(k => (
          <div key={k.label} className="card p-5">
            <div className="text-xs text-gray-500 font-semibold uppercase mb-2">{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Barre globale */}
      <div className="card p-5 mb-6">
        <div className="flex justify-between text-sm font-semibold mb-2">
          <span className="text-gray-600">Taux d'encaissement global</span>
          <span style={{ color: '#1A7A3C' }}>{taux}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: taux + '%', background: '#1A7A3C' }}/>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{totalPaye.toLocaleString('fr-FR')} FCFA encaissés</span>
          <span>{restant.toLocaleString('fr-FR')} FCFA restants</span>
        </div>
      </div>

      {/* Tableau pèlerins */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Paiements par pèlerin</h3>
          <div className="flex gap-2">
            {[['tous','Tous'],['solde','Soldés'],['partiel','Partiels'],['aucun','Non payés']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${filter===v ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={filter===v ? { background: '#0F5229' } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucun pèlerin dans cette catégorie</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase">Pèlerin</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase">Formule</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold uppercase">Total dû</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold uppercase">Payé</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold uppercase">Reste</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase">%</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const pct = Math.round(((p.montant_paye||0)/(p.prix_total||1))*100)
                const reste = (p.prix_total||0) - (p.montant_paye||0)
                const solde = pct >= 100
                return (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{p.prenom} {p.nom}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${p.formule==='ZEN'?'badge-ok':'badge-gold'}`}>{p.formule}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{(p.prix_total||0).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{(p.montant_paye||0).toLocaleString('fr-FR')}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${solde ? 'text-green-600' : 'text-red-500'}`}>
                      {solde ? '✓ Soldé' : reste.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: pct+'%', background: solde?'#1A7A3C':'#ED8936' }}/>
                        </div>
                        <span className="text-xs font-semibold">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {!solde && (
                        <button onClick={() => relancer(p)} className="btn btn-danger text-xs py-1 px-3">Relancer</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
