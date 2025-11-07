import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import Capacitaciones from "./pages/Capacitaciones";
import Permisos from "./pages/Permisos";
import Documentos from "./pages/Documentos";
import Estudios from "./pages/Estudios";
import Calificaciones from "./pages/Calificaciones";
import Anotaciones from "./pages/Anotaciones";
import Sumarios from "./pages/Sumarios";
import Bienios from "./pages/Bienios";
import Cometidos from "./pages/Cometidos";
import SolicitudesCompensatorio from "./pages/SolicitudesCompensatorio";
import SolicitudesCometido from "./pages/SolicitudesCometido";
import SolicitudesCurso from "./pages/SolicitudesCurso";
import HojaCarrera from "./pages/HojaCarrera";
import HistorialCargos from "./pages/HistorialCargos";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/capacitaciones" element={<Capacitaciones />} />
        <Route path="/permisos" element={<Permisos />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/estudios" element={<Estudios />} />
        <Route path="/calificaciones" element={<Calificaciones />} />
        <Route path="/anotaciones" element={<Anotaciones />} />
        <Route path="/sumarios" element={<Sumarios />} />
        <Route path="/bienios" element={<Bienios />} />
        <Route path="/cometidos" element={<Cometidos />} />
        <Route path="/solicitudes/compensatorio" element={<SolicitudesCompensatorio />} />
        <Route path="/solicitudes/cometido" element={<SolicitudesCometido />} />
        <Route path="/solicitudes/curso" element={<SolicitudesCurso />} />
        <Route path="/hoja-carrera" element={<HojaCarrera />} />
        <Route path="/historial-cargos" element={<HistorialCargos />} />
      </Routes>
    </>
  );
}

export default App;
