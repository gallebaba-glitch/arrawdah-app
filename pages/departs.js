import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const STATUT = {
  preparation: { label: 'En préparation', cls: 'bg-yellow-100 text-yellow-800' },
  confirme:    { label: 'Confirmé',        cls: 'bg-blue-100 text-blue-800' },
  parti:       { label: 'Parti',           cls: 'bg-green-100 text-green-800' },
  rentre:      { label: 'Rentré',          cls: 'bg-gray-100 text-gray-600' },
}

const EMPTY = {
  nom: '', date_greg: '', date_heg: '', duree: 14,
  max_pelerins: 40, vol: '', hotel_mecque: '', hotel_medine: '',
  guide: '', statut: 'preparation',
}

// Algorithme conversion grégorien → hégire
function gregToJD(d, m, y) {
  return Math.floor((1461*(y+4800+Math.floor((m-14)/12)))/4)
    + Math.floor((367*(m-2-12*Math.floor((m-14)/12)))/12)
    - Math.floor((3*Math.floor((y+4900+Math.floor((m-14)/12))/100))/4)
    + d - 32075
}
function jdToHeg(jd) {
  const l = jd - 1948440 + 10632
  const n = Math.floor((l-1)/10631)
  const ll = l - 10631*n + 354
  const j = Math.floor((10985-ll)/5316)*Math.floor((50*ll)/17719) + Math.floor(ll/5670)*Math.floor((43*ll)/15238)
  const lll = ll - Math.floor((30-j)/15)*Math.floor((17719*j)/50) - Math.floor(j/16)*Math.floor((15238*j)/43) + 29
  const month = Math.floor((24*lll)/709)
  const day = lll - Math.floor((709*month)/24)
  const year = 30*n + j - 29
  return { day, month, year }
}
const MOIS_HEG = ['Mouharram','Safar','Rabi Al Awwal','Rabi Ath Thania','Joumada Al Oula','Joumada Ath Thania','Rajab','Chaabane','Ramadan','Chawwal','Dhou Al Qida','Dhou Al Hijja']
function dateGregToHeg(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const jd = gregToJD(d, m, y)
  const h = jdToHeg(jd)
  return `${h.day} ${MOIS_HEG[h.month-1]} ${h.year}H`
}

// Statut global du départ
function getStatutGlobal(pelerins) {
  if (pelerins.length === 0) return { emoji: '⚪', label: 'Vide', color: 'text-gray-400' }
  const docOk = pelerins.filter(p =>
    p.doc_passeport && p.doc_photo && p.doc_vaccin && p.doc_visa && p.doc_billet
  ).length
  const paiOk = pelerins.filter(p => (p.montant_paye||0) >= (p.prix_total||1) && (p.prix_total||0) > 0).length
  const total = pelerins.length
  const score = ((docOk + paiOk) / (total * 2)) * 100
  if (score >= 90) return { emoji: '🟢', label: 'Prêt', color: 'text-green-600' }
  if (score >= 50) return { emoji: '🟡', label: 'Presque prêt', color: 'text-yellow-600' }
  return { emoji: '🔴', label: 'Non prêt', color: 'text-red-500' }
}

// Attribution automatique chambres
function genererChambres(pelerins) {
  const groupes = { ZEN_homme: [], ZEN_femme: [], ELITE_homme: [], ELITE_femme: [] }
  pelerins.forEach(p => {
    const sexe = p.sexe || 'homme'
    const key = `${p.formule}_${sexe}`
    if (groupes[key]) groupes[key].push(p)
  })
  const chambres = []
  let num = 1
  Object.entries(groupes).forEach(([key, liste]) => {
    if (liste.length === 0) return
    const [formule, sexe] = key.split('_')
    const cap = formule === 'ELITE' ? 2 : 4
    for (let i = 0; i < liste.length; i += cap) {
      chambres.push({
        numero: num++,
        formule, sexe, cap,
        pelerins: liste.slice(i, i + cap)
      })
    }
  })
  return chambres
}

export default function Departs() {
  const [departs, setDeparts] = useState([])
  const [pelerins, setPelerins] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('liste')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('departs').select('*').order('created_at', { ascending: false }),
      supabase.from('pelerins').select('*'),
    ])
    setDeparts(d || [])
    setPelerins(p || [])
    setLoading(false)
  }

  function setF(k, v) {
    if (k === 'date_greg') {
      setForm(f => ({ ...f, date_greg: v, date_heg: dateGregToHeg(v) }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }

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
    let msg = `Supprimer "${d?.nom}" ?`
    if (count > 0) msg += `\n\n⚠️ ${count} pèlerin(s) seront désassignés.`
    if (!confirm(msg)) return
    await supabase.from('pelerins').update({ depart_id: null }).eq('depart_id', id)
    await supabase.from('departs').delete().eq('id', id)
    setSelected(null)
    fetchAll()
  }

  const sel = selected ? departs.find(x => x.id === selected) : null
  const selPelerins = sel ? pelerins.filter(p => p.depart_id == sel.id) : []
  const chambres = sel ? genererChambres(selPelerins) : []
  const statutGlobal = sel ? getStatutGlobal(selPelerins) : null

  return (
    <Layout title={`Départs (${departs.length})`}
      action={{ label: '+ Nouveau départ', fn: () => { setForm(EMPTY); setModalOpen(true) } }}>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Chargement...</div>
      ) : departs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-30">✈️</div>
          <div className="font-semibold text-gray-600 mb-4">Aucun départ planifié</div>
          <button onClick={() => { setForm(EMPTY); setModalOpen(true) }}
            className="px-5 py-2.5 rounded-lg text-white font-semibold" style={{background:'#0F5229'}}>
            + Créer le premier départ
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">

          {/* ── LISTE DÉPARTS ── */}
          <div className={sel ? 'lg:w-1/2' : 'w-full'}>
            <div className="space-y-3">
              {departs.map(d => {
                const dp = pelerins.filter(p => p.depart_id == d.id)
                const pct = d.max_pelerins > 0 ? Math.round((dp.length / d.max_pelerins) * 100) : 0
                const sg = getStatutGlobal(dp)
                const isActive = selected === d.id
                return (
                  <div key={d.id}
                    onClick={() => { setSelected(isActive ? null : d.id); setActiveTab('liste') }}
                    className="bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md"
                    style={{borderColor: isActive ? '#0F5229' : '#E5EDE8', borderLeftWidth: isActive ? '4px' : '1px', background: isActive ? '#F0FFF4' : 'white'}}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800">✈️ {d.nom}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {d.date_greg && <span>{d.date_greg}</span>}
                            {d.date_heg && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{background:'#E8F5EE',color:'#0F5229'}}>{d.date_heg}</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{d.guide || 'Guide non assigné'} · {d.duree}j</div>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <span className={`text-lg`} title={sg.label}>{sg.emoji}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT[d.statut]?.cls}`}>{STATUT[d.statut]?.label}</span>
                          <button onClick={() => { setForm(d); setModalOpen(true) }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-sm">✏️</button>
                          <button onClick={() => supprimer(d.id)}
                            className="p-1.5 rounded-lg text-sm" style={{background:'#FEE2E2',color:'#991B1B'}}>🗑️</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 rounded-full" style={{background:'#E5EDE8'}}>
                          <div className="h-full rounded-full" style={{width:pct+'%',background:'#1A7A3C'}}/>
                        </div>
                        <span className="text-xs text-gray-500 font-semibold">{dp.length}/{d.max_pelerins}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── FICHE GROUPE ── */}
          {sel && (
            <div className="lg:w-1/2">
              <div className="bg-white rounded-xl border sticky top-20" style={{borderColor:'#E5EDE8'}}>

                {/* Header */}
                <div className="p-4 rounded-t-xl flex items-center justify-between" style={{background:'#0F5229'}}>
                  <div>
                    <div className="text-white font-bold">✈️ {sel.nom}</div>
                    <div className="text-xs mt-0.5" style={{color:'#F0D080'}}>{sel.date_heg || sel.date_greg}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" title={statutGlobal.label}>{statutGlobal.emoji}</span>
                    <span className="text-white text-xs font-semibold">{statutGlobal.label}</span>
                    <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white ml-2">✕</button>
                  </div>
                </div>

                {/* Stats rapides */}
                <div className="grid grid-cols-4 gap-0 border-b" style={{borderColor:'#E5EDE8'}}>
                  {[
                    { label: 'Total', val: selPelerins.length },
                    { label: 'Hommes', val: selPelerins.filter(p=>p.sexe!=='femme').length },
                    { label: 'Femmes', val: selPelerins.filter(p=>p.sexe==='femme').length },
                    { label: 'Chambres', val: chambres.length },
                  ].map(s => (
                    <div key={s.label} className="p-3 text-center border-r last:border-r-0" style={{borderColor:'#E5EDE8'}}>
                      <div className="text-xl font-bold" style={{color:'#0F5229'}}>{s.val}</div>
                      <div className="text-xs text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{borderColor:'#E5EDE8'}}>
                  {[['liste','Pèlerins'],['chambres','Chambres'],['export','Export']].map(([t,l]) => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className="flex-1 py-2.5 text-xs font-semibold transition-all"
                      style={activeTab===t ? {borderBottom:`2px solid #0F5229`,color:'#0F5229'} : {color:'#6B7280'}}>
                      {l}
                    </button>
                  ))}
                </div>

                <div className="max-h-96 overflow-y-auto">

                  {/* Tab — Liste pèlerins */}
                  {activeTab === 'liste' && (
                    <div>
                      {selPelerins.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">Aucun pèlerin inscrit</div>
                      ) : selPelerins.map((p, i) => {
                        const pct = Math.round(((p.montant_paye||0)/(p.prix_total||1))*100)
                        const docsOk = [p.doc_passeport,p.doc_photo,p.doc_vaccin,p.doc_visa,p.doc_billet].filter(Boolean).length
                        return (
                          <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{borderColor:'#F0F0F0'}}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                 style={{background:'#0F5229',color:'#C9A84C'}}>{i+1}</div>
                            <div className="text-sm flex-shrink-0">{p.sexe==='femme'?'👩':'👨'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">{p.prenom} {p.nom}</div>
                              <div className="text-xs text-gray-400">{p.formule}</div>
                            </div>
                            <div className="text-xs flex-shrink-0">
                              <span className={pct>=100?'text-green-600 font-semibold':'text-orange-500'}>{pct}%</span>
                            </div>
                            <div className="text-xs flex-shrink-0">
                              <span className={docsOk===5?'text-green-600':'text-red-500'}>{docsOk}/5 docs</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Tab — Chambres */}
                  {activeTab === 'chambres' && (
                    <div className="p-4 space-y-3">
                      {chambres.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">Aucun pèlerin inscrit</div>
                      ) : chambres.map(ch => (
                        <div key={ch.numero} className="border rounded-lg overflow-hidden" style={{borderColor:'#E5EDE8'}}>
                          <div className="flex items-center justify-between px-3 py-2"
                               style={{background: ch.sexe==='femme' ? '#FFF0F6' : '#EFF8FF'}}>
                            <div className="text-xs font-bold" style={{color:'#374151'}}>
                              Chambre {ch.numero} — {ch.sexe==='femme'?'👩 Femmes':'👨 Hommes'} · {ch.formule}
                            </div>
                            <div className="text-xs text-gray-500">{ch.pelerins.length}/{ch.cap} places</div>
                          </div>
                          <div className="divide-y" style={{borderColor:'#F0F0F0'}}>
                            {ch.pelerins.map(p => (
                              <div key={p.id} className="px-3 py-2 flex items-center gap-2">
                                <span className="text-sm">{p.sexe==='femme'?'👩':'👨'}</span>
                                <span className="text-sm">{p.prenom} {p.nom}</span>
                              </div>
                            ))}
                            {Array.from({length: ch.cap - ch.pelerins.length}).map((_, i) => (
                              <div key={i} className="px-3 py-2 text-xs text-gray-300 italic">Place disponible</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab — Export */}
                  {activeTab === 'export' && (
                    <div className="p-4 space-y-3">
                      <button onClick={() => {
                        const lines = selPelerins.map((p,i) =>
                          `${i+1}. ${p.prenom} ${p.nom} — ${p.formule} — ${p.sexe==='femme'?'F':'H'}`)
                        const win = window.open('', '_blank')
                        win.document.write(`<html><head><title>Embarquement ${sel.nom}</title><style>body{font-family:Arial;padding:20px}h2{color:#0F5229}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#0F5229;color:white}</style></head><body>
                          <h2>Liste d'embarquement — ${sel.nom}</h2>
                          <p>${sel.date_greg} · ${sel.date_heg || ''} · ${sel.vol || ''}</p>
                          <p>Guide : ${sel.guide || '—'} · Total : ${selPelerins.length} pèlerins</p>
                          <table><tr><th>#</th><th>Nom complet</th><th>Formule</th><th>Sexe</th><th>Passeport</th></tr>
                          ${selPelerins.map((p,i)=>`<tr><td>${i+1}</td><td>${p.prenom} ${p.nom}</td><td>${p.formule}</td><td>${p.sexe==='femme'?'F':'H'}</td><td>${p.num_passeport||'—'}</td></tr>`).join('')}
                          </table></body></html>`)
                        win.document.close()
                        win.print()
                      }} className="w-full py-3 rounded-lg text-white font-semibold text-sm"
                         style={{background:'#0F5229'}}>
                        🖨️ Liste d'embarquement
                      </button>
                      <button onClick={() => {
                        const win = window.open('', '_blank')
                        win.document.write(`<html><head><title>Chambres ${sel.nom}</title><style>body{font-family:Arial;padding:20px}h2{color:#0F5229}.chambre{border:1px solid #ddd;margin:10px 0;border-radius:8px;overflow:hidden}.ch-head{background:#0F5229;color:white;padding:8px 12px;font-weight:bold}.ch-body{padding:8px 12px}p{margin:2px 0}</style></head><body>
                          <h2>Répartition des chambres — ${sel.nom}</h2>
                          ${chambres.map(ch=>`<div class="chambre"><div class="ch-head">Chambre ${ch.numero} — ${ch.sexe==='femme'?'Femmes':'Hommes'} · ${ch.formule} (${ch.pelerins.length}/${ch.cap})</div><div class="ch-body">${ch.pelerins.map(p=>`<p>• ${p.prenom} ${p.nom}</p>`).join('')}${Array.from({length:ch.cap-ch.pelerins.length}).map(()=>'<p style="color:#ccc">— Place disponible</p>').join('')}</div></div>`).join('')}
                          </body></html>`)
                        win.document.close()
                        win.print()
                      }} className="w-full py-3 rounded-lg font-semibold text-sm border"
                         style={{borderColor:'#0F5229',color:'#0F5229',background:'white'}}>
                        🖨️ Liste des chambres
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={form.id ? 'Modifier le départ' : 'Nouveau départ'} onSave={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nom du départ *</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              value={form.nom} onChange={e => setF('nom', e.target.value)} placeholder="Ramadan 1448" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date grégorienne</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              type="date" value={form.date_greg} onChange={e => setF('date_greg', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date hégirienne (auto)</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-gray-50"
              value={form.date_heg} onChange={e => setF('date_heg', e.target.value)}
              placeholder="Calculée automatiquement" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Durée (jours)</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              type="number" value={form.duree} onChange={e => setF('duree', parseInt(e.target.value)||14)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Capacité max</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              type="number" value={form.max_pelerins} onChange={e => setF('max_pelerins', parseInt(e.target.value)||40)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vol</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              value={form.vol} onChange={e => setF('vol', e.target.value)} placeholder="Ethiopian ET 706" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Guide</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              value={form.guide} onChange={e => setF('guide', e.target.value)} placeholder="Oustaz Babacar" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hôtel La Mecque</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              value={form.hotel_mecque} onChange={e => setF('hotel_mecque', e.target.value)} placeholder="Accor Makkah" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hôtel Médine</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              value={form.hotel_medine} onChange={e => setF('hotel_medine', e.target.value)} placeholder="Accor Madinah" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Statut</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              value={form.statut} onChange={e => setF('statut', e.target.value)}>
              {Object.entries(STATUT).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
