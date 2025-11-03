import { useState } from "react";

export default function Cargos() {
  const [cargos, setCargos] = useState(["Administrador", "Funcionario"]);
  const [nuevoCargo, setNuevoCargo] = useState("");

  const agregarCargo = () => {
    if (!nuevoCargo) return;
    setCargos([...cargos, nuevoCargo]);
    setNuevoCargo("");
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2>Gestión de Cargos</h2>
      <ul>
        {cargos.map((c, i) => <li key={i}>{c}</li>)}
      </ul>
      <input
        placeholder="Nuevo cargo"
        value={nuevoCargo}
        onChange={(e) => setNuevoCargo(e.target.value)}
      />
      <button onClick={agregarCargo}>Agregar</button>
    </div>
  );
}
