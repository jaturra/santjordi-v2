import { Link } from "react-router-dom";
import AdminMenu from "./AdminMenu";
import "../Admin/Admin.css";

export default function BebidasAdmin() {
  return (
    <div className="sj-admin">
      <div className="sj-admin__paper">
        
        {/* Cabecera con el menú */}
        <header className="sj-admin__top">
          <Link to="/admin" className="sj-admin__brandLink" aria-label="Tornar a l'inici">
            <div className="sj-admin__brand">
              <div className="sj-admin__brandName">BAR SANT JORDI</div>
              <div className="sj-admin__brandSub">Admin Begudes</div>
            </div>
          </Link>
          <div className="sj-admin__actions">
            <AdminMenu />
          </div>
        </header>

        <div className="sj-admin__rule" />

        {/* Contenido temporal */}
        <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(27, 43, 74, 0.7)" }}>
          <h2 style={{ marginBottom: "10px" }}>🍷 Gestió de Begudes</h2>
          <p>Aquesta pàgina està preparada. Properament afegirem la lògica per editar les begudes.</p>
        </div>

      </div>
    </div>
  );
}