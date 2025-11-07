import { useState } from "react";

export default function Certificados() {
  const [items, setItems] = useState([
    { id: 1, tipo: "Laboral", funcionario: "María" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, tipo: nuevo, funcionario: "-" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Emisión de Certificados</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.tipo} - {x.funcionario}</li>)}
      </ul>
      <input placeholder="Tipo certificado" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
