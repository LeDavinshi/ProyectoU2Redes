import { Link, useNavigate } from "react-router-dom";
import { getUser, isFuncionario, clearUser } from "../auth";

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();
  const logged = isFuncionario();

  function logout() {
    clearUser();
    navigate("/");
  }

  return (
    <nav style={{ padding: "10px", background: "#004080", color: "white", display: 'flex', alignItems: 'center', gap: '16px' }}>
      {logged && (
        <>
          <Link to="/perfil" style={{ color: "white", marginRight: "20px" }}>Mi Perfil</Link>
          <Link to="/carrera" style={{ color: "white", marginRight: "20px" }}>Carrera</Link>
          <Link to="/bienios" style={{ color: "white", marginRight: "20px" }}>Bienios</Link>
          <Link to="/capacitaciones" style={{ color: "white", marginRight: "20px" }}>Capacitaciones</Link>
          <Link to="/permisos" style={{ color: "white", marginRight: "20px" }}>Permisos</Link>
          <Link to="/documentos" style={{ color: "white" }}>Documentos</Link>
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
