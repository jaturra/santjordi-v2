import { useEffect, useMemo, useState } from "react";
import "../Admin/Admin.css"; 
import * as api from "../../api/sjApi";
import { Link } from "react-router-dom";

type Lang = "ca" | "es";
type LangText = api.LangText;

function fmtEUR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(2).replace(".", ",")}€`;
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
  return `del ${d1} al ${d2} de ${m}`;
}

// Renderiza cada fila de plato para el cliente (Diseño Carta de Restaurante)
function Row({ title, price }: { title: LangText; price: number }) {
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
        // Obtenemos los datos tal cual están en el backend
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
              {sheet ? (
                <div className="sj-admin__brandSub">Especialitats {formatRange(String(sheet.dateFrom), String(sheet.dateTo), "ca")}</div>
              ) : (
                <div className="sj-admin__brandSub">Suggerències</div>
              )}
            </div>
          </Link>
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
                    <div className="menuSection__title">Tapes i Plats</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {sheet.sections.food.sort((a,b) => a.order - b.order).map((i) => (
                      <Row key={i.id} title={i.title} price={i.price} />
                    ))}
                  </div>
                </section>
              )}

              {sheet.sections.desserts.length > 0 && (
                <section className="menuSection">
                  <div className="menuSection__head">
                    <div className="menuSection__title">Postres</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {sheet.sections.desserts.sort((a,b) => a.order - b.order).map((i) => (
                      <Row key={i.id} title={i.title} price={i.price} />
                    ))}
                  </div>
                </section>
              )}

              {sheet.sections.other.length > 0 && (
                <section className="menuSection">
                  <div className="menuSection__head">
                    <div className="menuSection__title">Altres</div>
                  </div>
                  <div className="menuSection__rule" />
                  <div className="menuList">
                    {sheet.sections.other.sort((a,b) => a.order - b.order).map((i) => (
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