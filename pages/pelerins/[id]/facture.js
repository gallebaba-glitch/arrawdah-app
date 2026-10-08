import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../lib/supabase'
import Head from 'next/head'

function genNumeroFacture(pelerinId) {
  const year = new Date().getFullYear()
  const num = String(pelerinId).padStart(3, '0')
  return `AR-${year}-${num}`
}

// Noms des utilisateurs par email
const USERS = {
  'gallebaba@gmail.com':       'Ousmane Niang',
  'mamyfall@icloud.com':       'Hajja Mamy Fall',
  'o.solly@sollytrading.com':  'Sheikh Hussein Solly',
  'madinaarawdah@gmail.com':   'Madina Diallo',
  'mariemediagne79@gmail.com': 'Marieme Diagne',
}

export default function Facture() {
  const router = useRouter()
  const { id } = router.query
  const [pelerin, setPelerin] = useState(null)
  const [depart, setDepart] = useState(null)
  const [paiements, setPaiements] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer l'utilisateur connecté
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const nom = USERS[session.user.email] || session.user.email
        setCurrentUser(nom)
      }
    })
  }, [])

  useEffect(() => { if (id) fetchData() }, [id])

  async function fetchData() {
    const { data: p } = await supabase.from('pelerins').select('*').eq('id', id).single()
    if (p) {
      setPelerin(p)
      if (p.depart_id) {
        const { data: d } = await supabase.from('departs').select('*').eq('id', p.depart_id).single()
        setDepart(d)
      }
      // Charger les paiements
      const { data: pays } = await supabase
        .from('paiements')
        .select('*')
        .eq('pelerin_id', id)
        .order('date_paiement', { ascending: true })
      setPaiements(pays || [])
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial' }}>
      Génération de la facture...
    </div>
  )

  if (!pelerin) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial' }}>
      Pèlerin introuvable.
    </div>
  )

  const numeroFacture = genNumeroFacture(pelerin.id)
  const totalPaye = paiements.length > 0
    ? paiements.reduce((s, p) => s + (p.montant || 0), 0)
    : (pelerin.montant_paye || 0)
  const reste = (pelerin.prix_total || 0) - totalPaye
  const solde = reste <= 0
  const today = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
  const printTime = new Date().toLocaleString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
  const pct = pelerin.prix_total > 0 ? Math.round((totalPaye / pelerin.prix_total) * 100) : 0

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const fmtMontant = (n) => (n || 0).toLocaleString('fr-FR')

  return (
    <>
      <Head>
        <title>Facture {numeroFacture} — {pelerin.prenom} {pelerin.nom}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Boutons action */}
      <div className="no-print" style={{
        position:'fixed', top:'16px', right:'16px', zIndex:100,
        display:'flex', gap:'8px'
      }}>
        <button onClick={() => window.print()} style={{
          padding:'10px 24px', background:'#0F5229', color:'white',
          border:'none', borderRadius:'8px', fontWeight:'600',
          fontSize:'14px', cursor:'pointer', fontFamily:'Arial'
        }}>
          🖨️ Imprimer / PDF
        </button>
        <button onClick={() => router.back()} style={{
          padding:'10px 20px', background:'#F3F4F6', color:'#374151',
          border:'1px solid #E5E7EB', borderRadius:'8px', fontWeight:'600',
          fontSize:'14px', cursor:'pointer', fontFamily:'Arial'
        }}>
          ← Retour
        </button>
      </div>

      {/* FACTURE A4 */}
      <div className="facture-page" style={{
        fontFamily:'Arial, sans-serif',
        fontSize:'11pt',
        color:'#111',
        background:'white',
        maxWidth:'210mm',
        margin:'0 auto',
        padding:'16mm 16mm',
        minHeight:'297mm',
        boxSizing:'border-box',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{
          display:'flex', alignItems:'center',
          justifyContent:'space-between',
          marginBottom:'10px',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <img
              src="/logo-ar-rawdah.png"
              alt="Ar Rawdah Travel Tour"
              style={{ height:'60px', width:'auto', objectFit:'contain', flexShrink:0 }}
              onError={e => { e.target.style.display='none' }}
            />
            <div>
              <div style={{ fontSize:'16pt', fontWeight:'bold', color:'#0F5229' }}>
                Ar Rawdah Travel Tour
              </div>
              <div style={{ fontSize:'10pt', color:'#666', marginTop:'3px' }}>
                (221) 33 840 6161  |  contact@arrawdah.sn
              </div>
              <div style={{ fontSize:'10pt', color:'#666', marginTop:'2px' }}>
                Cité Keur Gorgui, Dakar — Sénégal
              </div>
            </div>
          </div>
          <div style={{
            textAlign:'right',
            padding:'12px 18px',
            background:'#0F5229',
            borderRadius:'8px',
            color:'white',
          }}>
            <div style={{ fontSize:'9pt', opacity:0.8, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              Facture
            </div>
            <div style={{ fontSize:'16pt', fontWeight:'bold', letterSpacing:'1px' }}>
              {numeroFacture}
            </div>
            <div style={{ fontSize:'9pt', opacity:0.8, marginTop:'4px' }}>
              Émise le {today}
            </div>
          </div>
        </div>

        {/* Ligne séparatrice */}
        <div style={{ borderTop:'2px solid #0F5229', marginBottom:'18px' }} />

        {/* ══ STATUT ══ */}
        <div style={{
          display:'inline-block',
          padding:'5px 16px',
          borderRadius:'20px',
          fontSize:'11pt',
          fontWeight:'bold',
          marginBottom:'18px',
          background: solde ? '#D1FAE5' : '#FEF3C7',
          color: solde ? '#065F46' : '#92400E',
          border: `1px solid ${solde ? '#A7F3D0' : '#FDE68A'}`,
        }}>
          {solde ? '✓ FACTURE SOLDÉE' : '⏳ PAIEMENT PARTIEL EN COURS'}
        </div>

        {/* ══ INFOS CLIENT + VOYAGE ══ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'18px' }}>

          {/* Client */}
          <div style={{ border:'1px solid #E5EDE8', borderRadius:'8px', overflow:'hidden' }}>
            <div style={{
              background:'#E8F5EE', padding:'8px 14px',
              fontSize:'9pt', fontWeight:'bold', color:'#0F5229',
              textTransform:'uppercase', letterSpacing:'0.5px',
            }}>
              Informations client
            </div>
            <div style={{ padding:'12px 14px' }}>
              <InfoRow label="Nom complet" value={`${pelerin.prenom} ${pelerin.nom}`} bold />
              <InfoRow label="Téléphone" value={pelerin.telephone || '—'} />
              <InfoRow label="Sexe" value={pelerin.sexe === 'femme' ? 'Femme' : 'Homme'} />
              {pelerin.premiere_oumrah && (
                <InfoRow label="Oumrah" value="⭐ Première Oumrah" />
              )}
            </div>
          </div>

          {/* Voyage — sans guide */}
          <div style={{ border:'1px solid #E5EDE8', borderRadius:'8px', overflow:'hidden' }}>
            <div style={{
              background:'#E8F5EE', padding:'8px 14px',
              fontSize:'9pt', fontWeight:'bold', color:'#0F5229',
              textTransform:'uppercase', letterSpacing:'0.5px',
            }}>
              Détails du voyage
            </div>
            <div style={{ padding:'12px 14px' }}>
              <InfoRow label="Formule" value={
                pelerin.formule === 'ZEN' ? '🌿 Formule ZEN' :
                pelerin.formule === 'ELITE' ? '⭐ Formule ELITE' :
                pelerin.formule === 'RAHMA' ? '🤲 Formule Rahma' :
                '✨ Formule Personnalisée'
              } bold />
              <InfoRow label="Départ" value={depart?.nom || '—'} />
              <InfoRow label="Date" value={
                depart
                  ? `${depart.date_greg || ''}${depart.date_heg ? ' (' + depart.date_heg + ')' : ''}`
                  : '—'
              } />
            </div>
          </div>
        </div>

        {/* ══ HISTORIQUE DES PAIEMENTS ══ */}
        <div style={{
          border:'1px solid #E5EDE8',
          borderRadius:'8px',
          overflow:'hidden',
          marginBottom:'18px',
        }}>
          <div style={{
            background:'#0F5229',
            padding:'10px 16px',
            fontSize:'9pt',
            fontWeight:'bold',
            color:'white',
            textTransform:'uppercase',
            letterSpacing:'0.5px',
          }}>
            Récapitulatif financier
          </div>

          {/* En-tête */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
            background:'#F5F5F5',
            padding:'8px 16px',
            fontSize:'9pt', color:'#666',
            fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.3px',
          }}>
            <span>Description</span>
            <span style={{ textAlign:'center' }}>Date</span>
            <span style={{ textAlign:'right' }}>Montant</span>
          </div>

          {/* Prix total */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
            padding:'12px 16px',
            borderBottom:'1px solid #E5EDE8',
            fontSize:'11pt',
          }}>
            <span style={{ color:'#333' }}>Pack Oumrah — Formule {pelerin.formule}</span>
            <span style={{ textAlign:'center', color:'#666' }}>—</span>
            <span style={{ textAlign:'right', fontWeight:'bold', color:'#111' }}>
              {fmtMontant(pelerin.prix_total)} FCFA
            </span>
          </div>

          {/* Paiements individuels */}
          {paiements.length > 0 ? (
            paiements.map((p, i) => (
              <div key={p.id} style={{
                display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                padding:'10px 16px',
                borderBottom:'1px solid #F0F0F0',
                fontSize:'10pt',
                background: i % 2 === 0 ? '#F9FFF9' : 'white',
              }}>
                <span style={{ color:'#333' }}>
                  Paiement {i + 1}{p.note ? ` — ${p.note}` : ''}
                </span>
                <span style={{ textAlign:'center', color:'#666' }}>
                  {fmtDate(p.date_paiement)}
                </span>
                <span style={{ textAlign:'right', fontWeight:'bold', color:'#1A7A3C' }}>
                  - {fmtMontant(p.montant)} FCFA
                </span>
              </div>
            ))
          ) : (
            // Si pas de paiements enregistrés, afficher le montant global
            pelerin.montant_paye > 0 && (
              <div style={{
                display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                padding:'10px 16px',
                borderBottom:'1px solid #F0F0F0',
                fontSize:'10pt',
                background:'#F9FFF9',
              }}>
                <span style={{ color:'#333' }}>Paiement effectué</span>
                <span style={{ textAlign:'center', color:'#666' }}>—</span>
                <span style={{ textAlign:'right', fontWeight:'bold', color:'#1A7A3C' }}>
                  - {fmtMontant(pelerin.montant_paye)} FCFA
                </span>
              </div>
            )
          )}

          {/* Total payé */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
            padding:'10px 16px',
            borderBottom:'1px solid #E5EDE8',
            fontSize:'10pt',
            background:'#E8F5EE',
          }}>
            <span style={{ fontWeight:'bold', color:'#0F5229' }}>Total payé</span>
            <span />
            <span style={{ textAlign:'right', fontWeight:'bold', color:'#0F5229' }}>
              {fmtMontant(totalPaye)} FCFA
            </span>
          </div>

          {/* Reste */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
            padding:'14px 16px',
            fontSize:'13pt',
            background: solde ? '#D1FAE5' : '#FEF3C7',
          }}>
            <span style={{ fontWeight:'bold', color: solde ? '#065F46' : '#92400E' }}>
              {solde ? '✓ Soldé' : 'Reste à payer'}
            </span>
            <span />
            <span style={{ textAlign:'right', fontWeight:'bold', fontSize:'15pt', color: solde ? '#065F46' : '#D97706' }}>
              {solde ? '0 FCFA' : fmtMontant(reste) + ' FCFA'}
            </span>
          </div>
        </div>

        {/* ══ BARRE DE PROGRESSION ══ */}
        <div style={{ marginBottom:'20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10pt', color:'#666', marginBottom:'6px' }}>
            <span>Taux d'encaissement</span>
            <span style={{ fontWeight:'bold', color: pct >= 100 ? '#1A7A3C' : '#D97706' }}>{pct}%</span>
          </div>
          <div style={{ height:'8px', background:'#E5E7EB', borderRadius:'4px', overflow:'hidden' }}>
            <div style={{
              height:'100%', width:pct+'%',
              background: pct >= 100 ? '#1A7A3C' : '#ED8936',
              borderRadius:'4px',
            }} />
          </div>
        </div>

        {/* ══ FOOTER ══ */}
        <div style={{
          borderTop:'1px solid #DDD',
          paddingTop:'12px',
          display:'flex',
          justifyContent:'space-between',
          alignItems:'flex-end',
          fontSize:'9pt',
          color:'#999',
        }}>
          <div>
            <div style={{ marginBottom:'3px' }}>Ar Rawdah Travel Tour — Ar Rawdah As'Sherif SARL</div>
            <div>Cité Keur Gorgui, Dakar — Sénégal</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ marginBottom:'3px' }}>Document officiel — {numeroFacture}</div>
            <div>Émis le {today}</div>
            {currentUser && (
              <div style={{ marginTop:'4px', color:'#BBB', fontStyle:'italic' }}>
                Imprimé par {currentUser} le {printTime}
              </div>
            )}
          </div>
        </div>

        {/* Note solde restant */}
        {!solde && (
          <div style={{
            marginTop:'16px',
            padding:'10px 14px',
            background:'#FEF3C7',
            borderRadius:'6px',
            fontSize:'10pt',
            color:'#92400E',
            borderLeft:'3px solid #F59E0B',
          }}>
            <strong>Note :</strong> Le solde de {fmtMontant(reste)} FCFA doit être réglé avant le départ.
            Pour tout paiement, contactez-nous au (221) 33 840 6161.
          </div>
        )}

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .facture-page {
            margin: 0 !important;
            padding: 10mm 12mm !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          @page { size: A4; margin: 0; }
        }
        @media screen {
          body { background: #F3F4F6; }
          .facture-page {
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
            margin: 40px auto !important;
          }
        }
      `}</style>
    </>
  )
}

function InfoRow({ label, value, bold }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between',
      padding:'4px 0',
      borderBottom:'1px dotted #F0F0F0',
      fontSize:'10pt',
      gap:'8px',
    }}>
      <span style={{ color:'#666', flexShrink:0 }}>{label}</span>
      <span style={{ fontWeight: bold ? 'bold' : 'normal', textAlign:'right', color:'#111' }}>{value}</span>
    </div>
  )
}
