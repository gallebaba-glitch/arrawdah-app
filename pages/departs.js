import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const STATUT = {
  preparation: { label: 'En préparation', cls: 'badge-warn' },
  confirme:    { label: 'Confirmé',        cls: 'badge-info' },
  parti:       { label: 'Parti',           cls: 'badge-ok'   },
  rentre:      { label: 'Rentré',          cls: 'badge-gray' },
}

const EMPTY = {
  nom: '', date_greg: '', date_heg: '', duree: 14,
  max_pelerins: 40, vol: '', hotel_mecque: '', hotel_medine: '',
  guide: '', statut: 'preparation',
}

export default function Departs() {
  const [departs, setDeparts] = useState([])
  const [pelerins, setPelerins] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('departs').select('*').order('created_at', { ascending: false }),
      supabase.from('pelerins').select('id, prenom, nom, formule, montant_paye, prix_total, statut, depart_id'),
    ])
    setDeparts(d || [])
    setPelerins(p || [])
    setLoading(false)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nom) { alert('Nom du départ obligatoire'); return }
    if (form.id) {
      await supabase.from('departs').update(form).eq('id', form.id)
    } else {
      await supabase.from('departs').insert([form])
    }
    setModalOpen(false)
    fetchAll()
  }

  async function supprimer(id) {
    const d = departs.find(x => x.id === id)
    const count = pelerins.filter(p => p.depart_id == id).length
    let msg = `Supprimer le départ "${d?.nom}" ?`
    if (count > 0) msg += `\n\n⚠️ ${count} pèlerin(s) seront désassignés.`
    if (!confirm(msg)) return
    await supabase.from('pelerins').update({ depart_id: null }).eq('depart_id', id)
    await supabase.from('departs').delete().eq('id', id)
    setSelected(null)
    fetchAll()
  }

  const sel = selected ? departs.find(x => x.id === selected) : null
  const selPelerins = sel ? pelerins.filter(p => p.depart_id == sel.id) : []

  return (
    <Layout title={`Départs (${departs.length})`} action={{ label: '+ Nouveau départ', fn: () => { setForm(EMPTY); setModalOpen(true) } }}>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Chargement...</div>
      ) : departs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-30">✈️</div>
          <div className="font-semibold text-gray-600 mb-4">Aucun départ planifié</div>
          <button onClick={() => { setForm(EMPTY); setModalOpen(true) }} className="btn btn-primary">+ Créer le premier départ</button>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Liste */}
          <div className={sel ? 'w-1/2' : 'w-full'}>
            <div className="space-y-3">
              {departs.map(d => {
                const count = pelerins.filter(p => p.depart_id == d.id).length
                const pct = d.max_pelerins > 0 ? Math.round((count / d.max_pelerins) * 100) : 0
                const isActive = selected === d.id
                return (
                  <div key={d.id}
                    onClick={() => setSelected(isActive ? null : d.id)}
                    className={`card p-5 cursor-pointer transition-all hover:shadow-md
                      ${isActive ? 'border-l-4 border-green-700 bg-green-50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-800 text-base">✈️ {d.nom}</div>
                        <div className="text-sm text-gray-400 mt-0.5">
                          {d.date_greg && <span>{d.date_greg}</span>}
                          {d.date_heg && <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{d.date_heg}</span>}
                          {d.duree && <span className="ml-2">· {d.duree} jours</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <span className={`badge ${STATUT[d.statut]?.cls || 'badge-gray'}`}>{STATUT[d.statut]?.label}</span>
                        <button onClick={() => { setForm(d); setModalOpen(true) }} className="btn btn-secondary text-xs py-1 px-2">✏️</button>
                        <button onClick={() => supprimer(d.id)} className="btn btn-danger text-xs py-1 px-2">🗑️</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-gray-500 mb-3">
                      <div>🧭 Guide : <span className="font-semibold text-gray-700">{d.guide || '—'}</span></div>
                      <div>🏨 La Mecque : <span className="font-semibold text-gray-700">{d.hotel_mecque || '—'}</span></div>
                      <div>🏨 Médine : <span className="font-semibold text-gray-700">{d.hotel_medine || '—'}</span></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: pct + '%', background: '#1A7A3C' }}/>
                      </div>
                      <span className="text-xs text-gray-500 font-semibold flex-shrink-0">{count}/{d.max_pelerins} pèlerins</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail */}
          {sel && (
            <div className="w-1/2">
              <div className="card overflow-hidden sticky top-24">
                <div className="p-4 flex items-center justify-between" style={{ background: '#0F5229' }}>
                  <div>
                    <div className="text-white font-bold">✈️ {sel.nom}</div>
                    <div style={{ color: '#F0D080' }} className="text-xs mt-0.5">{selPelerins.length} pèlerin(s) inscrit(s)</div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white">✕</button>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  <div className="font-semibold text-sm text-gray-700 mb-3">Liste des pèlerins</div>
                  {selPelerins.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Aucun pèlerin inscrit sur ce départ</div>
                  ) : (
                    <div className="space-y-2">
                      {selPelerins.map((p, i) => {
                        const pct = Math.round(((p.montant_paye||0)/(p.prix_total||1))*100)
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                 style={{ background: '#0F5229', color: '#C9A84C' }}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">{p.prenom} {p.nom}</div>
                              <div className="text-xs text-gray-400">{p.formule}</div>
                            </div>
                            <span className={`badge text-xs ${pct === 100 ? 'badge-ok' : 'badge-warn'}`}>{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {/* Liste embarquement */}
                  {selPelerins.length > 0 && (
                    <button onClick={() => {
                      const lines = selPelerins.map((p,i) => `${i+1}. ${p.prenom} ${p.nom} — ${p.formule}`)
                      alert(`LISTE D'EMBARQUEMENT\n${sel.nom}\n\n${lines.join('\n')}`)
                    }} className="btn btn-primary w-full mt-4 text-sm">
                      📋 Liste d'embarquement
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={form.id ? 'Modifier le départ' : 'Nouveau départ'} onSave={save}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Nom du départ *</label><input className="input" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ramadan 1448" /></div>
          <div><label className="label">Date grégorienne</label><input className="input" type="date" value={form.date_greg} onChange={e => set('date_greg', e.target.value)} /></div>
          <div><label className="label">Date hégirienne</label><input className="input" value={form.date_heg} onChange={e => set('date_heg', e.target.value)} placeholder="1 Ramadan 1448" /></div>
          <div><label className="label">Durée (jours)</label><input className="input" type="number" value={form.duree} onChange={e => set('duree', parseInt(e.target.value)||14)} /></div>
          <div><label className="label">Capacité max</label><input className="input" type="number" value={form.max_pelerins} onChange={e => set('max_pelerins', parseInt(e.target.value)||40)} /></div>
          <div><label className="label">Vol</label><input className="input" value={form.vol} onChange={e => set('vol', e.target.value)} placeholder="Ethiopian ET 706" /></div>
          <div><label className="label">Guide</label><input className="input" value={form.guide} onChange={e => set('guide', e.target.value)} placeholder="Oustaz Babacar" /></div>
          <div><label className="label">Hôtel La Mecque</label><input className="input" value={form.hotel_mecque} onChange={e => set('hotel_mecque', e.target.value)} placeholder="Accor Makkah" /></div>
          <div><label className="label">Hôtel Médine</label><input className="input" value={form.hotel_medine} onChange={e => set('hotel_medine', e.target.value)} placeholder="Accor Madinah" /></div>
          <div className="col-span-2"><label className="label">Statut</label>
            <select className="input" value={form.statut} onChange={e => set('statut', e.target.value)}>
              {Object.entries(STATUT).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
