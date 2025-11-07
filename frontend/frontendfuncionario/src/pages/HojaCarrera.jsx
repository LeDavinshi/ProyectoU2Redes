import { useState } from "react";

export default function HojaCarrera() {
  const [resumen] = useState({
    funcionario: "Mi Nombre",
    cargo: "Mi Cargo",
    bienios: 2,
    puntaje: 110,
  });
  return (
    <div style={{ padding: "40px" }}>
      <h2>Mi Hoja de Carrera</h2>
      <p><strong>Funcionario:</strong> {resumen.funcionario}</p>
      <p><strong>Cargo:</strong> {resumen.cargo}</p>
      <p><strong>Bienios:</strong> {resumen.bienios}</p>
      <p><strong>Puntaje:</strong> {resumen.puntaje}</p>
      <p>Detalle se completará al conectar con backend.</p>
    </div>
  );
}
