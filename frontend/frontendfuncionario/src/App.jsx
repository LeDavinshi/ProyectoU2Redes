import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import Capacitaciones from "./pages/Capacitaciones";
import Permisos from "./pages/Permisos";
import Documentos from "./pages/Documentos";

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
      </Routes>
    </>
  );
}

export default App;
