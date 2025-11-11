import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{ padding: "10px", background: "#003366", color: "white", display: 'flex', alignItems: 'center', gap: '20px' }}>
      <Link to="/" style={{ color: "white" }}>Inicio</Link>
      <Link to="/dashboard" style={{ color: "white" }}>Panel</Link>
      <Link to="/usuarios" style={{ color: "white" }}>Usuarios</Link>
      <Link to="/cargos" style={{ color: "white" }}>Cargos</Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {user && <span>{user?.email || user?.rut || 'Usuario'}</span>}
        {user ? (
          <button onClick={handleLogout} style={{ background: '#ff5555', color: 'white', border: 'none', padding: '6px 10px', cursor: 'pointer' }}>Salir</button>
        ) : (
          <Link to="/" style={{ color: "white" }}>Entrar</Link>
        )}
      </div>
    </nav>
  );
}
