import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Si déjà connecté, rediriger vers l'accueil
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/')
    })
  }, [router])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FFF4' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">

        {/* Logo / Titre */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🕌</div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F5229' }}>Ar Rawdah</h1>
          <p className="text-sm text-gray-500 mt-1">Plateforme de gestion</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
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
            style={{ background: loading ? '#6B9E7A' : '#0F5229' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ar Rawdah Travel Tour — Usage interne exclusif
        </p>
      </div>
    </div>
  )
}
