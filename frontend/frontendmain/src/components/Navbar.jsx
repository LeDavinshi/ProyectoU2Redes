import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{ padding: "10px", background: "#003366", color: "white" }}>
      <Link to="/" style={{ color: "white", marginRight: "20px" }}>Inicio</Link>
      <Link to="/dashboard" style={{ color: "white", marginRight: "20px" }}>Panel</Link>
      <Link to="/usuarios" style={{ color: "white", marginRight: "20px" }}>Usuarios</Link>
      <Link to="/cargos" style={{ color: "white" }}>Cargos</Link>
    </nav>
  );
}
