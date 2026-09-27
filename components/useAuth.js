import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Correspondance email → profil utilisateur
const USERS = {
  'gallebaba@gmail.com':       { nom: 'Ousmane Niang',      role: 'admin' },
  'mamyfall@icloud.com':       { nom: 'Hajja Mamy Fall',    role: 'admin' },
  'o.solly@sollytrading.com':  { nom: 'Sheikh Hussein Solly', role: 'admin' },
  'madinaarawdah@gmail.com':   { nom: 'Madina Diallo',      role: 'editor' },
  'mariemediagne79@gmail.com': { nom: 'Marieme Diagne',     role: 'editor' },
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Session active au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const profil = USERS[session.user.email] || { nom: session.user.email, role: 'editor' }
        setUser({ ...session.user, ...profil })
      }
      setLoading(false)
    })

    // Écoute les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profil = USERS[session.user.email] || { nom: session.user.email, role: 'editor' }
        setUser({ ...session.user, ...profil })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return { user, loading, signOut }
}
