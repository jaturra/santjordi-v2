// src/components/Footer.tsx
import { Link } from "react-router-dom";
// 👇 Recuerda importar tu archivo CSS aquí (ajusta la ruta según dónde lo guardes)
import "./Footer.css"; 

export default function Footer() {
  return (
    <footer className="home-base__footer">
      <p>© {new Date().getFullYear()} Bar Sant Jordi. Tots els drets reservats.</p>
      
      <div className="home-base__legal">
        <Link to="/aviso-legal">Avís Legal</Link>
        <Link to="/privacidad">Privacitat</Link>
        <Link to="/cookies">Cookies</Link>
      </div>
    </footer>
  );
}