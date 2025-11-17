import { Link, useNavigate } from "react-router-dom";
import { getUser, isAdmin, clearUser, can } from "../auth";

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();
  const admin = isAdmin();
  const canPerfil = false;

  function logout() {
    clearUser();
    navigate("/");
  }

  return (
    <nav style={{ padding: "10px", background: "#003366", color: "white", display: 'flex', alignItems: 'center', gap: '16px' }}>
      <Link to="/" style={{ color: "white", marginRight: "20px" }}>Inicio</Link>
      {admin && (
        <>
          <Link to="/dashboard" style={{ color: "white", marginRight: "20px" }}>Panel</Link>
          <Link to="/usuarios" style={{ color: "white", marginRight: "20px" }}>Usuarios</Link>
          <Link to="/fichas" style={{ color: "white", marginRight: "20px" }}>Fichas</Link>
          <Link to="/carrera" style={{ color: "white", marginRight: "20px" }}>Carrera</Link>
          <Link to="/cargos" style={{ color: "white" }}>Cargos</Link>
          <Link to="/permisos/administrativos" style={{ color: "white", marginLeft: "20px" }}>Permisos Adm.</Link>
          <Link to="/permisos/compensatorios" style={{ color: "white", marginLeft: "20px" }}>Permisos Comp.</Link>
          <Link to="/documentos" style={{ color: "white", marginLeft: "20px" }}>Documentos</Link>
          <Link to="/formatos" style={{ color: "white", marginLeft: "20px" }}>Formatos</Link>
        </>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          <>
            <span style={{ opacity: 0.9 }}>{user.email || user.rut} ({user.perfil})</span>
            <button onClick={logout} style={{ padding: '4px 10px', cursor: 'pointer' }}>Salir</button>
          </>
        ) : (
          <span>No autenticado</span>
        )}
      </div>
    </nav>
  );
}
