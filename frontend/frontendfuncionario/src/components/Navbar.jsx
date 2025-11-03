import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{ padding: "10px", background: "#004080", color: "white" }}>
      <Link to="/perfil" style={{ color: "white", marginRight: "20px" }}>Mi Perfil</Link>
      <Link to="/capacitaciones" style={{ color: "white", marginRight: "20px" }}>Capacitaciones</Link>
      <Link to="/permisos" style={{ color: "white", marginRight: "20px" }}>Permisos</Link>
      <Link to="/documentos" style={{ color: "white" }}>Documentos</Link>
    </nav>
  );
}
