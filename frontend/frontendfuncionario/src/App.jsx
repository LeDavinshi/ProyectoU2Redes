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
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function AppContent() {
  const { user } = useAuth();
  
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route path="/capacitaciones" element={<ProtectedRoute><Capacitaciones /></ProtectedRoute>} />
        <Route path="/permisos" element={<ProtectedRoute><Permisos /></ProtectedRoute>} />
        <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
        <Route path="/estudios" element={<ProtectedRoute><Estudios /></ProtectedRoute>} />
        <Route path="/calificaciones" element={<ProtectedRoute><Calificaciones /></ProtectedRoute>} />
        <Route path="/anotaciones" element={<ProtectedRoute><Anotaciones /></ProtectedRoute>} />
        <Route path="/sumarios" element={<ProtectedRoute><Sumarios /></ProtectedRoute>} />
        <Route path="/bienios" element={<ProtectedRoute><Bienios /></ProtectedRoute>} />
        <Route path="/cometidos" element={<ProtectedRoute><Cometidos /></ProtectedRoute>} />
        <Route path="/solicitudes/compensatorio" element={<ProtectedRoute><SolicitudesCompensatorio /></ProtectedRoute>} />
        <Route path="/solicitudes/cometido" element={<ProtectedRoute><SolicitudesCometido /></ProtectedRoute>} />
        <Route path="/solicitudes/curso" element={<ProtectedRoute><SolicitudesCurso /></ProtectedRoute>} />
        <Route path="/hoja-carrera" element={<ProtectedRoute><HojaCarrera /></ProtectedRoute>} />
        <Route path="/historial-cargos" element={<ProtectedRoute><HistorialCargos /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;