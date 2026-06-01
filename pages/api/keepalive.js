// pages/api/keepalive.js
// Ce script ping Supabase toutes les 3 jours pour éviter la mise en pause
// Appelé automatiquement par Vercel Cron Jobs

import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  // Vérifier que c'est bien Vercel qui appelle (sécurité)
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    // Ping simple — lire le nombre de pèlerins
    const { count, error } = await supabase
      .from('pelerins')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    console.log(`[Keep-alive] Supabase actif — ${count} pèlerins — ${new Date().toISOString()}`)

    return res.status(200).json({
      status: 'ok',
      message: 'Supabase maintenu actif',
      pelerins: count,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Keep-alive] Erreur:', error)
    return res.status(500).json({ error: error.message })
  }
}
