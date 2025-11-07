import { useState } from "react";

export default function HistorialCargos() {
  const [items, setItems] = useState([
    { id: 1, funcionario: "María", cargo: "Técnico" },
  ]);
  const [nuevo, setNuevo] = useState("");

  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, funcionario: nuevo, cargo: "-" }]);
    setNuevo("");
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2>Historial de Cargos</h2>
      <ul>
        {items.map((x) => (
          <li key={x.id}>{x.funcionario} - {x.cargo}</li>
        ))}
      </ul>
      <input placeholder="Funcionario" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
