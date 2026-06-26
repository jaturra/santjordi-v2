import { useEffect, useState } from "react";import "../Admin/Admin.css"; 
import * as api from "../../api/sjApi";
import { Link } from "react-router-dom";

type LangText = api.LangText;

// 🚀 FIX DEL PRECIO: Protegido contra errores matemáticos
function fmtEUR(n: any) {
  const v = Number(n);
  const valid = Number.isFinite(v) ? v : 0;
  return `${valid.toFixed(2).replace(".", ",")}€`;
}

const months = {
  ca: ["gener","febrer","març","abril","maig","juny","juliol","agost","setembre","octubre","novembre","desembre"],
  es: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
};

// 🚀 FIX DE FECHAS: Ahora no explota si no hay fecha configurada en el admin
function formatRange(dateFromISO?: string | null, dateToISO?: string | null, lang: "ca" | "es" = "ca") {
  if (!dateFromISO || !dateToISO || dateFromISO === "null" || dateToISO === "null") return "";
  
  const a = new Date(dateFromISO);
  const b = new Date(dateToISO);
  
  // Si la fecha es inválida, no devolvemos nada para que no quede feo
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return "";

  const d1 = a.getDate();
  const d2 = b.getDate();
  const m = months[lang][b.getMonth()];
  return `del ${d1} al ${d2} de ${m}`;
}

// Renderiza cada fila de plato para el cliente (Diseño Carta de Restaurante)
function Row({ title, price }: { title: LangText; price: any }) {
  const ca = title?.ca?.trim();
  const es = title?.es?.trim();
  
  return (
    <div className="menuRow" style={{ cursor: "default" }}>
      <div className="menuRow__left">
        <div className="menuRow__titleLine">
          {/* Catalán Principal (Grande) */}
          <span className="menuRow__title">- {ca || es || "—"}</span>
          <span className="menuRow__leader" />
          <span className="menuRow__price">{fmtEUR(price)}</span>
        </div>
        {/* Castellano Secundario (Pequeño y cursiva) */}
        {es && es !== ca && (
          <div className="menuRow__subItalic" style={{ fontSize: "0.85em", color: "rgba(27, 43, 74, 0.65)", marginTop: "2px", fontWeight: "500", textAlign: "left" }}>
            {es}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sugerencias() {
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<api.AdminSuggestionsCurrent["sheet"]>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Obtenemos los datos PÚBLICOS (sin token de admin)
        const data = await api.getPublicSuggestionsCurrent(); 
        setSheet(data.sheet);
      } catch (e: any) {
        console.error("Error cargando sugerencias:", e);
        // Si falla (por ejemplo, no hay sugerencias), lo dejamos en null en lugar de asustar al cliente
        setSheet(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 🚀 FIX DE ARRAYS: Sacamos las secciones de forma segura
  const food = sheet?.sections?.food || [];
  const desserts = sheet?.sections?.desserts || [];
  const other = sheet?.sections?.other || [];

  const hasContent = food.length > 0 || desserts.length > 0 || other.length > 0;

  return (
    <div className="sj-admin">
      <div className="sj-admin__paper">
        <header className="sj-admin__top">
          <Link to="/" className="sj-admin__brandLink" aria-label="Tornar a l'inici">
            <div className="sj-admin__brand">
              <div className="sj-admin__brandName">BAR SANT JORDI</div>
              {sheet ? (
                <div className="sj-admin__brandSub">
                  Especialitats {formatRange(sheet.dateFrom as string, sheet.dateTo as string, "ca")}
                </div>
              ) : (
                <div className="sj-admin__brandSub">Fora de Carta</div>
              )}
            </div>
          </Link>
        </header>

        <div className="sj-admin__rule" />

        {loading ? (
          <div style={{ padding: 16, opacity: 0.7, textAlign: "center" }}>Carregant les especialitats…</div>
        ) : !sheet || !hasContent ? (
          <div className="menuEmpty" style={{ padding: 40, textAlign: "center", border: "none" }}>
            Avui no tenim especialitats fora de carta actives. Consulta la nostra carta principal!
          </div>
        ) : (
          <div className="sj-admin__grid sj-admin__grid--stack">
            <div className="sj-admin__col">
              
              {food.length > 0 && (
                <section className="menuSection">
                  <div className="menuSection__head">
                    <div className="menuSection__title">Tapes i Plats</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {food.sort((a,b) => a.order - b.order).map((i) => (
                      <Row key={i.id} title={i.title} price={i.price} />
                    ))}
                  </div>
                </section>
              )}

              {desserts.length > 0 && (
                <section className="menuSection">
                  <div className="menuSection__head">
                    <div className="menuSection__title">Postres</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {desserts.sort((a,b) => a.order - b.order).map((i) => (
                      <Row key={i.id} title={i.title} price={i.price} />
                    ))}
                  </div>
                </section>
              )}

              {other.length > 0 && (
                <section className="menuSection">
                  <div className="menuSection__head">
                    <div className="menuSection__title">Altres</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {other.sort((a,b) => a.order - b.order).map((i) => (
                      <Row key={i.id} title={i.title} price={i.price} />
                    ))}
                  </div>
                </section>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}