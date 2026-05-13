import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1a1a1a', color: '#ccc', padding: '20px', textAlign: 'center', fontSize: '14px', marginTop: 'auto' }}>
      <p>© {new Date().getFullYear()} Bar Sant Jordi. Tots els drets reservats.</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
        <Link to="/aviso-legal" style={{ color: '#ccc', textDecoration: 'none' }}>Avís Legal</Link>
        <Link to="/privacidad" style={{ color: '#ccc', textDecoration: 'none' }}>Privacitat</Link>
        <Link to="/cookies" style={{ color: '#ccc', textDecoration: 'none' }}>Cookies</Link>
      </div>
    </footer>
  );
}