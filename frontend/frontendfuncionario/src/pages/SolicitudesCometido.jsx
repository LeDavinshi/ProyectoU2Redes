import { useState } from "react";

export default function SolicitudesCometido() {
  const [items, setItems] = useState([
    { id: 1, destino: "Valparaíso", estado: "Solicitado" },
  ]);
  const [destino, setDestino] = useState("");
  const agregar = () => {
    if (!destino) return;
    setItems([...items, { id: items.length + 1, destino, estado: "Solicitado" }]);
    setDestino("");
  };
  return (
    <div style={{ padding: "40px" }}>
      <h2>Solicitud de Cometido</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.destino} - {x.estado}</li>)}
      </ul>
      <input placeholder="Destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
      <button onClick={agregar}>Solicitar</button>
    </div>
  );
}
