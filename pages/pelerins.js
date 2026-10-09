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

const MODE_PAIEMENT = ['Wave', 'Orange Money', 'Chèque', 'Cash']

const EMPTY = {
  prenom: '', nom: '', telephone: '', tel_famille: '',
  date_naissance: '', sexe: 'homme', premiere_oumrah: true, formule: 'ZEN', prix_total: 0,
  montant_paye: 0, depart_id: '', num_passeport: '',
  exp_passeport: '', medical: '', statut: 'inscrit',
  passeport_recu: false,
  doc_passeport: false, doc_photo: false, doc_vaccin: false,
  doc_visa: false, doc_billet: false, notes: '',
  option_tgv: false, montant_tgv: 0,
}

function getInitials(p) {
  return ((p.prenom?.[0] || '') + (p.nom?.[0] || '')).toUpperCase()
}

function getDossierStatus(p) {
  const docs = [p.doc_passeport, p.doc_photo, p.doc_vaccin, p.doc_visa, p.doc_billet]
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

  // Paiements
  const [paiements, setPaiements] = useState([])
  const [paiementForm, setPaiementForm] = useState({ montant: '', mode: 'Wave', notes: '' })
  const [paiementLoading, setPaiementLoading] = useState(false)
  const [showPaiementForm, setShowPaiementForm] = useState(false)

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

  async function fetchPaiements(pelerinId) {
    const { data } = await supabase
      .from('paiements')
      .select('*')
      .eq('pelerin_id', pelerinId)
      .order('created_at', { ascending: false })
    setPaiements(data || [])
  }

  function openNew() { setForm(EMPTY); setModalOpen(true) }

  async function save() {
    if (!form.prenom || !form.nom) { alert('Prénom et nom obligatoires'); return }
    // Si passeport non reçu, on efface les champs passeport
    const data = {
      ...form,
      depart_id: form.depart_id || null,
      num_passeport: form.passeport_recu ? form.num_passeport : '',
      exp_passeport: form.passeport_recu ? form.exp_passeport : '',
      doc_passeport: form.passeport_recu ? form.doc_passeport : false,
    }
    if (form.id) {
      await supabase.from('pelerins').update(data).eq('id', form.id)
    } else {
      await supabase.from('pelerins').insert([data])
    }
    setModalOpen(false)
    setSelected(null)
    fetchAll()
  }

  async function ajouterPaiement(pelerinId) {
    if (!paiementForm.montant || isNaN(parseInt(paiementForm.montant))) {
      alert('Montant invalide'); return
    }
    setPaiementLoading(true)
    const montant = parseInt(paiementForm.montant)
    await supabase.from('paiements').insert([{
      pelerin_id: pelerinId,
      montant,
      mode: paiementForm.mode,
      notes: paiementForm.notes || null,
    }])
    // Mettre à jour montant_paye dans pelerins
    const pelerin = pelerins.find(p => p.id === pelerinId)
    const nouveauTotal = (pelerin?.montant_paye || 0) + montant
    await supabase.from('pelerins').update({ montant_paye: nouveauTotal }).eq('id', pelerinId)
    setPaiementForm({ montant: '', mode: 'Wave', notes: '' })
    setShowPaiementForm(false)
    setPaiementLoading(false)
    fetchAll()
    fetchPaiements(pelerinId)
  }

  async function supprimerPaiement(paiement) {
    if (!confirm('Supprimer ce paiement ?')) return
    await supabase.from('paiements').delete().eq('id', paiement.id)
    const pelerin = pelerins.find(p => p.id === paiement.pelerin_id)
    const nouveauTotal = Math.max(0, (pelerin?.montant_paye || 0) - paiement.montant)
    await supabase.from('pelerins').update({ montant_paye: nouveauTotal }).eq('id', paiement.pelerin_id)
    fetchAll()
    fetchPaiements(paiement.pelerin_id)
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
  const totalSel = sel ? (sel.prix_total || 0) + (sel.option_tgv ? (sel.montant_tgv || 0) : 0) : 0
  const pct = sel && totalSel > 0 ? Math.round(((sel.montant_paye || 0) / totalSel) * 100) : 0

  // Quand on sélectionne un pèlerin, charger ses paiements
  useEffect(() => {
    if (selected) {
      fetchPaiements(selected)
      setShowPaiementForm(false)
    } else {
      setPaiements([])
    }
  }, [selected])

  const MODE_ICONS = { 'Wave': '🌊', 'Orange Money': '🟠', 'Chèque': '📄', 'Cash': '💵' }

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
              <option value="RAHMA">🤲 RAHMA</option>
              <option value="PERSONNALISE">✏️ Personnalisée</option>
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
                const tot = (p.prix_total||0) + (p.option_tgv ? (p.montant_tgv||0) : 0)
                const paiePct = tot > 0 ? Math.round(((p.montant_paye||0)/tot)*100) : 0
                const isActive = selected === p.id
                return (
                  <div key={p.id}
                    onClick={() => setSelected(isActive ? null : p.id)}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all border-b border-gray-50 last:border-0
                      ${isActive ? 'bg-green-50 border-l-4 border-l-green-700' : 'hover:bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                         style={{ background: '#0F5229', color: '#C9A84C' }}>
                      {getInitials(p)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{p.prenom} {p.nom}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {getDep(p.depart_id)} · {p.formule} · {p.sexe === 'femme' ? '👩' : '👨'}
                        {p.option_tgv && <span className="ml-1 text-blue-500">🚄 TGV</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold mb-1" style={{ color: paiePct === 100 ? '#1A7A3C' : '#ED8936' }}>{paiePct}%</div>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: paiePct + '%', background: paiePct === 100 ? '#1A7A3C' : '#ED8936' }}/>
                      </div>
                    </div>
                    <span className={`badge ${ds === 'complet' ? 'badge-ok' : ds === 'incomplet' ? 'badge-err' : 'badge-warn'}`}>
                      {ds === 'complet' ? '✓' : ds === 'incomplet' ? '✗' : '⚠'}
                    </span>
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

              <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Infos */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: 'Téléphone', v: sel.telephone || '—' },
                    { l: 'Famille', v: sel.tel_famille || '—' },
                    { l: 'Passeport', v: sel.passeport_recu ? (sel.num_passeport || '—') : '⚠ Non reçu' },
                    { l: 'Exp. passeport', v: sel.passeport_recu ? (sel.exp_passeport || '—') : '—' },
                    { l: 'Médical', v: sel.medical || 'Aucun' },
                    { l: 'Statut', v: STATUT_CONFIG[sel.statut]?.label || sel.statut },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 uppercase font-semibold mb-1">{l}</div>
                      <div className="text-sm font-semibold text-gray-700">{v}</div>
                    </div>
                  ))}
                </div>

                {/* Option TGV */}
                {sel.option_tgv && (
                  <div>
                    <div className="font-semibold text-gray-700 mb-2 text-sm">🚄 Option TGV</div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-blue-400 uppercase font-semibold mb-0.5">Montant TGV</div>
                      <div className="text-sm font-bold text-blue-900">
                        {(sel.montant_tgv || 0).toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  </div>
                )}

                {/* Paiement */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-700 text-sm">💰 Paiements</div>
                    <button
                      onClick={() => setShowPaiementForm(v => !v)}
                      className="text-xs px-3 py-1 rounded-full font-semibold"
                      style={{ background: '#E8F5EE', color: '#0F5229' }}>
                      {showPaiementForm ? '✕ Annuler' : '+ Ajouter un paiement'}
                    </button>
                  </div>

                  {/* Formulaire ajout paiement */}
                  {showPaiementForm && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 font-semibold uppercase mb-1 block">Montant (FCFA)</label>
                          <input
                            className="input text-sm"
                            type="number"
                            placeholder="Ex : 500000"
                            value={paiementForm.montant}
                            onChange={e => setPaiementForm(f => ({ ...f, montant: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-semibold uppercase mb-1 block">Mode de paiement</label>
                          <select
                            className="input text-sm"
                            value={paiementForm.mode}
                            onChange={e => setPaiementForm(f => ({ ...f, mode: e.target.value }))}>
                            {MODE_PAIEMENT.map(m => <option key={m} value={m}>{MODE_ICONS[m]} {m}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-semibold uppercase mb-1 block">Notes (optionnel)</label>
                        <input
                          className="input text-sm"
                          placeholder="Ex : 1er versement..."
                          value={paiementForm.notes}
                          onChange={e => setPaiementForm(f => ({ ...f, notes: e.target.value }))}
                        />
                      </div>
                      <button
                        onClick={() => ajouterPaiement(sel.id)}
                        disabled={paiementLoading}
                        className="btn btn-primary w-full text-sm">
                        {paiementLoading ? 'Enregistrement...' : '✓ Enregistrer le paiement'}
                      </button>
                    </div>
                  )}

                  {/* Résumé financier */}
                  <div className="text-2xl font-bold mb-1" style={{ color: '#1A7A3C' }}>
                    {(sel.montant_paye||0).toLocaleString('fr-FR')} FCFA
                    <span className="text-sm font-normal text-gray-400 ml-1">/ {totalSel.toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full" style={{ width: Math.min(pct, 100) + '%', background: '#1A7A3C' }}/>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mb-3">
                    <span>{pct}% payé</span>
                    <span className={pct < 100 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                      {pct < 100 ? 'Reste : ' + (totalSel-(sel.montant_paye||0)).toLocaleString('fr-FR') + ' FCFA' : '✓ Soldé'}
                    </span>
                  </div>

                  {/* Historique paiements */}
                  {paiements.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Historique</div>
                      {paiements.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                          <span>{MODE_ICONS[p.mode] || '💳'}</span>
                          <span className="font-semibold text-gray-700">{(p.montant||0).toLocaleString('fr-FR')} FCFA</span>
                          <span className="text-xs text-gray-400">{p.mode}</span>
                          {p.notes && <span className="text-xs text-gray-400 flex-1 truncate">— {p.notes}</span>}
                          <span className="text-xs text-gray-300 ml-auto">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : ''}
                          </span>
                          <button onClick={() => supprimerPaiement(p)} className="text-red-300 hover:text-red-500 text-xs ml-1">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {paiements.length === 0 && (
                    <div className="text-xs text-gray-300 italic">Aucun paiement enregistré</div>
                  )}
                </div>

                {/* Documents */}
                <div>
                  <div className="font-semibold text-gray-700 mb-2 text-sm">📋 Documents</div>
                  <div className="space-y-1.5">
                    {[
                      { key: 'doc_passeport', label: 'Passeport' },
                      { key: 'doc_photo',     label: 'Photo identité' },
                      { key: 'doc_vaccin',    label: 'Vaccination' },
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
                  <button onClick={() => {
                    setForm({
                      ...sel,
                      depart_id: sel.depart_id || '',
                      passeport_recu: sel.passeport_recu || (!!sel.num_passeport),
                    })
                    setModalOpen(true)
                  }}
                    className="btn btn-primary flex-1 text-sm">✏️ Modifier</button>
                  <a href={`/pelerins/${sel.id}/imprimer`} target="_blank"
                    className="btn text-sm flex items-center gap-1"
                    style={{background:'#F0FFF4',borderColor:'#A7F3D0',color:'#0F5229',textDecoration:'none'}}>
                    🖨️ Imprimer
                  </a>
                  <a href={`/pelerins/${sel.id}/facture`} target="_blank"
                    className="btn text-sm flex items-center gap-1"
                    style={{background:'#FEF9E7',borderColor:'#F9E79F',color:'#B7950B',textDecoration:'none'}}>
                    🧾 Facture
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
              <option value="RAHMA">🤲 Formule RAHMA</option>
              <option value="PERSONNALISE">✏️ Formule Personnalisée</option>
            </select>
          </div>
          <div>
            <label className="label">Prix du package (FCFA)</label>
            <input className="input" type="number" value={form.prix_total || ''} onChange={e => set('prix_total', parseInt(e.target.value)||0)} placeholder="Saisir le prix de cette saison..." />
            <p className="text-xs text-gray-400 mt-1">Le prix varie selon les saisons — saisir le montant exact.</p>
          </div>
          <div><label className="label">Départ</label>
            <select className="input" value={form.depart_id} onChange={e => set('depart_id', e.target.value)}>
              <option value="">— Choisir un départ —</option>
              {departs.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </div>

          {/* ── PASSEPORT ── */}
          <div className="col-span-2">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.passeport_recu || false}
                    onChange={e => set('passeport_recu', e.target.checked)}
                    className="w-4 h-4 accent-green-700"
                  />
                  <span className="font-semibold text-gray-700 text-sm">📘 Passeport reçu</span>
                </label>
                {!form.passeport_recu && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Non reçu — à compléter plus tard</span>
                )}
              </div>
              {form.passeport_recu && (
                <div className="p-4 bg-white grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">N° Passeport</label>
                    <input className="input" value={form.num_passeport} onChange={e => set('num_passeport', e.target.value)} placeholder="SN123456" />
                  </div>
                  <div>
                    <label className="label">Expiration passeport</label>
                    <input className="input" type="date" value={form.exp_passeport} onChange={e => set('exp_passeport', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={form.doc_passeport} onChange={e => set('doc_passeport', e.target.checked)} className="w-4 h-4 accent-green-700" />
                      ✅ Copie passeport reçue dans le dossier
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

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
              {[['doc_photo','Photo'],['doc_vaccin','Vaccination'],['doc_visa','Visa'],['doc_billet','Billet']].map(([k,l]) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} className="w-4 h-4 accent-green-700" />
                  {l}
                </label>
              ))}
            </div>
          </div>

          {/* ── OPTION TGV ── */}
          <div className="col-span-2">
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.option_tgv || false} onChange={e => set('option_tgv', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="font-semibold text-blue-800 text-sm">🚄 Option TGV</span>
                </label>
              </div>
              {form.option_tgv && (
                <div className="p-4 bg-white">
                  <label className="label text-blue-700">Montant TGV (FCFA)</label>
                  <input className="input" type="number" value={form.montant_tgv || ''} onChange={e => set('montant_tgv', parseInt(e.target.value)||0)} placeholder="Ex : 150000" />
                </div>
              )}
            </div>
          </div>

        </div>
      </Modal>
    </Layout>
  )
}
