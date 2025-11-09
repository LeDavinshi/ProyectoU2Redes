import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Cargos from "./pages/Cargos";
import { isAdmin, can } from "./auth";
import Fichas from "./pages/Fichas";
import Carrera from "./pages/Carrera";
import PermisosAdministrativos from "./pages/PermisosAdministrativos";
import PermisosCompensatorios from "./pages/PermisosCompensatorios";
import Documentos from "./pages/Documentos";
import FormatosCertificados from "./pages/FormatosCertificados";

function App() {
  function RequireAdmin({ children }) {
    if (!isAdmin()) return <Navigate to="/" replace />;
    return children;
  }
  function RequirePerm({ perm, children }) {
    if (!can(perm)) return <Navigate to="/" replace />;
    return children;
  }
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="/usuarios" element={<RequireAdmin><Usuarios /></RequireAdmin>} />
        <Route path="/cargos" element={<RequireAdmin><Cargos /></RequireAdmin>} />
        <Route path="/fichas" element={<RequireAdmin><Fichas /></RequireAdmin>} />
        <Route path="/carrera" element={<RequireAdmin><Carrera /></RequireAdmin>} />
        <Route path="/permisos/administrativos" element={<RequireAdmin><PermisosAdministrativos /></RequireAdmin>} />
        <Route path="/permisos/compensatorios" element={<RequireAdmin><PermisosCompensatorios /></RequireAdmin>} />
        <Route path="/documentos" element={<RequireAdmin><Documentos /></RequireAdmin>} />
        <Route path="/formatos" element={<RequireAdmin><FormatosCertificados /></RequireAdmin>} />
      </Routes>
    </>
  );
}

export default App;
