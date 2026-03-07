import { useEffect, useMemo, useState } from "react";
import "../Admin/Admin.css"; // Usa la misma estética de la carta
import * as api from "../../api/sjApi";
import { Link } from "react-router-dom";

type DisplayMode = "bilingual" | "ca" | "es";
type Lang = "ca" | "es";
type LangText = api.LangText;

const DISPLAY_KEY = "sj_admin_displayMode";

function fmtEUR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(2).replace(".", ",")}€`;
}

function pickText(t: LangText, lang: Lang) {
  return (t?.[lang] ?? "").trim();
}

// Función simplificada para los títulos de las secciones de los clientes
function headingFor(t: LangText, mode: DisplayMode) {
  const ca = pickText(t, "ca");
  const es = pickText(t, "es");
  if (mode === "bilingual") return ca && es && ca !== es ? `${ca} / ${es}` : ca || es || "—";
  return pickText(t, mode) || (mode === "ca" ? es : ca) || "—";
}

const months = {
  ca: ["gener","febrer","març","abril","maig","juny","juliol","agost","setembre","octubre","novembre","desembre"],
  es: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
};

function formatRange(dateFromISO: string, dateToISO: string, lang: Lang) {
  const a = new Date(dateFromISO);
  const b = new Date(dateToISO);
  const d1 = a.getDate();
  const d2 = b.getDate();
  const m = months[lang][b.getMonth()];
  
  if (lang === "ca") return `del ${d1} al ${d2} de ${m}`;
  return `del ${d1} al ${d2} de ${m}`;
}

function RangeTitle({ from, to, mode }: { from: string; to: string; mode: DisplayMode }) {
  const ca = `Especialitats ${formatRange(from, to, "ca")}`;
  const es = `Especialidades ${formatRange(from, to, "es")}`;

  if (mode === "bilingual") return <div className="sj-admin__brandSub">{ca} / {es}</div>;
  return <div className="sj-admin__brandSub">{mode === "ca" ? ca : es}</div>;
}

// Renderiza cada fila de plato para el cliente
function Row({ title, price, mode }: { title: LangText; price: number; mode: DisplayMode }) {
  const main = headingFor(title, mode);
  
  return (
    <div className="menuRow" style={{ cursor: "default" }}>
      <div className="menuRow__left">
        <div className="menuRow__titleLine">
          <span className="menuRow__title">{main}</span>
          <span className="menuRow__leader" />
          <span className="menuRow__price">{fmtEUR(price)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Sugerencias() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("bilingual");
  const [loading, setLoading] = useState(true);
  
  // Usamos el tipo correcto para la respuesta actual de la API
  const [sheet, setSheet] = useState<api.AdminSuggestionsCurrent["sheet"]>(null);

  useEffect(() => {
    const saved = localStorage.getItem(DISPLAY_KEY);
    if (saved === "bilingual" || saved === "ca" || saved === "es") setDisplayMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(DISPLAY_KEY, displayMode);
  }, [displayMode]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // CORRECCIÓN: Usamos getAdminSuggestionsCurrent() temporalmente si tu API pública no está lista
        // Si tu backend tiene la ruta pública /api/suggestions, usa api.getSuggestionsCurrent()
        const data = await api.getAdminSuggestionsCurrent(); 
        setSheet(data.sheet);
      } catch (e: any) {
        alert(e?.message ?? "Error carregant suggerències");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasContent = useMemo(() => {
    if (!sheet) return false;
    return (
      sheet.sections.food.length > 0 ||
      sheet.sections.desserts.length > 0 ||
      sheet.sections.other.length > 0
    );
  }, [sheet]);

  return (
    <div className="sj-admin">
      <div className="sj-admin__paper">
        <header className="sj-admin__top">
          <Link to="/" className="sj-admin__brandLink" aria-label="Tornar a l'inici">
            <div className="sj-admin__brand">
              <div className="sj-admin__brandName">BAR SANT JORDI</div>
              {sheet ? <RangeTitle from={String(sheet.dateFrom)} to={String(sheet.dateTo)} mode={displayMode} /> : <div className="sj-admin__brandSub">Sugerències</div>}
            </div>
          </Link>

          {/* Botones de idioma (Opcional en sugerencias si siempre pones el texto igual, pero lo dejamos por coherencia) */}
          {/* <div className="sj-admin__actions">
            <div className="seg">
              <button className={`seg__btn ${displayMode === "bilingual" ? "is-on" : ""}`} onClick={() => setDisplayMode("bilingual")} type="button">CA/ES</button>
              <button className={`seg__btn ${displayMode === "ca" ? "is-on" : ""}`} onClick={() => setDisplayMode("ca")} type="button">CA</button>
              <button className={`seg__btn ${displayMode === "es" ? "is-on" : ""}`} onClick={() => setDisplayMode("es")} type="button">ES</button>
            </div>
          </div> */}
        </header>

        <div className="sj-admin__rule" />

        {loading ? (
          <div style={{ padding: 16, opacity: 0.7, textAlign: "center" }}>Carregant…</div>
        ) : !sheet || !hasContent ? (
          <div className="menuEmpty" style={{ padding: 40, textAlign: "center", border: "none" }}>
            Avui no tenim suggeriments especials actius. Consulta la nostra carta principal!
          </div>
        ) : (
          <div className="sj-admin__grid sj-admin__grid--stack">
            <div className="sj-admin__col">
              
              {sheet.sections.food.length > 0 && (
                <section className="menuSection">
                  <div className="menuSection__head">
                    <div className="menuSection__title">{headingFor({ ca: "Tapes i Plats", es: "Tapas y Platos" }, displayMode)}</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {sheet.sections.food.sort((a,b) => a.order - b.order).map((i) => (
                      <Row key={i.id} title={i.title} price={i.price} mode={displayMode} />
                    ))}
                  </div>
                </section>
              )}

              {sheet.sections.desserts.length > 0 && (
                <section className="menuSection">
                  <div className="menuSection__head">
                    <div className="menuSection__title">{headingFor({ ca: "Postres", es: "Postres" }, displayMode)}</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {sheet.sections.desserts.sort((a,b) => a.order - b.order).map((i) => (
                      <Row key={i.id} title={i.title} price={i.price} mode={displayMode} />
                    ))}
                  </div>
                </section>
              )}

              {sheet.sections.other.length > 0 && (
                <section className="menuSection">
                  <div className="menuSection__head">
                    <div className="menuSection__title">{headingFor({ ca: "Altres", es: "Otros" }, displayMode)}</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {sheet.sections.other.sort((a,b) => a.order - b.order).map((i) => (
                      <Row key={i.id} title={i.title} price={i.price} mode={displayMode} />
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