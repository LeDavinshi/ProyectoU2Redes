import { useState } from "react";

export default function HistorialCargos() {
  const [items] = useState([
    { id: 1, cargo: "Técnico", desde: "2022-01-01", hasta: "2024-01-01" },
    { id: 2, cargo: "Profesional", desde: "2024-01-02", hasta: null },
  ]);
  return (
    <div style={{ padding: "40px" }}>
      <h2>Mi Historial de Cargos</h2>
      <ul>
        {items.map((x) => (
          <li key={x.id}>{x.cargo} — {x.desde} {x.hasta ? `→ ${x.hasta}` : "(actual)"}</li>
        ))}
      </ul>
    </div>
  );
}
