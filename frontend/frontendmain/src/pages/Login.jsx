import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const AUTH_URL = (import.meta.env.VITE_AUTH_URL || 'http://localhost:4000') + '/login'

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    
    // Validación básica
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Por favor completa todos los campos')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Error de autenticación')
      }

      const perfil = data?.user?.perfil
      const allowedProfiles = ['Administrador', 'Jefe']
      
      if (!allowedProfiles.includes(perfil)) {
        throw new Error('No tienes permisos para acceder al panel administrador')
      }

      login(data.user)
      navigate('/dashboard', { replace: true })
      
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  }

  const formStyle = {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px'
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    margin: '8px 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    boxSizing: 'border-box'
  }

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    marginTop: '16px',
    backgroundColor: loading ? '#ccc' : '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s'
  }

  const errorStyle = {
    color: '#dc3545',
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    textAlign: 'center'
  }

  const titleStyle = {
    textAlign: 'center',
    marginBottom: '30px',
    color: '#333'
  }

  return (
    <div style={containerStyle}>
      <form onSubmit={onSubmit} style={formStyle}>
        <h2 style={titleStyle}>Inicio de Sesión</h2>
        
        <input
          type="text"
          name="username"
          placeholder="Usuario"
          value={formData.username}
          onChange={handleInputChange}
          style={inputStyle}
          disabled={loading}
        />
        
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleInputChange}
          style={inputStyle}
          disabled={loading}
        />
        
        <button 
          type="submit" 
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? 'Ingresando...' : 'Entrar'}
        </button>
        
        {error && <div style={errorStyle}>{error}</div>}
      </form>
    </div>
  )
}