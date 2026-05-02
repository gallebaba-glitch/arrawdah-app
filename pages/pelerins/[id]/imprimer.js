import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import Head from 'next/head'

export default function FicheImpression() {
  const router = useRouter()
  const { id } = router.query
  const [pelerin, setPelerin] = useState(null)
  const [depart, setDepart] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  async function fetchData() {
    const { data: p } = await supabase.from('pelerins').select('*').eq('id', id).single()
    if (p) {
      setPelerin(p)
      if (p.depart_id) {
        const { data: d } = await supabase.from('departs').select('*').eq('id', p.depart_id).single()
        setDepart(d)
      }
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial' }}>
      Chargement de la fiche...
    </div>
  )

  if (!pelerin) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial' }}>
      Pèlerin introuvable.
    </div>
  )

  const reste = (pelerin.prix_total || 0) - (pelerin.montant_paye || 0)
  const pct = pelerin.prix_total > 0 ? Math.round((pelerin.montant_paye / pelerin.prix_total) * 100) : 0
  const today = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })

  return (
    <>
      <Head>
        <title>Fiche Pèlerin — {pelerin.prenom} {pelerin.nom}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Bouton imprimer — masqué à l'impression */}
      <div className="no-print" style={{
        position: 'fixed', top: '16px', right: '16px', zIndex: 100,
        display: 'flex', gap: '8px'
      }}>
        <button onClick={() => window.print()} style={{
          padding: '10px 24px', background: '#0F5229', color: 'white',
          border: 'none', borderRadius: '8px', fontWeight: '600',
          fontSize: '14px', cursor: 'pointer', fontFamily: 'Arial'
        }}>
          🖨️ Imprimer
        </button>
        <button onClick={() => router.back()} style={{
          padding: '10px 20px', background: '#F3F4F6', color: '#374151',
          border: '1px solid #E5E7EB', borderRadius: '8px', fontWeight: '600',
          fontSize: '14px', cursor: 'pointer', fontFamily: 'Arial'
        }}>
          ← Retour
        </button>
      </div>

      {/* PAGE A4 */}
      <div className="fiche-page" style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '11pt',
        color: '#111',
        background: 'white',
        maxWidth: '210mm',
        margin: '0 auto',
        padding: '18mm 16mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '12px',
        }}>
          <img
            src="/logo-ar-rawdah.png"
            alt="Ar Rawdah Travel Tour"
            style={{ height: '60px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none' }}
          />
          <div>
            <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#0F5229', letterSpacing: '0.3px' }}>
              Ar Rawdah Travel Tour
            </div>
            <div style={{ fontSize: '11pt', color: '#555', marginTop: '2px', fontWeight: 'normal' }}>
              Fiche Pèlerin
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '9pt', color: '#888' }}>
            <div>Imprimé le {today}</div>
            <div style={{ marginTop: '2px' }}>Réf. #{pelerin.id}</div>
          </div>
        </div>

        {/* Ligne séparatrice */}
        <div style={{ borderTop: '1.5px solid #0F5229', marginBottom: '16px' }} />

        {/* ══ NOM EN GROS ══ */}
        <div style={{
          background: '#F8FAF8',
          border: '1px solid #E5EDE8',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '18pt', fontWeight: 'bold', color: '#0F5229' }}>
              {pelerin.prenom} {pelerin.nom}
            </div>
            <div style={{ fontSize: '10pt', color: '#666', marginTop: '3px' }}>
              {pelerin.sexe === 'femme' ? '👩 Femme' : '👨 Homme'} &nbsp;·&nbsp;
              Formule <strong>{pelerin.formule}</strong> &nbsp;·&nbsp;
              {pelerin.premiere_oumrah ? '⭐ Première Oumrah' : 'Oumrah précédente'}
            </div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '8px 16px',
            borderRadius: '6px',
            background: pelerin.statut === 'confirme' ? '#D1FAE5' : pelerin.statut === 'parti' ? '#DBEAFE' : '#FEF3C7',
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ fontSize: '9pt', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statut</div>
            <div style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '2px' }}>
              {pelerin.statut === 'inscrit' ? 'Inscrit' : pelerin.statut === 'confirme' ? 'Confirmé' : pelerin.statut === 'parti' ? 'Parti' : 'Rentré'}
            </div>
          </div>
        </div>

        {/* ══ GRILLE 2 COLONNES ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

          {/* IDENTITÉ */}
          <Section title="IDENTITÉ">
            <Row label="Nom complet" value={`${pelerin.prenom} ${pelerin.nom}`} />
            <Row label="Sexe" value={pelerin.sexe === 'femme' ? 'Femme' : 'Homme'} />
            <Row label="Première Oumrah" value={pelerin.premiere_oumrah ? 'Oui' : 'Non'} bold />
            <Row label="Date de naissance" value={pelerin.date_naissance || '—'} />
          </Section>

          {/* DOCUMENTS */}
          <Section title="DOCUMENTS">
            <Row label="N° Passeport" value={pelerin.num_passeport || '—'} bold />
            <Row label="Expiration" value={pelerin.exp_passeport || '—'} />
            <Row label="Passeport" value={pelerin.doc_passeport ? '✓ Reçu' : '✗ Manquant'} ok={pelerin.doc_passeport} />
            <Row label="Photo" value={pelerin.doc_photo ? '✓ Reçue' : '✗ Manquante'} ok={pelerin.doc_photo} />
            <Row label="Vaccin méningite" value={pelerin.doc_vaccin ? '✓ Reçu' : '✗ Manquant'} ok={pelerin.doc_vaccin} />
            <Row label="Visa Oumrah" value={pelerin.doc_visa ? '✓ Obtenu' : '✗ En attente'} ok={pelerin.doc_visa} />
            <Row label="Billet avion" value={pelerin.doc_billet ? '✓ Émis' : '✗ En attente'} ok={pelerin.doc_billet} />
          </Section>

          {/* CONTACT */}
          <Section title="CONTACT">
            <Row label="Téléphone" value={pelerin.telephone || '—'} bold />
            <Row label="Contact urgence" value={pelerin.tel_famille || '—'} />
          </Section>

          {/* MÉDICAL */}
          <Section title="MÉDICAL">
            <div style={{ fontSize: '10pt', color: pelerin.medical && pelerin.medical !== 'Aucun' ? '#CC0000' : '#555', lineHeight: '1.5' }}>
              {pelerin.medical || 'Aucune information médicale'}
            </div>
          </Section>

        </div>

        {/* ══ FINANCIER ══ */}
        <Section title="FINANCIER" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <FinBox label="Prix du pack" value={(pelerin.prix_total || 0).toLocaleString('fr-FR') + ' FCFA'} />
            <FinBox label="Montant payé" value={(pelerin.montant_paye || 0).toLocaleString('fr-FR') + ' FCFA'} ok />
            <FinBox label="Reste à payer" value={reste > 0 ? reste.toLocaleString('fr-FR') + ' FCFA' : '✓ Soldé'} warn={reste > 0} />
          </div>
          {/* Barre de paiement */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: '#666', marginBottom: '4px' }}>
              <span>Taux d'encaissement</span>
              <span style={{ fontWeight: 'bold' }}>{pct}%</span>
            </div>
            <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: pct >= 100 ? '#0F5229' : '#ED8936', borderRadius: '3px' }} />
            </div>
          </div>
        </Section>

        {/* ══ VOYAGE ══ */}
        <Section title="VOYAGE" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Row label="Groupe / Départ" value={depart?.nom || '—'} bold />
            <Row label="Date départ" value={depart ? `${depart.date_greg || ''}${depart.date_heg ? ' (' + depart.date_heg + ')' : ''}` : '—'} />
            <Row label="Vol" value={depart?.vol || '—'} />
            <Row label="Guide" value={depart?.guide || '—'} />
            <Row label="Hôtel La Mecque" value={depart?.hotel_mecque || '—'} />
            <Row label="Hôtel Médine" value={depart?.hotel_medine || '—'} />
          </div>
        </Section>

        {/* ══ NOTES ══ */}
        <Section title="NOTES INTERNES">
          <div style={{
            minHeight: '50px',
            fontSize: '10pt',
            color: pelerin.notes ? '#111' : '#AAA',
            fontStyle: pelerin.notes ? 'normal' : 'italic',
            lineHeight: '1.6',
          }}>
            {pelerin.notes || 'Aucune note interne'}
          </div>
        </Section>

        {/* ══ FOOTER ══ */}
        <div style={{
          borderTop: '1px solid #DDD',
          marginTop: '20px',
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '8pt',
          color: '#999',
        }}>
          <span>Ar Rawdah Travel Tour — Rawda As'Sherif SARL</span>
          <span>Document confidentiel — usage interne</span>
          <span>Imprimé le {today}</span>
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .fiche-page {
            margin: 0 !important;
            padding: 12mm 12mm !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
        @media screen {
          body { background: #F3F4F6; }
          .fiche-page {
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
            margin: 40px auto !important;
          }
        }
      `}</style>
    </>
  )
}

// Composants helper
function Section({ title, children, style }) {
  return (
    <div style={{ marginBottom: '0', ...style }}>
      <div style={{
        fontSize: '8pt',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: '#0F5229',
        borderBottom: '1px solid #E5EDE8',
        paddingBottom: '4px',
        marginBottom: '8px',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, bold, ok }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '3px 0',
      borderBottom: '1px dotted #F0F0F0',
      fontSize: '10pt',
      gap: '8px',
    }}>
      <span style={{ color: '#666', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontWeight: bold ? 'bold' : 'normal',
        textAlign: 'right',
        color: ok === true ? '#0F5229' : ok === false ? '#CC0000' : '#111',
      }}>
        {value}
      </span>
    </div>
  )
}

function FinBox({ label, value, ok, warn }) {
  return (
    <div style={{
      background: ok ? '#F0FFF4' : warn ? '#FFF7ED' : '#F9FAFB',
      border: `1px solid ${ok ? '#A7F3D0' : warn ? '#FDE68A' : '#E5E7EB'}`,
      borderRadius: '6px',
      padding: '10px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '11pt', fontWeight: 'bold', color: ok ? '#0F5229' : warn ? '#D97706' : '#111' }}>{value}</div>
    </div>
  )
}
