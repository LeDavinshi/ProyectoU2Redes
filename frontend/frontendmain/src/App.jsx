import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Cargos from "./pages/Cargos";
import Funcionarios from "./pages/Funcionarios";
import HistorialCargos from "./pages/HistorialCargos";
import Bienios from "./pages/Bienios";
import Capacitaciones from "./pages/Capacitaciones";
import Estudios from "./pages/Estudios";
import Calificaciones from "./pages/Calificaciones";
import Anotaciones from "./pages/Anotaciones";
import Sumarios from "./pages/Sumarios";
import PermisosAdministrativos from "./pages/PermisosAdministrativos";
import PermisosCompensatorios from "./pages/PermisosCompensatorios";
import Cometidos from "./pages/Cometidos";
import Documentos from "./pages/Documentos";
import FormatosCertificados from "./pages/FormatosCertificados";
import Certificados from "./pages/Certificados";
import Reportes from "./pages/Reportes";
import Decretos from "./pages/Decretos";
import Ascensos from "./pages/Ascensos";
import HojaCarrera from "./pages/HojaCarrera";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/cargos" element={<Cargos />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/historial-cargos" element={<HistorialCargos />} />
        <Route path="/bienios" element={<Bienios />} />
        <Route path="/capacitaciones" element={<Capacitaciones />} />
        <Route path="/estudios" element={<Estudios />} />
        <Route path="/calificaciones" element={<Calificaciones />} />
        <Route path="/anotaciones" element={<Anotaciones />} />
        <Route path="/sumarios" element={<Sumarios />} />
        <Route path="/permisos/administrativos" element={<PermisosAdministrativos />} />
        <Route path="/permisos/compensatorios" element={<PermisosCompensatorios />} />
        <Route path="/cometidos" element={<Cometidos />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/formatos-certificados" element={<FormatosCertificados />} />
        <Route path="/certificados" element={<Certificados />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/decretos" element={<Decretos />} />
        <Route path="/ascensos" element={<Ascensos />} />
        <Route path="/hoja-carrera" element={<HojaCarrera />} />
      </Routes>
    </>
  );
}

export default App;
