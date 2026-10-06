import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase gère le token automatiquement via l'URL
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Erreur : ' + error.message)
    } else {
      setMessage('✅ Mot de passe modifié avec succès !')
      setTimeout(() => {
        window.location.replace('/')
      }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FFF4' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">

        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F5229' }}>Nouveau mot de passe</h1>
          <p className="text-sm text-gray-500 mt-1">Ar Rawdah Travel Tour</p>
        </div>

        {message ? (
          <div className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-700 font-semibold">{message}</p>
            <p className="text-sm text-gray-400 mt-2">Redirection en cours...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Au moins 6 caractères"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Répétez le mot de passe"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-600 transition-colors"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all"
              style={{ background: loading ? '#6B9E7A' : '#0F5229' }}>
              {loading ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
 
