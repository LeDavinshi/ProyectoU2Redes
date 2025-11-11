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
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
        <Route path="/cargos" element={<ProtectedRoute><Cargos /></ProtectedRoute>} />
        <Route path="/funcionarios" element={<ProtectedRoute><Funcionarios /></ProtectedRoute>} />
        <Route path="/historial-cargos" element={<ProtectedRoute><HistorialCargos /></ProtectedRoute>} />
        <Route path="/bienios" element={<ProtectedRoute><Bienios /></ProtectedRoute>} />
        <Route path="/capacitaciones" element={<ProtectedRoute><Capacitaciones /></ProtectedRoute>} />
        <Route path="/estudios" element={<ProtectedRoute><Estudios /></ProtectedRoute>} />
        <Route path="/calificaciones" element={<ProtectedRoute><Calificaciones /></ProtectedRoute>} />
        <Route path="/anotaciones" element={<ProtectedRoute><Anotaciones /></ProtectedRoute>} />
        <Route path="/sumarios" element={<ProtectedRoute><Sumarios /></ProtectedRoute>} />
        <Route path="/permisos/administrativos" element={<ProtectedRoute><PermisosAdministrativos /></ProtectedRoute>} />
        <Route path="/permisos/compensatorios" element={<ProtectedRoute><PermisosCompensatorios /></ProtectedRoute>} />
        <Route path="/cometidos" element={<ProtectedRoute><Cometidos /></ProtectedRoute>} />
        <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
        <Route path="/formatos-certificados" element={<ProtectedRoute><FormatosCertificados /></ProtectedRoute>} />
        <Route path="/certificados" element={<ProtectedRoute><Certificados /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
        <Route path="/decretos" element={<ProtectedRoute><Decretos /></ProtectedRoute>} />
        <Route path="/ascensos" element={<ProtectedRoute><Ascensos /></ProtectedRoute>} />
        <Route path="/hoja-carrera" element={<ProtectedRoute><HojaCarrera /></ProtectedRoute>} />
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
