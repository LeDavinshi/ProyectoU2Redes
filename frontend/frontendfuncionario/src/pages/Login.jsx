import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const AUTH_URL = (import.meta.env.VITE_AUTH_URL || 'http://localhost:4000') + '/login'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Error de autenticación')
      const perfil = data?.user?.perfil
      const bloqueados = ['Administrador', 'Jefe']
      if (bloqueados.includes(perfil)) {
        throw new Error('No puedes acceder con este usuario al portal funcionario')
      }
      try { localStorage.setItem('user', JSON.stringify(data.user)) } catch {}
      navigate('/perfil')
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "50px" }}>
      <h2>Inicio de Sesión Funcionario</h2>
      <form>
        <input type="text" placeholder="Usuario" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button type="button" onClick={onSubmit} disabled={loading}>{loading ? 'Ingresando...' : 'Entrar'}</button>
      </form>
      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
    </div>
  )
}
