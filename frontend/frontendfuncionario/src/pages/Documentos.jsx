export default function Documentos() {
  return (
    <div style={{ padding: "50px" }}>
      <h2>Mis Documentos</h2>
      <p>Aquí puedes subir certificados, diplomas o constancias en PDF.</p>
      <input type="file" accept="application/pdf" />
    </div>
  );
}
