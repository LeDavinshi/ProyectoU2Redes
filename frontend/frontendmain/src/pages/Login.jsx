import React from 'react'

export default function Login() {
  return (
    <div style={{ padding: "50px" }}>
      <h2>Inicio de Sesión</h2>
      <form>
        <input type="text" placeholder="Usuario" />
        <input type="password" placeholder="Contraseña" />
        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}
