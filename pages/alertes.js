import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function Alertes() {
  const [pelerins, setPelerins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('pelerins').select('*').order('created_at', { ascending: false })
    setPelerins(data || [])
    setLoading(false)
  }

  const today = new Date()

  function getAlerts(p) {
    const alerts = []
    // Passeport
    if (p.exp_passeport) {
      const exp = new Date(p.exp_passeport)
      const diff = Math.round((exp - today) / (1000*60*60*24))
      if (diff < 0) alerts.push({ type: 'red', msg: 'Passeport expiré' })
      else if (diff < 180) alerts.push({ type: 'orange', msg: `Passeport expire dans ${diff} jours` })
    }
    // Paiement
    if ((p.prix_total||0) > 0 && (p.montant_paye||0) < (p.prix_total||0)) {
      const reste = (p.prix_total||0) - (p.montant_paye||0)
      alerts.push({ type: 'orange', msg: `Paiement incomplet — reste ${reste.toLocaleString('fr-FR')} FCFA` })
    }
    // Documents
    const docs = [
      [p.doc_passeport, 'Passeport'],
      [p.doc_photo, 'Photo'],
      [p.doc_vaccin, 'Vaccin'],
      [p.doc_visa, 'Visa'],
      [p.doc_billet, 'Billet'],
    ]
    const missing = docs.filter(([v]) => !v).map(([, l]) => l)
    if (missing.length > 0) alerts.push({ type: missing.length >= 3 ? 'red' : 'orange', msg: `Documents manquants : ${missing.join(', ')}` })
    return alerts
  }

  const pelerinsAvecAlertes = pelerins.map(p => ({ ...p, alerts: getAlerts(p) })).filter(p => p.alerts.length > 0)
  const urgents = pelerinsAvecAlertes.filter(p => p.alerts.some(a => a.type === 'red'))
  const attention = pelerinsAvecAlertes.filter(p => !p.alerts.some(a => a.type === 'red') && p.alerts.some(a => a.type === 'orange'))
  const ok = pelerins.filter(p => getAlerts(p).length === 0)

  const EMOJI = { red: '🔴', orange: '🟡', green: '🟢' }

  return (
    <Layout title={`Alertes (${pelerinsAvecAlertes.length})`}>
      {loading ? (
        <div className="text-center py-20 text-gray-400">Chargement...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4" style={{borderColor:'#FECACA'}}>
              <div className="text-xs font-semibold text-red-500 uppercase mb-1">🔴 Urgent</div>
              <div className="text-3xl font-bold text-red-500">{urgents.length}</div>
              <div className="text-xs text-gray-400 mt-1">action immédiate</div>
            </div>
            <div className="bg-white rounded-xl border p-4" style={{borderColor:'#FDE68A'}}>
              <div className="text-xs font-semibold text-yellow-600 uppercase mb-1">🟡 Attention</div>
              <div className="text-3xl font-bold text-yellow-500">{attention.length}</div>
              <div className="text-xs text-gray-400 mt-1">à surveiller</div>
            </div>
            <div className="bg-white rounded-xl border p-4" style={{borderColor:'#A7F3D0'}}>
              <div className="text-xs font-semibold text-green-600 uppercase mb-1">🟢 OK</div>
              <div className="text-3xl font-bold text-green-600">{ok.length}</div>
              <div className="text-xs text-gray-400 mt-1">dossiers complets</div>
            </div>
          </div>

          {pelerinsAvecAlertes.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🟢</div>
              <div className="font-bold text-gray-700 text-lg">Tout est en ordre !</div>
              <div className="text-gray-400 text-sm mt-2">Aucune alerte active</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pelerinsAvecAlertes.map(p => (
                <div key={p.id} className="bg-white rounded-xl border p-4"
                     style={{borderColor: p.alerts.some(a=>a.type==='red') ? '#FECACA' : '#FDE68A',
                             borderLeftWidth: '4px'}}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-gray-800">{p.prenom} {p.nom}</div>
                      <div className="text-xs text-gray-400">{p.sexe==='femme'?'👩':'👨'} · {p.formule}</div>
                    </div>
                    <Link href="/pelerins"
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                      style={{background:'#0F5229'}}>
                      Voir dossier
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {p.alerts.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span>{EMOJI[a.type]}</span>
                        <span className={a.type==='red'?'text-red-600 font-medium':'text-yellow-700'}>{a.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
