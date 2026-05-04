import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const STATUT_CONFIG = {
  inscrit:  { label: 'Inscrit',  class: 'badge-warn', color: '#ED8936' },
  confirme: { label: 'Confirmé', class: 'badge-info', color: '#3B82F6' },
  parti:    { label: 'Parti',    class: 'badge-ok',   color: '#1A7A3C' },
  rentre:   { label: 'Rentré',   class: 'badge-gray', color: '#6B7280' },
}

const EMPTY = {
  prenom: '', nom: '', telephone: '', tel_famille: '',
  date_naissance: '', sexe: 'homme', premiere_oumrah: true, formule: 'ZEN', prix_total: 0,
  montant_paye: 0, depart_id: '', num_passeport: '',
  exp_passeport: '', medical: '', statut: 'inscrit',
  doc_passeport: false, doc_photo: false, doc_vaccin: false, doc_vaccin_fy: false,
  doc_visa: false, doc_billet: false, notes: '',
}

function getInitials(p) {
  return ((p.prenom?.[0] || '') + (p.nom?.[0] || '')).toUpperCase()
}

function getDossierStatus(p) {
  const docs = [p.doc_passeport, p.doc_photo, p.doc_vaccin, p.doc_vaccin_fy, p.doc_visa, p.doc_billet]
  const ok = docs.filter(Boolean).length
  if (ok === docs.length) return 'complet'
  if (ok === 0) return 'incomplet'
  return 'partiel'
}

export default function Pelerins() {
  const router = useRouter()
  const [pelerins, setPelerins] = useState([])
  const [departs, setDeparts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterFormule, setFilterFormule] = useState('tous')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from('pelerins').select('*').order('created_at', { ascending: false }),
      supabase.from('departs').select('id, nom').order('created_at', { ascending: false }),
    ])
    setPelerins(p || [])
    setDeparts(d || [])
    setLoading(false)
  }

  function openNew() { setForm(EMPTY); setModalOpen(true) }

  async function save() {
    if (!form.prenom || !form.nom) { alert('Prénom et nom obligatoires'); return }
    const data = { ...form, depart_id: form.depart_id || null }
    if (form.id) {
      await supabase.from('pelerins').update(data).eq('id', form.id)
    } else {
      await supabase.from('pelerins').insert([data])
    }
    setModalOpen(false)
    setSelected(null)
    fetchAll()
  }

  async function supprimer(id) {
    const p = pelerins.find(x => x.id === id)
    if (!confirm(`Supprimer le dossier de ${p?.prenom} ${p?.nom} ?`)) return
    await supabase.from('pelerins').delete().eq('id', id)
    setSelected(null)
    fetchAll()
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const filtered = pelerins.filter(p => {
    const s = (p.prenom + ' ' + p.nom).toLowerCase().includes(search.toLowerCase())
    const st = filterStatut === 'tous' || p.statut === filterStatut
    const fo = filterFormule === 'tous' || p.formule === filterFormule
    return s && st && fo
  })

  const getDep = id => departs.find(d => d.id == id)?.nom || '—'

  const sel = selected ? pelerins.find(x => x.id === selected) : null
  const pct = sel ? Math.round(((sel.montant_paye || 0) / (sel.prix_total || 1)) * 100) : 0

  return (
    <Layout title={`Pèlerins (${pelerins.length})`} action={{ label: '+ Nouveau pèlerin', fn: openNew }}>
      <div className="flex gap-6">

        {/* LISTE */}
        <div className={sel ? 'w-1/2' : 'w-full'}>

          {/* Filtres */}
          <div className="flex gap-3 mb-4">
            <input className="input flex-1" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input w-36" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
              <option value="tous">Tous statuts</option>
              {Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="input w-32" value={filterFormule} onChange={e => setFilterFormule(e.target.value)}>
              <option value="tous">Toutes formules</option>
              <option value="ZEN">🌿 ZEN</option>
              <option value="ELITE">⭐ ELITE</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4 opacity-30">🕋</div>
              <div className="font-semibold text-gray-600">Aucun pèlerin trouvé</div>
              <button onClick={openNew} className="btn btn-primary mt-4">+ Ajouter le premier pèlerin</button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {filtered.map((p, i) => {
                const ds = getDossierStatus(p)
                const paiePct = Math.round(((p.montant_paye||0)/(p.prix_total||1))*100)
                const isActive = selected === p.id
                return (
                  <div key={p.id}
                    onClick={() => setSelected(isActive ? null : p.id)}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all border-b border-gray-50 last:border-0
                      ${isActive ? 'bg-green-50 border-l-4 border-l-green-700' : 'hover:bg-gray-50'}`}>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-yellow-700"
                         style={{ background: '#0F5229', color: '#C9A84C' }}>
                      {getInitials(p)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{p.prenom} {p.nom}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{getDep(p.depart_id)} · {p.formule} · {p.sexe === 'femme' ? '👩' : '👨'}</div>
                    </div>
                    {/* Statut paiement */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold mb-1" style={{ color: paiePct === 100 ? '#1A7A3C' : '#ED8936' }}>{paiePct}%</div>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: paiePct + '%', background: paiePct === 100 ? '#1A7A3C' : '#ED8936' }}/>
                      </div>
                    </div>
                    {/* Dossier */}
                    <span className={`badge ${ds === 'complet' ? 'badge-ok' : ds === 'incomplet' ? 'badge-err' : 'badge-warn'}`}>
                      {ds === 'complet' ? '✓' : ds === 'incomplet' ? '✗' : '⚠'}
                    </span>
                    {/* Statut */}
                    <span className={`badge ${STATUT_CONFIG[p.statut]?.class || 'badge-gray'}`}>
                      {STATUT_CONFIG[p.statut]?.label || p.statut}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* DETAIL */}
        {sel && (
          <div className="w-1/2">
            <div className="card overflow-hidden sticky top-24">
              {/* Header */}
              <div className="p-5 flex items-center gap-4" style={{ background: '#0F5229' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                     style={{ background: '#C9A84C', color: '#0F5229' }}>{getInitials(sel)}</div>
                <div className="flex-1">
                  <div className="text-white font-bold text-lg">{sel.prenom} {sel.nom}</div>
                  <div className="text-sm mt-0.5" style={{ color: '#F0D080' }}>{getDep(sel.depart_id)} · {sel.formule}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-xl">✕</button>
              </div>

              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Infos */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: 'Téléphone', v: sel.telephone || '—' },
                    { l: 'Famille', v: sel.tel_famille || '—' },
                    { l: 'Passeport', v: sel.num_passeport || '—' },
                    { l: 'Exp. passeport', v: sel.exp_passeport || '—' },
                    { l: 'Médical', v: sel.medical || 'Aucun' },
                    { l: 'Statut', v: STATUT_CONFIG[sel.statut]?.label || sel.statut },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 uppercase font-semibold mb-1">{l}</div>
                      <div className="text-sm font-semibold text-gray-700">{v}</div>
                    </div>
                  ))}
                </div>

                {/* Paiement */}
                <div>
                  <div className="font-semibold text-gray-700 mb-2 text-sm">💰 Paiement</div>
                  <div className="text-2xl font-bold mb-1" style={{ color: '#1A7A3C' }}>
                    {(sel.montant_paye||0).toLocaleString('fr-FR')} FCFA
                    <span className="text-sm font-normal text-gray-400 ml-1">/ {(sel.prix_total||0).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full" style={{ width: pct + '%', background: '#1A7A3C' }}/>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{pct}% payé</span>
                    <span className={pct < 100 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                      {pct < 100 ? 'Reste : ' + ((sel.prix_total||0)-(sel.montant_paye||0)).toLocaleString('fr-FR') + ' FCFA' : '✓ Soldé'}
                    </span>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <div className="font-semibold text-gray-700 mb-2 text-sm">📋 Documents</div>
                  <div className="space-y-1.5">
                    {[
                      { key: 'doc_passeport', label: 'Passeport' },
                      { key: 'doc_photo',     label: 'Photo identité' },
                      { key: 'doc_vaccin',    label: 'Vaccin méningite' },
                      { key: 'doc_vaccin_fy', label: 'Vaccin fièvre jaune' },
                      { key: 'doc_visa',      label: 'Visa Oumrah' },
                      { key: 'doc_billet',    label: 'Billet avion' },
                    ].map(d => (
                      <div key={d.key} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                        <span className="text-base">{sel[d.key] ? '✅' : '❌'}</span>
                        <span className="text-sm flex-1">{d.label}</span>
                        <span className={`badge ${sel[d.key] ? 'badge-ok' : 'badge-err'}`}>
                          {sel[d.key] ? 'Reçu' : 'Manquant'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  <button onClick={() => { setForm({ ...sel, depart_id: sel.depart_id || '' }); setModalOpen(true) }}
                    className="btn btn-primary flex-1 text-sm">✏️ Modifier</button>
                  <a href={`/pelerins/${sel.id}/imprimer`} target="_blank"
                    className="btn text-sm flex items-center gap-1"
                    style={{background:'#F0FFF4',borderColor:'#A7F3D0',color:'#0F5229',textDecoration:'none'}}>
                    🖨️ Imprimer
                  </a>
                  <button onClick={() => supprimer(sel.id)}
                    className="btn btn-danger text-sm">🗑️ Supprimer</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={form.id ? 'Modifier le pèlerin' : 'Nouveau pèlerin'} onSave={save}>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Prénom *</label><input className="input" value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Aminata" /></div>
          <div><label className="label">Nom *</label><input className="input" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Diallo" /></div>
          <div><label className="label">Téléphone</label><input className="input" value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+221 77 000 00 00" /></div>
          <div><label className="label">Téléphone famille</label><input className="input" value={form.tel_famille} onChange={e => set('tel_famille', e.target.value)} placeholder="+221 77 000 00 00" /></div>
          <div><label className="label">Date de naissance</label><input className="input" type="date" value={form.date_naissance} onChange={e => set('date_naissance', e.target.value)} /></div>
          <div><label className="label">Sexe *</label>
            <select className="input" value={form.sexe} onChange={e => set('sexe', e.target.value)}>
              <option value="homme">👨 Homme</option>
              <option value="femme">👩 Femme</option>
            </select>
          </div>
          <div><label className="label">Statut</label>
            <select className="input" value={form.statut} onChange={e => set('statut', e.target.value)}>
              {Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div><label className="label">Formule</label>
            <select className="input" value={form.formule} onChange={e => { set('formule', e.target.value); set('prix_total', 0) }}>
              <option value="ZEN">🌿 Formule ZEN</option>
              <option value="ELITE">⭐ Formule ELITE</option>
            </select>
          </div>
          <div>
            <label className="label">Prix du package (FCFA)</label>
            <input className="input" type="number" value={form.prix_total || ''} onChange={e => set('prix_total', parseInt(e.target.value)||0)} placeholder="Saisir le prix de cette saison..." />
            <p className="text-xs text-gray-400 mt-1">Le prix varie selon les saisons — saisir le montant exact.</p>
          </div>
          <div><label className="label">Montant payé (FCFA)</label><input className="input" type="number" value={form.montant_paye} onChange={e => set('montant_paye', parseInt(e.target.value)||0)} /></div>
          <div><label className="label">Départ</label>
            <select className="input" value={form.depart_id} onChange={e => set('depart_id', e.target.value)}>
              <option value="">— Choisir un départ —</option>
              {departs.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </div>
          <div><label className="label">N° Passeport</label><input className="input" value={form.num_passeport} onChange={e => set('num_passeport', e.target.value)} placeholder="SN123456" /></div>
          <div><label className="label">Expiration passeport</label><input className="input" type="date" value={form.exp_passeport} onChange={e => set('exp_passeport', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">Informations médicales</label><input className="input" value={form.medical} onChange={e => set('medical', e.target.value)} placeholder="Tension, diabète..." /></div>
          <div><label className="label">Première Oumrah ?</label>
            <select className="input" value={form.premiere_oumrah ? 'true' : 'false'} onChange={e => set('premiere_oumrah', e.target.value === 'true')}>
              <option value="true">⭐ Oui — Première Oumrah</option>
              <option value="false">Non — Déjà effectué</option>
            </select>
          </div>
          <div className="col-span-2"><label className="label">Notes internes</label>
            <textarea className="input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Notes de l'équipe..." style={{minHeight:'60px',resize:'vertical'}} />
          </div>
          <div className="col-span-2">
            <label className="label">Documents reçus</label>
            <div className="flex flex-wrap gap-4 mt-2">
              {[['doc_passeport','Passeport'],['doc_photo','Photo'],['doc_vaccin','Méningite'],['doc_vaccin_fy','Fièvre jaune'],['doc_visa','Visa'],['doc_billet','Billet']].map(([k,l]) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} className="w-4 h-4 accent-green-700" />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
