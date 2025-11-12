import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav style={{ padding: "10px", background: "#004080", color: "white", display: 'flex', alignItems: 'center', gap: '20px' }}>
      <Link to="/perfil" style={{ color: "white" }}>Mi Perfil</Link>
      <Link to="/capacitaciones" style={{ color: "white" }}>Capacitaciones</Link>
      <Link to="/permisos" style={{ color: "white" }}>Permisos</Link>
      <Link to="/documentos" style={{ color: "white" }}>Documentos</Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {user && <span>{user?.email || user?.rut || 'Funcionario'}</span>}
        {user ? (
          <button onClick={handleLogout} style={{ background: '#ff5555', color: 'white', border: 'none', padding: '6px 10px', cursor: 'pointer' }}>Salir</button>
        ) : (
          <Link to="/" style={{ color: "white" }}>Entrar</Link>
        )}
      </div>
    </nav>
  );
}
