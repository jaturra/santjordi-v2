import { Link, useNavigate } from "react-router-dom";
import "../Admin/Admin.css";
import { logoutAdmin } from "../../api/sjApi";

export default function HomeAdmin() {
  const navigate = useNavigate();

  function handleLogout() {
    logoutAdmin();
    // Redirigir al login o a la home pública tras cerrar sesión
    navigate("/login"); 
  }

  return (
    <div className="sj-admin">
      <div className="sj-admin__paper" style={{ maxWidth: "800px", margin: "40px auto", padding: "40px" }}>
        
        <header className="sj-admin__top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="sj-admin__brand">
            <div className="sj-admin__brandName">BAR SANT JORDI</div>
            <div className="sj-admin__brandSub">Panell d'Administració</div>
          </div>
          <button className="btn btn--danger" onClick={handleLogout} style={{ padding: "8px 16px" }}>
            Tancar sessió
          </button>
        </header>

        <div className="sj-admin__rule" />

        <div style={{ marginTop: "20px", marginBottom: "40px", textAlign: "center", color: "rgba(27, 43, 74, 0.7)" }}>
          Benvingut al panell de control. Què vols gestionar avui?
        </div>

        {/* Grid con los botones principales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          
          <Link to="/admin/carta" className="btn btn--primary" style={{ padding: "40px 20px", fontSize: "1.2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "2rem" }}>🍕</span>
            Editar Carta
          </Link>
          
          <Link to="/admin/sugerencias" className="btn btn--primary" style={{ padding: "40px 20px", fontSize: "1.2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "2rem" }}>⭐</span>
            Suggeriments
          </Link>
          
          <Link to="/admin/bebidas" className="btn btn--primary" style={{ padding: "40px 20px", fontSize: "1.2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", backgroundColor: "#1b2b4a" }}>
            <span style={{ fontSize: "2rem" }}>🍷</span>
            Begudes
          </Link>

        </div>
      </div>
    </div>
  );
}