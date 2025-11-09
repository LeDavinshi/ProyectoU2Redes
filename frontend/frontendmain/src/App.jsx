import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Cargos from "./pages/Cargos";
import { isAdmin, can } from "./auth";
import Fichas from "./pages/Fichas";
import Carrera from "./pages/Carrera";

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
      </Routes>
    </>
  );
}

export default App;
