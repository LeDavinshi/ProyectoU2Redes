import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import Capacitaciones from "./pages/Capacitaciones";
import Permisos from "./pages/Permisos";
import Documentos from "./pages/Documentos";
import { isFuncionario } from "./auth";

function App() {
  function RequireFuncionario({ children }) {
    if (!isFuncionario()) return <Navigate to="/" replace />;
    return children;
  }
  function RedirectIfLogged({ children }) {
    if (isFuncionario()) return <Navigate to="/perfil" replace />;
    return children;
  }
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<RedirectIfLogged><Login /></RedirectIfLogged>} />
        <Route path="/perfil" element={<RequireFuncionario><Perfil /></RequireFuncionario>} />
        <Route path="/capacitaciones" element={<RequireFuncionario><Capacitaciones /></RequireFuncionario>} />
        <Route path="/permisos" element={<RequireFuncionario><Permisos /></RequireFuncionario>} />
        <Route path="/documentos" element={<RequireFuncionario><Documentos /></RequireFuncionario>} />
      </Routes>
    </>
  );
}

export default App;
