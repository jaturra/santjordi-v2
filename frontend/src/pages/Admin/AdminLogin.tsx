import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../../api/sjApi";

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await api.loginAdmin({ username, password });
      
      // 1. Configuramos tu API como ya lo hacías
      api.setToken(token);
      
      // 2. 👇 EL SEGURO DE VIDA (Guardamos explícitamente en el navegador) 👇
      localStorage.setItem("token", token);
      localStorage.setItem("admin", "true");
      
      // 3. Navegamos a la página protegida
      nav("/admin/carta");
      
    } catch (err: any) {
      alert(err?.message ?? "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={onSubmit} style={{ width: 360, maxWidth: "100%", background: "#fff", padding: 18, borderRadius: 14 }}>
        <h2 style={{ marginTop: 0 }}>Admin login</h2>

        <label style={{ display: "block", marginBottom: 8 }}>
          Usuario
          <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <button disabled={loading} style={{ width: "100%", padding: 12, fontWeight: 800 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
