import { useState } from "react";

export default function Ascensos() {
  const [items, setItems] = useState([
    { id: 1, funcionario: "Carlos", estado: "Elegible" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, funcionario: nuevo, estado: "Pendiente" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Ascensos</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.funcionario} - {x.estado}</li>)}
      </ul>
      <input placeholder="Funcionario" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
