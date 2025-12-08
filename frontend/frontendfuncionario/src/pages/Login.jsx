import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setUser } from '../auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Credenciales inválidas')
      }
      const u = data.user
      if (!u || u.perfil !== 'Funcionario') {
        throw new Error('Acceso restringido: solo funcionarios')
      }
      setUser(u)
      navigate('/perfil')
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '50px' }}>
      <h2>Inicio de Sesión</h2>
      {error && (
        <div style={{ color: 'white', background: '#cc0000', padding: '8px', marginBottom: '10px' }}>{error}</div>
      )}
      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Usuario (email o RUT)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ display: 'block', marginBottom: '8px', padding: '8px', width: '300px' }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', marginBottom: '8px', padding: '8px', width: '300px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
