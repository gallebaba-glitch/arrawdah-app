import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/useAuth'

const STATUTS = {
  contacte:    { label: 'Contacté',      color: '#6B7280', bg: '#F3F4F6', emoji: '📞' },
  interesse:   { label: 'Intéressé',     color: '#2563EB', bg: '#EFF6FF', emoji: '👀' },
  reflexion:   { label: 'En réflexion',  color: '#D97706', bg: '#FFFBEB', emoji: '🤔' },
  converti:    { label: 'Converti',      color: '#059669', bg: '#ECFDF5', emoji: '✅' },
  perdu:       { label: 'Perdu',         color: '#DC2626', bg: '#FEF2F2', emoji: '❌' },
}

const RAPPELS = [
  { label: '3 jours',   days: 3 },
  { label: '1 semaine', days: 7 },
  { label: '2 semaines',days: 14 },
  { label: '1 mois',    days: 30 },
]

const FORMULES = ['ZEN', 'ELITE', 'RAHMA', 'PERSONNALISÉ']

const EMPTY = {
  nom: '', prenom: '', telephone: '',
  formule: 'ZEN', depart_id: '',
  statut: 'contacte', commentaire: '',
  rappel_date: null,
}

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function isOverdue(rappel_date) {
  if (!rappel_date) return false
  return new Date(rappel_date) <= new Date()
}

function daysUntil(rappel_date) {
  if (!rappel_date) return null
  const diff = Math.ceil((new Date(rappel_date) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function Pipeline() {
  const { user } = useAuth()
  const [prospects, setProspects] = useState([])
  const [departs, setDeparts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [convertModal, setConvertModal] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from('pipeline').select('*').order('updated_at', { ascending: false }),
      supabase.from('departs').select('id, nom').order('created_at', { ascending: false }),
    ])
    setProspects(p || [])
    setDeparts(d || [])
    setLoading(false)
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function openNew() {
    setForm(EMPTY)
    setSelected(null)
    setModalOpen(true)
  }

  function openEdit(p) {
    setForm({ ...p, depart_id: p.depart_id || '' })
    setSelected(p.id)
    setModalOpen(true)
  }

  async function save() {
    if (!form.nom) { alert('Nom obligatoire'); return }
    setSaving(true)
    const data = {
      nom: form.nom || '',
      prenom: form.prenom || '',
      telephone: form.telephone || '',
      formule: form.formule || 'ZEN',
      depart_id: form.depart_id || null,
      statut: form.statut || 'contacte',
      commentaire: form.commentaire || '',
      rappel_date: form.rappel_date || null,
      dernier_contact_par: user?.nom || '',
      dernier_contact_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }
    let error
    if (selected) {
      const res = await supabase.from('pipeline').update(data).eq('id', selected)
      error = res.error
    } else {
      const res = await supabase.from('pipeline').insert([data])
      error = res.error
    }
    if (error) {
      alert('Erreur : ' + error.message)
      setSaving(false)
      return
    }
    setModalOpen(false)
    setSaving(false)
    fetchAll()
  }

  async function updateStatut(id, statut) {
    await supabase.from('pipeline').update({
      statut,
      dernier_contact_par: user?.nom || '',
      dernier_contact_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    fetchAll()
  }

  async function supprimer(id) {
    if (!confirm('Supprimer ce prospect ?')) return
    await supabase.from('pipeline').delete().eq('id', id)
    fetchAll()
  }

  async function setRappel(id, days) {
    await supabase.from('pipeline').update({
      rappel_date: addDays(days),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    fetchAll()
  }

  async function clearRappel(id) {
    await supabase.from('pipeline').update({ rappel_date: null }).eq('id', id)
    fetchAll()
  }

  // Convertir en pèlerin
  async function convertirEnPelerin(prospect) {
    // Créer le pèlerin
    await supabase.from('pelerins').insert([{
      prenom: prospect.prenom || '',
      nom: prospect.nom,
      telephone: prospect.telephone || '',
      formule: prospect.formule || 'ZEN',
      depart_id: prospect.depart_id || null,
      statut: 'inscrit',
      prix_total: 0,
      montant_paye: 0,
    }])
    // Marquer comme converti
    await supabase.from('pipeline').update({ statut: 'converti', updated_at: new Date().toISOString() }).eq('id', prospect.id)
    setConvertModal(false)
    fetchAll()
    alert(`✅ ${prospect.prenom} ${prospect.nom} a été converti en pèlerin ! Complétez son dossier dans la section Pèlerins.`)
  }

  const getDep = id => departs.find(d => d.id == id)?.nom || '—'

  const filtered = prospects.filter(p => {
    const s = (p.prenom + ' ' + p.nom + ' ' + p.telephone).toLowerCase().includes(search.toLowerCase())
    const st = filterStatut === 'tous' || p.statut === filterStatut
    return s && st
  })

  // Compter par statut
  const counts = Object.keys(STATUTS).reduce((acc, k) => {
    acc[k] = prospects.filter(p => p.statut === k).length
    return acc
  }, {})

  // Alertes rappel
  const overdueCount = prospects.filter(p => isOverdue(p.rappel_date) && p.statut !== 'converti' && p.statut !== 'perdu').length

  const sel = selected && !modalOpen ? prospects.find(x => x.id === selected) : null

  return (
    <Layout title={`Pipeline (${prospects.length})`} action={{ label: '+ Nouveau prospect', fn: openNew }}>

      {/* Alerte rappels */}
      {overdueCount > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3"
          style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <span className="text-xl">⏰</span>
          <span className="text-sm font-semibold" style={{ color: '#92400E' }}>
            {overdueCount} prospect{overdueCount > 1 ? 's' : ''} à rappeler aujourd'hui ou en retard
          </span>
        </div>
      )}

      {/* Kanban statuts */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {Object.entries(STATUTS).map(([k, v]) => (
          <div key={k}
            onClick={() => setFilterStatut(filterStatut === k ? 'tous' : k)}
            className="rounded-xl p-3 cursor-pointer transition-all text-center"
            style={{
              background: filterStatut === k ? v.color : v.bg,
              border: `2px solid ${filterStatut === k ? v.color : 'transparent'}`,
            }}>
            <div className="text-xl mb-1">{v.emoji}</div>
            <div className="text-xs font-bold" style={{ color: filterStatut === k ? 'white' : v.color }}>
              {v.label}
            </div>
            <div className="text-lg font-bold mt-1" style={{ color: filterStatut === k ? 'white' : v.color }}>
              {counts[k] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="mb-4">
        <input
          className="input w-full"
          placeholder="Rechercher un prospect..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-30">🎯</div>
          <div className="font-semibold text-gray-600 mb-4">Aucun prospect trouvé</div>
          <button onClick={openNew} className="btn btn-primary">+ Ajouter le premier prospect</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const st = STATUTS[p.statut] || STATUTS.contacte
            const overdue = isOverdue(p.rappel_date) && p.statut !== 'converti' && p.statut !== 'perdu'
            const days = daysUntil(p.rappel_date)
            return (
              <div key={p.id}
                className="bg-white rounded-xl border p-4 transition-all hover:shadow-md"
                style={{ borderColor: overdue ? '#FCA5A5' : '#E5EDE8', borderLeftWidth: '4px', borderLeftColor: st.color }}>
                <div className="flex items-start gap-4">

                  {/* Initiales */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: st.bg, color: st.color }}>
                    {((p.prenom?.[0] || '') + (p.nom?.[0] || '')).toUpperCase() || '?'}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{p.prenom} {p.nom}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: st.bg, color: st.color }}>
                        {st.emoji} {st.label}
                      </span>
                      {p.formule && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {p.formule}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-3">
                      {p.telephone && <span>📞 {p.telephone}</span>}
                      {p.depart_id && <span>✈️ {getDep(p.depart_id)}</span>}
                      {p.dernier_contact_par && (
                        <span>👤 {p.dernier_contact_par} · {p.dernier_contact_date ? new Date(p.dernier_contact_date).toLocaleDateString('fr-FR') : ''}</span>
                      )}
                    </div>
                    {p.commentaire && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 italic">
                        "{p.commentaire}"
                      </div>
                    )}

                    {/* Rappel */}
                    {p.rappel_date && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-1 ${overdue ? 'text-red-700' : 'text-orange-700'}`}
                          style={{ background: overdue ? '#FEE2E2' : '#FEF3C7' }}>
                          ⏰ {overdue
                            ? `En retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`
                            : days === 0 ? "Rappel aujourd'hui"
                            : `Rappel dans ${days} jour${days > 1 ? 's' : ''}`}
                        </span>
                        <button onClick={() => clearRappel(p.id)}
                          className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">

                    {/* Changer statut */}
                    <select
                      value={p.statut}
                      onChange={e => updateStatut(p.id, e.target.value)}
                      className="text-xs border rounded-lg px-2 py-1.5 outline-none"
                      style={{ borderColor: '#E5EDE8', color: st.color, fontWeight: '600' }}>
                      {Object.entries(STATUTS).map(([k, v]) => (
                        <option key={k} value={k}>{v.emoji} {v.label}</option>
                      ))}
                    </select>

                    {/* Rappel */}
                    {p.statut !== 'converti' && p.statut !== 'perdu' && (
                      <select
                        defaultValue=""
                        onChange={e => { if (e.target.value) { setRappel(p.id, parseInt(e.target.value)); e.target.value = '' } }}
                        className="text-xs border rounded-lg px-2 py-1.5 outline-none text-gray-500"
                        style={{ borderColor: '#E5EDE8' }}>
                        <option value="">⏰ Rappeler dans...</option>
                        {RAPPELS.map(r => (
                          <option key={r.days} value={r.days}>{r.label}</option>
                        ))}
                      </select>
                    )}

                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)}
                        className="flex-1 text-xs px-2 py-1.5 rounded-lg font-semibold"
                        style={{ background: '#E8F5EE', color: '#0F5229' }}>
                        ✏️
                      </button>
                      {p.statut === 'interesse' || p.statut === 'reflexion' ? (
                        <button onClick={() => { setSelected(p.id); setConvertModal(true) }}
                          className="flex-1 text-xs px-2 py-1.5 rounded-lg font-semibold"
                          style={{ background: '#D1FAE5', color: '#065F46' }}
                          title="Convertir en pèlerin">
                          🕋
                        </button>
                      ) : null}
                      {user?.role === 'admin' && (
                        <button onClick={() => supprimer(p.id)}
                          className="flex-1 text-xs px-2 py-1.5 rounded-lg"
                          style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL PROSPECT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#E5EDE8' }}>
              <div className="font-bold text-gray-800">{selected ? 'Modifier le prospect' : 'Nouveau prospect'}</div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <input className="input" value={form.prenom} onChange={e => setF('prenom', e.target.value)} placeholder="Aminata" />
                </div>
                <div>
                  <label className="label">Nom *</label>
                  <input className="input" value={form.nom} onChange={e => setF('nom', e.target.value)} placeholder="Diallo" />
                </div>
              </div>

              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={form.telephone} onChange={e => setF('telephone', e.target.value)} placeholder="+221 77 000 00 00" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Formule souhaitée</label>
                  <select className="input" value={form.formule} onChange={e => setF('formule', e.target.value)}>
                    {FORMULES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Départ ciblé</label>
                  <select className="input" value={form.depart_id} onChange={e => setF('depart_id', e.target.value)}>
                    <option value="">— Choisir —</option>
                    {departs.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Statut</label>
                <select className="input" value={form.statut} onChange={e => setF('statut', e.target.value)}>
                  {Object.entries(STATUTS).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Commentaire libre</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.commentaire}
                  onChange={e => setF('commentaire', e.target.value)}
                  placeholder="Notes sur le prospect, historique des échanges..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="label">Date de rappel</label>
                <div className="flex gap-2 flex-wrap">
                  {RAPPELS.map(r => (
                    <button key={r.days}
                      onClick={() => setF('rappel_date', addDays(r.days))}
                      className="text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all"
                      style={{
                        borderColor: form.rappel_date === addDays(r.days) ? '#0F5229' : '#E5EDE8',
                        background: form.rappel_date === addDays(r.days) ? '#0F5229' : 'white',
                        color: form.rappel_date === addDays(r.days) ? 'white' : '#666',
                      }}>
                      {r.label}
                    </button>
                  ))}
                  {form.rappel_date && (
                    <button onClick={() => setF('rappel_date', null)}
                      className="text-xs px-3 py-1.5 rounded-lg border text-red-500"
                      style={{ borderColor: '#FECACA' }}>
                      ✕ Supprimer
                    </button>
                  )}
                </div>
                {form.rappel_date && (
                  <p className="text-xs text-gray-400 mt-1">
                    Rappel fixé au {new Date(form.rappel_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex gap-3" style={{ borderColor: '#E5EDE8' }}>
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-500"
                style={{ borderColor: '#E5EDE8' }}>
                Annuler
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: saving ? '#6B9E7A' : '#0F5229' }}>
                {saving ? 'Enregistrement...' : '✓ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONVERSION */}
      {convertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-5 text-center">
              <div className="text-4xl mb-3">🕋</div>
              <div className="font-bold text-gray-800 text-lg mb-2">Convertir en pèlerin</div>
              {(() => {
                const p = prospects.find(x => x.id === selected)
                return p ? (
                  <>
                    <p className="text-sm text-gray-500 mb-4">
                      {p.prenom} {p.nom} sera ajouté à la liste des pèlerins avec la formule <strong>{p.formule}</strong>
                      {p.depart_id ? ` pour le départ ${getDep(p.depart_id)}` : ''}.
                      Vous pourrez compléter son dossier ensuite.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setConvertModal(false)}
                        className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-500"
                        style={{ borderColor: '#E5EDE8' }}>
                        Annuler
                      </button>
                      <button onClick={() => convertirEnPelerin(p)}
                        className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                        style={{ background: '#0F5229' }}>
                        ✓ Confirmer
                      </button>
                    </div>
                  </>
                ) : null
              })()}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
