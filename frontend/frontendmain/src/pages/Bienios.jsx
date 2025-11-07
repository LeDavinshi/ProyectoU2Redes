import { useState } from "react";

export default function Bienios() {
  const [items, setItems] = useState([
    { id: 1, funcionario: "Carlos", periodo: "2023-2025" },
  ]);
  const [nuevo, setNuevo] = useState("");

  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, funcionario: nuevo, periodo: "-" }]);
    setNuevo("");
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2>Bienios</h2>
      <ul>
        {items.map((x) => (
          <li key={x.id}>{x.funcionario} - {x.periodo}</li>
        ))}
      </ul>
      <input placeholder="Funcionario" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
