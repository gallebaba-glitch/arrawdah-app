import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

// ─── CONSTANTES ───────────────────────────────────
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

// ─── HIJRI ────────────────────────────────────────
function gregToJD(d,m,y){return Math.floor((1461*(y+4800+Math.floor((m-14)/12)))/4)+Math.floor((367*(m-2-12*Math.floor((m-14)/12)))/12)-Math.floor((3*Math.floor((y+4900+Math.floor((m-14)/12))/100))/4)+d-32075}
function jdToHeg(jd){const l=jd-1948440+10632;const n=Math.floor((l-1)/10631);const ll=l-10631*n+354;const j=Math.floor((10985-ll)/5316)*Math.floor((50*ll)/17719)+Math.floor(ll/5670)*Math.floor((43*ll)/15238);const lll=ll-Math.floor((30-j)/15)*Math.floor((17719*j)/50)-Math.floor(j/16)*Math.floor((15238*j)/43)+29;const month=Math.floor((24*lll)/709);const day=lll-Math.floor((709*month)/24);const year=30*n+j-29;return{day,month,year}}
const MOIS=['Mouharram','Safar','Rabi Al Awwal','Rabi Ath Thania','Joumada Al Oula','Joumada Ath Thania','Rajab','Chaabane','Ramadan','Chawwal','Dhou Al Qida','Dhou Al Hijja']
function toHijri(s){if(!s)return '';const[y,m,d]=s.split('-').map(Number);const h=jdToHeg(gregToJD(d,m,y));return`${h.day} ${MOIS[h.month-1]} ${h.year}H`}

// ─── STATUT GLOBAL ────────────────────────────────
function statutGlobal(pelerins){
  if(!pelerins.length)return{emoji:'⚪',label:'Vide'}
  const docs=pelerins.filter(p=>p.doc_passeport&&p.doc_photo&&p.doc_vaccin&&p.doc_visa&&p.doc_billet).length
  const pai=pelerins.filter(p=>(p.montant_paye||0)>=(p.prix_total||1)&&(p.prix_total||0)>0).length
  const score=((docs+pai)/(pelerins.length*2))*100
  if(score>=90)return{emoji:'🟢',label:'Prêt'}
  if(score>=50)return{emoji:'🟡',label:'Presque prêt'}
  return{emoji:'🔴',label:'Non prêt'}
}

// ─── GÉNÉRATION AUTO CHAMBRES ─────────────────────
// Construit les chambres depuis chambre_numero sauvegardé OU auto
function buildChambres(pelerins) {
  const assigned = pelerins.filter(p => p.chambre_numero != null)
  const unassigned = pelerins.filter(p => p.chambre_numero == null)

  // Regrouper les assignés par numéro de chambre
  const byNum = {}
  assigned.forEach(p => {
    if (!byNum[p.chambre_numero]) byNum[p.chambre_numero] = []
    byNum[p.chambre_numero].push(p)
  })

  // Construire les chambres sauvegardées
  let chambres = Object.entries(byNum).map(([num, pels]) => {
    const formule = pels[0]?.formule || 'ZEN'
    const sexe = pels[0]?.sexe || 'homme'
    const capBase = formule === 'ELITE' ? 2 : 4
    return {
      id: `ch_${num}`,
      numero: parseInt(num),
      formule, sexe,
      cap: Math.max(capBase, pels.length),
      pelerins: pels,
      saved: true
    }
  }).sort((a,b) => a.numero - b.numero)

  // Répartir automatiquement les non assignés par groupe formule+sexe
  if (unassigned.length > 0) {
    const g = { ZEN_homme:[], ZEN_femme:[], ELITE_homme:[], ELITE_femme:[] }
    unassigned.forEach(p => {
      const k = `${p.formule}_${p.sexe||'homme'}`
      if (g[k]) g[k].push(p)
    })

    // Numéro de départ = max des chambres existantes + 1
    let nextNum = chambres.length > 0 ? Math.max(...chambres.map(c => c.numero)) + 1 : 1

    Object.entries(g).forEach(([key, liste]) => {
      if (!liste.length) return
      const [formule, sexe] = key.split('_')
      const cap = formule === 'ELITE' ? 2 : 4

      // D'abord remplir les chambres existantes compatibles
      const restants = []
      liste.forEach(p => {
        const compatible = chambres.find(c =>
          c.formule === formule &&
          c.sexe === sexe &&
          c.pelerins.length < c.cap
        )
        if (compatible) {
          compatible.pelerins = [...compatible.pelerins, p]
        } else {
          restants.push(p)
        }
      })

      // Regrouper les restants par tranches de cap (4 pour ZEN, 2 pour ELITE)
      for (let i = 0; i < restants.length; i += cap) {
        const groupe = restants.slice(i, i + cap)
        const newCh = {
          id: `auto_${nextNum}`,
          numero: nextNum++,
          formule, sexe, cap,
          pelerins: groupe,
          saved: false
        }
        chambres.push(newCh)
      }
    })
  }

  return { chambres, nonAssignes: [] }
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────
export default function Departs() {
  const [departs, setDeparts] = useState([])
  const [pelerins, setPelerins] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('liste')
  const [chambresEdit, setChambresEdit] = useState(null) // état local édition
  const [moveModal, setMoveModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
    if (k === 'date_greg') setForm(f => ({ ...f, date_greg: v, date_heg: toHijri(v) }))
    else setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    if (!form.nom) { alert('Nom du départ obligatoire'); return }
    if (form.id) await supabase.from('departs').update(form).eq('id', form.id)
    else await supabase.from('departs').insert([form])
    setModalOpen(false); fetchAll()
  }

  async function supprimer(id) {
    const d = departs.find(x => x.id === id)
    const count = pelerins.filter(p => p.depart_id == id).length
    let msg = `Supprimer "${d?.nom}" ?`
    if (count > 0) msg += `\n\n⚠️ ${count} pèlerin(s) seront désassignés.`
    if (!confirm(msg)) return
    await supabase.from('pelerins').update({ depart_id: null }).eq('depart_id', id)
    await supabase.from('departs').delete().eq('id', id)
    setSelected(null); setChambresEdit(null); fetchAll()
  }

  function selectDepart(id) {
    setSelected(id === selected ? null : id)
    setChambresEdit(null)
    setActiveTab('liste')
    setSaved(false)
  }

  const sel = selected ? departs.find(x => x.id === selected) : null
  const selPelerins = sel ? pelerins.filter(p => p.depart_id == sel.id) : []
  const sg = sel ? statutGlobal(selPelerins) : null

  // Chambres affichées : édition locale OU depuis Supabase
  const { chambres: chambresBase, nonAssignes: nonAssignesBase } = sel
    ? buildChambres(selPelerins)
    : { chambres: [], nonAssignes: [] }

  const chambres = chambresEdit || chambresBase
  const pelerinsAssignesIds = chambres.flatMap(c => c.pelerins.map(p => p.id))
  const nonAssignes = chambresEdit
    ? selPelerins.filter(p => !pelerinsAssignesIds.includes(p.id))
    : nonAssignesBase

  // Initialiser l'édition locale
  function initEdit() {
    if (!chambresEdit) {
      setChambresEdit(chambresBase.map(c => ({ ...c, pelerins: [...c.pelerins] })))
    }
  }

  // ── SAUVEGARDER dans Supabase ──
  async function sauvegarderChambres() {
    if (!chambresEdit) return
    setSaving(true)
    try {
      // Remettre à null tous les pèlerins du départ
      await supabase.from('pelerins')
        .update({ chambre_numero: null })
        .eq('depart_id', sel.id)

      // Assigner les nouveaux numéros
      for (const ch of chambresEdit) {
        for (const p of ch.pelerins) {
          await supabase.from('pelerins')
            .update({ chambre_numero: ch.numero })
            .eq('id', p.id)
        }
      }

      // Rafraîchir les données
      const { data: newP } = await supabase.from('pelerins').select('*')
      setPelerins(newP || [])
      setChambresEdit(null) // Réinitialiser l'édition
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch(e) {
      alert('Erreur lors de la sauvegarde : ' + e.message)
    }
    setSaving(false)
  }

  // ── RÉINITIALISER ──
  async function reinitialiserChambres() {
    if (!confirm('Réinitialiser la répartition automatique ? Les assignations sauvegardées seront effacées.')) return
    setSaving(true)
    await supabase.from('pelerins')
      .update({ chambre_numero: null })
      .eq('depart_id', sel.id)
    const { data: newP } = await supabase.from('pelerins').select('*')
    setPelerins(newP || [])
    setChambresEdit(null)
    setSaving(false)
  }

  // ── ACTIONS LOCALES CHAMBRES ──
  function ajouterPlace(chambreId) {
    initEdit()
    setChambresEdit(prev => {
      const data = (prev || chambresBase).map(c => ({ ...c, pelerins: [...c.pelerins] }))
      return data.map(c => c.id === chambreId ? { ...c, cap: c.cap + 1 } : c)
    })
  }

  function retirerPlace(chambreId) {
    initEdit()
    setChambresEdit(prev => {
      const data = (prev || chambresBase).map(c => ({ ...c, pelerins: [...c.pelerins] }))
      return data.map(c => {
        if (c.id !== chambreId) return c
        if (c.cap <= c.pelerins.length) { alert('Retirez d\'abord un pèlerin avant de diminuer la capacité.'); return c }
        if (c.cap <= 1) { alert('Capacité minimale : 1 place.'); return c }
        return { ...c, cap: c.cap - 1 }
      })
    })
  }

  function retirerPelerin(pelerin, chambreId) {
    initEdit()
    setChambresEdit(prev => {
      const data = (prev || chambresBase).map(c => ({ ...c, pelerins: [...c.pelerins] }))
      const ch = data.find(c => c.id === chambreId)
      if (ch) ch.pelerins = ch.pelerins.filter(p => p.id !== pelerin.id)
      return data
    })
  }

  function ouvrirDeplacement(pelerin, fromChambre) {
    initEdit()
    setMoveModal({ pelerin, fromChambre })
  }

  function deplacerPelerin(toChambreId) {
    if (!moveModal) return
    const { pelerin, fromChambre } = moveModal
    setChambresEdit(prev => {
      const data = (prev || chambresBase).map(c => ({ ...c, pelerins: [...c.pelerins] }))
      const src = data.find(c => c.id === fromChambre.id)
      if (src) src.pelerins = src.pelerins.filter(p => p.id !== pelerin.id)
      const tgt = data.find(c => c.id === toChambreId)
      if (tgt) {
        if (tgt.pelerins.length >= tgt.cap) {
          alert(`La chambre ${tgt.numero} est complète. Augmentez sa capacité d'abord.`)
          return prev
        }
        tgt.pelerins = [...tgt.pelerins, pelerin]
      }
      return data
    })
    setMoveModal(null)
  }

  function ajouterPelerinDansChambre(pelerin, chambreId) {
    initEdit()
    setChambresEdit(prev => {
      const data = (prev || chambresBase).map(c => ({ ...c, pelerins: [...c.pelerins] }))
      const ch = data.find(c => c.id === chambreId)
      if (ch) {
        if (ch.pelerins.length >= ch.cap) { alert(`Chambre ${ch.numero} complète.`); return prev }
        ch.pelerins = [...ch.pelerins, pelerin]
      }
      return data
    })
  }

  // ── EXPORT ────────────────────────────────────
  function printEmbarquement() {
    // Trier par ordre alphabétique du nom de famille
    const sorted = [...selPelerins].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    const mid = Math.ceil(sorted.length / 2)
    const col1 = sorted.slice(0, mid)
    const col2 = sorted.slice(mid)

    const makeRows = (list, startIdx) => list.map((p, i) => `
      <tr>
        <td style="text-align:center;width:30px">${startIdx + i + 1}</td>
        <td><strong>${p.nom}</strong> ${p.prenom}</td>
        <td style="text-align:center;width:30px">${p.sexe === 'femme' ? 'F' : 'H'}</td>
        <td style="text-align:center;width:40px">☐</td>
      </tr>`).join('')

    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Embarquement ${sel.nom}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; padding: 16px; font-size: 13px; }
      h1 { color: #0F5229; font-size: 17px; margin-bottom: 4px; text-align: center; }
      .meta { color: #555; font-size: 12px; margin-bottom: 12px; text-align: center; }
      .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #0F5229; color: white; padding: 6px 8px; text-align: left; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      td { border: 1px solid #ddd; padding: 5px 8px; font-size: 13px; }
      tr:nth-child(even) td { background: #F5FAF7; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <h1>Liste d'embarquement — ${sel.nom} · Aéroport Blaise Diagne</h1>
    <p class="meta">
      ${sel.date_greg || ''} ${sel.date_heg ? '(' + sel.date_heg + ')' : ''} &nbsp;·&nbsp;
      Vol : ${sel.vol || '—'} &nbsp;·&nbsp;
      Guide : ${sel.guide || '—'} &nbsp;·&nbsp;
      Total : ${selPelerins.length} pèlerins
    </p>
    <div class="columns">
      <table>
        <tr><th>#</th><th>Nom · Prénom</th><th>Sx</th><th>✓</th></tr>
        ${makeRows(col1, 0)}
      </table>
      <table>
        <tr><th>#</th><th>Nom · Prénom</th><th>Sx</th><th>✓</th></tr>
        ${makeRows(col2, mid)}
      </table>
    </div>
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  function printChambres() {
    const labelCh = (c) => {
      const h = c.pelerins.filter(p => p.sexe !== 'femme').length
      const f = c.pelerins.filter(p => p.sexe === 'femme').length
      if (h > 0 && f > 0) return 'Couple'
      if (f > 0) return 'Femmes'
      return 'Hommes'
    }
    const colorCh = (c) => {
      const h = c.pelerins.filter(p => p.sexe !== 'femme').length
      const f = c.pelerins.filter(p => p.sexe === 'femme').length
      if (h > 0 && f > 0) return '#7B3F00'
      if (f > 0) return '#862D59'
      return '#0F5229'
    }
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Chambres ${sel.nom}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; padding: 20px; background: white; }
      h1 { color: #0F5229; font-size: 18px; margin-bottom: 4px; }
      .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .ch { border-radius: 8px; overflow: hidden; border: 1px solid #ddd; break-inside: avoid; }
      .ch-h { padding: 8px 12px; font-weight: bold; font-size: 12px; color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .ch-b { padding: 8px 12px; background: #f9f9f9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pelerin { font-size: 12px; padding: 3px 0; border-bottom: 1px solid #eee; }
      .pelerin:last-child { border-bottom: none; }
      .dispo { font-size: 11px; color: #bbb; padding: 3px 0; font-style: italic; }
      .hotel-num { font-size: 11px; color: #333; padding: 5px 0 2px 0; margin-top: 4px; border-top: 1px dashed #ccc; font-weight: bold; }
      .badge { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 10px; margin-left: 4px; font-weight: bold; }
      .badge-h { background: #DBEAFE; color: #1E40AF; }
      .badge-f { background: #FCE7F3; color: #9D174D; }
      @media print {
        body { padding: 10px; }
        .grid { gap: 8px; }
        .ch { break-inside: avoid; }
      }
    </style></head><body>
    <h1>Répartition des chambres — ${sel.nom}</h1>
    <p class="subtitle">${sel.date_greg || ''} ${sel.date_heg ? '(' + sel.date_heg + ')' : ''} · ${selPelerins.length} pèlerins · ${chambres.length} chambres · Guide : ${sel.guide || '—'}</p>
    <div class="grid">
    ${chambres.map(c => `
      <div class="ch">
        <div class="ch-h" style="background-color:${colorCh(c)};">
          Chambre ${c.numero} — ${labelCh(c)} · ${c.formule} (${c.pelerins.length}/${c.cap})
        </div>
        <div class="ch-b">
          ${c.pelerins.map(p => `
            <div class="pelerin">
              ${p.prenom} ${p.nom}
              <span class="badge ${p.sexe === 'femme' ? 'badge-f' : 'badge-h'}">${p.sexe === 'femme' ? 'F' : 'H'}</span>
            </div>`).join('')}
          ${Array.from({length: c.cap - c.pelerins.length}).map(() =>
            '<div class="dispo">— Place disponible</div>'
          ).join('')}
          <div class="hotel-num">N° chambre hôtel : _______________</div>
        </div>
      </div>`).join('')}
    </div>
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  // ── RENDER ────────────────────────────────────
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
            className="px-5 py-2.5 rounded-lg text-white font-semibold" style={{ background: '#0F5229' }}>
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
                const sg2 = statutGlobal(dp)
                const isActive = selected === d.id
                return (
                  <div key={d.id} onClick={() => selectDepart(d.id)}
                    className="bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md"
                    style={{ borderColor: isActive ? '#0F5229' : '#E5EDE8', borderLeftWidth: isActive ? '4px' : '1px', background: isActive ? '#F0FFF4' : 'white' }}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800">✈️ {d.nom}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {d.date_greg && <span>{d.date_greg}</span>}
                            {d.date_heg && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#E8F5EE', color: '#0F5229' }}>{d.date_heg}</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{d.guide || 'Guide non assigné'} · {d.duree}j</div>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <span className="text-lg" title={sg2.label}>{sg2.emoji}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT[d.statut]?.cls}`}>{STATUT[d.statut]?.label}</span>
                          <button onClick={() => { setForm(d); setModalOpen(true) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-sm">✏️</button>
                          <button onClick={() => supprimer(d.id)} className="p-1.5 rounded-lg text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>🗑️</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 rounded-full" style={{ background: '#E5EDE8' }}>
                          <div className="h-full rounded-full" style={{ width: pct + '%', background: '#1A7A3C' }} />
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
              <div className="bg-white rounded-xl border sticky top-20" style={{ borderColor: '#E5EDE8' }}>

                {/* Header */}
                <div className="p-4 rounded-t-xl flex items-center justify-between" style={{ background: '#0F5229' }}>
                  <div>
                    <div className="text-white font-bold">✈️ {sel.nom}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#F0D080' }}>{sel.date_heg || sel.date_greg}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{sg.emoji}</span>
                    <span className="text-white text-xs font-semibold">{sg.label}</span>
                    <button onClick={() => { setSelected(null); setChambresEdit(null) }} className="text-white/60 hover:text-white ml-2">✕</button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-0 border-b" style={{ borderColor: '#E5EDE8' }}>
                  {[
                    { label: 'Total', val: selPelerins.length },
                    { label: 'Hommes', val: selPelerins.filter(p => p.sexe !== 'femme').length },
                    { label: 'Femmes', val: selPelerins.filter(p => p.sexe === 'femme').length },
                    { label: 'Chambres', val: chambres.length },
                  ].map(s => (
                    <div key={s.label} className="p-3 text-center border-r last:border-r-0" style={{ borderColor: '#E5EDE8' }}>
                      <div className="text-xl font-bold" style={{ color: '#0F5229' }}>{s.val}</div>
                      <div className="text-xs text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: '#E5EDE8' }}>
                  {[['liste', 'Pèlerins'], ['chambres', 'Chambres'], ['export', 'Export']].map(([t, l]) => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className="flex-1 py-2.5 text-xs font-semibold transition-all"
                      style={activeTab === t ? { borderBottom: '2px solid #0F5229', color: '#0F5229' } : { color: '#6B7280' }}>
                      {l}
                    </button>
                  ))}
                </div>

                <div className="max-h-[500px] overflow-y-auto">

                  {/* ── PÈLERINS ── */}
                  {activeTab === 'liste' && (
                    <div>
                      {selPelerins.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">Aucun pèlerin inscrit</div>
                      ) : selPelerins.map((p, i) => {
                        const pct = Math.round(((p.montant_paye || 0) / (p.prix_total || 1)) * 100)
                        const docsOk = [p.doc_passeport, p.doc_photo, p.doc_vaccin, p.doc_visa, p.doc_billet].filter(Boolean).length
                        return (
                          <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: '#F0F0F0' }}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: '#0F5229', color: '#C9A84C' }}>{i + 1}</div>
                            <span className="text-sm flex-shrink-0">{p.sexe === 'femme' ? '👩' : '👨'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">{p.prenom} {p.nom}</div>
                              <div className="text-xs text-gray-400">{p.formule}</div>
                            </div>
                            <span className={`text-xs flex-shrink-0 ${pct >= 100 ? 'text-green-600 font-semibold' : 'text-orange-500'}`}>{pct}%</span>
                            <span className={`text-xs flex-shrink-0 ${docsOk === 5 ? 'text-green-600' : 'text-red-500'}`}>{docsOk}/5</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── CHAMBRES ── */}
                  {activeTab === 'chambres' && (
                    <div className="p-3">

                      {/* Barre actions */}
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {chambresEdit ? '✏️ Modifications en cours' : chambresBase[0]?.saved ? '💾 Sauvegardé' : '🔄 Auto'}
                        </div>
                        <div className="flex gap-2">
                          {chambresEdit && (
                            <>
                              <button onClick={reinitialiserChambres}
                                className="text-xs px-2 py-1 rounded-lg border"
                                style={{ borderColor: '#E5EDE8', color: '#666' }}>
                                🔄 Réinitialiser
                              </button>
                              <button onClick={sauvegarderChambres} disabled={saving}
                                className="text-xs px-3 py-1 rounded-lg text-white font-semibold"
                                style={{ background: saving ? '#6B9E7A' : '#0F5229' }}>
                                {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                              </button>
                            </>
                          )}
                          {saved && !chambresEdit && (
                            <span className="text-xs text-green-600 font-semibold">✅ Sauvegardé !</span>
                          )}
                        </div>
                      </div>

                      {/* Pèlerins non assignés */}
                      {nonAssignes.length > 0 && (
                        <div className="mb-3 p-3 rounded-lg border-2 border-dashed" style={{ borderColor: '#FCA5A5', background: '#FFF5F5' }}>
                          <div className="text-xs font-bold text-red-500 mb-2">⚠️ Non assignés ({nonAssignes.length})</div>
                          {nonAssignes.map(p => (
                            <div key={p.id} className="flex items-center justify-between text-xs p-1.5 bg-white rounded border mb-1" style={{ borderColor: '#FECACA' }}>
                              <span>{p.sexe === 'femme' ? '👩' : '👨'} {p.prenom} {p.nom} — {p.formule}</span>
                              <select onChange={e => { if (e.target.value) ajouterPelerinDansChambre(p, e.target.value) }}
                                className="text-xs border rounded px-1 py-0.5 ml-2" defaultValue="">
                                <option value="">→ Chambre</option>
                                {chambres.map(c => (
                                  <option key={c.id} value={c.id} disabled={c.pelerins.length >= c.cap}>
                                    Ch.{c.numero} {c.sexe === 'femme' ? 'F' : 'H'}/{c.formule} ({c.pelerins.length}/{c.cap})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Chambres */}
                      {chambres.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">Aucun pèlerin inscrit</div>
                      ) : chambres.map(ch => (
                        <div key={ch.id} className="border rounded-lg overflow-hidden mb-3" style={{ borderColor: '#E5EDE8' }}>
                          <div className="flex items-center justify-between px-3 py-2"
                            style={{ background: ch.sexe === 'femme' ? '#FFF0F6' : '#EFF8FF' }}>
                            <div className="text-xs font-bold text-gray-700">
                              Chambre {ch.numero} — {
                                (() => {
                                  const h = ch.pelerins.filter(p => p.sexe !== 'femme').length
                                  const f = ch.pelerins.filter(p => p.sexe === 'femme').length
                                  if (h > 0 && f > 0) return '👫 Couple'
                                  if (f > 0) return '👩 Femmes'
                                  return '👨 Hommes'
                                })()
                              } · {ch.formule}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: ch.pelerins.length >= ch.cap ? '#FEE2E2' : '#E8F5EE', color: ch.pelerins.length >= ch.cap ? '#991B1B' : '#0F5229' }}>
                                {ch.pelerins.length}/{ch.cap}
                              </span>
                              <button onClick={() => retirerPlace(ch.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                                style={{ background: '#FEE2E2', color: '#991B1B' }} title="Retirer une place">−</button>
                              <button onClick={() => ajouterPlace(ch.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                                style={{ background: '#E8F5EE', color: '#0F5229' }} title="Ajouter une place">+</button>
                            </div>
                          </div>
                          <div className="divide-y" style={{ borderColor: '#F0F0F0' }}>
                            {ch.pelerins.map(p => (
                              <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                                <span className="text-sm">{p.sexe === 'femme' ? '👩' : '👨'}</span>
                                <span className="text-sm flex-1">{p.prenom} {p.nom}</span>
                                <span className="text-xs text-gray-400">{p.formule}</span>
                                <button onClick={() => ouvrirDeplacement(p, ch)}
                                  className="text-xs px-2 py-0.5 rounded-lg"
                                  style={{ background: '#EFF8FF', color: '#1D4ED8' }} title="Déplacer">↔️</button>
                                <button onClick={() => retirerPelerin(p, ch.id)}
                                  className="text-xs px-2 py-0.5 rounded-lg"
                                  style={{ background: '#FEF2F2', color: '#DC2626' }} title="Retirer">✕</button>
                              </div>
                            ))}
                            {Array.from({ length: ch.cap - ch.pelerins.length }).map((_, i) => (
                              <div key={i} className="px-3 py-2 text-xs text-gray-300 italic">— Place disponible</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── EXPORT ── */}
                  {activeTab === 'export' && (
                    <div className="p-4 space-y-3">
                      <button onClick={printEmbarquement}
                        className="w-full py-3 rounded-lg text-white font-semibold text-sm"
                        style={{ background: '#0F5229' }}>
                        🖨️ Liste d'embarquement
                      </button>
                      <button onClick={printChambres}
                        className="w-full py-3 rounded-lg font-semibold text-sm border"
                        style={{ borderColor: '#0F5229', color: '#0F5229', background: 'white' }}>
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

      {/* ── MODAL DÉPLACEMENT ── */}
      {moveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-4 border-b" style={{ borderColor: '#E5EDE8' }}>
              <div className="font-bold text-gray-800">↔️ Déplacer un pèlerin</div>
              <div className="text-sm text-gray-500 mt-1">
                {moveModal.pelerin.prenom} {moveModal.pelerin.nom} — Chambre {moveModal.fromChambre.numero}
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Chambre de destination</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chambres.filter(c => c.id !== moveModal.fromChambre.id).map(c => (
                  <button key={c.id} onClick={() => deplacerPelerin(c.id)}
                    disabled={c.pelerins.length >= c.cap}
                    className="w-full text-left p-3 rounded-lg border transition-all disabled:opacity-40"
                    style={{ borderColor: '#E5EDE8', background: c.pelerins.length >= c.cap ? '#F9FAFB' : '#F0FFF4' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          Chambre {c.numero} — {
                            (() => {
                              const h = c.pelerins.filter(p => p.sexe !== 'femme').length
                              const f = c.pelerins.filter(p => p.sexe === 'femme').length
                              if (h > 0 && f > 0) return '👫 Couple'
                              if (f > 0) return '👩 Femmes'
                              return '👨 Hommes'
                            })()
                          } · {c.formule}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {c.pelerins.map(p => `${p.prenom} ${p.nom}`).join(', ') || 'Vide'}
                        </div>
                      </div>
                      <span className="text-xs font-bold ml-2 px-2 py-0.5 rounded-full"
                        style={{ background: c.pelerins.length >= c.cap ? '#FEE2E2' : '#E8F5EE', color: c.pelerins.length >= c.cap ? '#991B1B' : '#0F5229' }}>
                        {c.pelerins.length}/{c.cap}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t" style={{ borderColor: '#E5EDE8' }}>
              <button onClick={() => setMoveModal(null)}
                className="w-full py-2 rounded-lg text-sm font-semibold border"
                style={{ borderColor: '#E5EDE8', color: '#6B7280' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DÉPART ── */}
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
              value={form.date_heg} onChange={e => setF('date_heg', e.target.value)} placeholder="Calculée automatiquement" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Durée (jours)</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              type="number" value={form.duree} onChange={e => setF('duree', parseInt(e.target.value) || 14)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Capacité max</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
              type="number" value={form.max_pelerins} onChange={e => setF('max_pelerins', parseInt(e.target.value) || 40)} />
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
              {Object.entries(STATUT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
