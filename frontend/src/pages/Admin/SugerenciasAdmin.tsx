import { useEffect, useMemo, useState } from "react";
import "../Admin/Admin.css";
import * as api from "../../api/sjApi";
import { Link } from "react-router-dom";

type LangText = api.LangText;
type Section = api.SuggestionSection;

function fmtEUR(n: any) {
  const v = Number(n);
  const valid = Number.isFinite(v) ? v : 0;
  return `${valid.toFixed(2).replace(".", ",")}€`;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type Item = { id: string; section: Section; title: LangText; price: any; order: number };
type Drag = null | { itemId: string; from: Section };

export default function SugerenciasAdmin() {
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<api.AdminSuggestionsCurrent["sheet"]>(null);

  const [dateFrom, setDateFrom] = useState<string>(isoDate(new Date()));
  const [dateTo, setDateTo] = useState<string>(isoDate(new Date(Date.now() + 2 * 86400000)));

  const [dlg, setDlg] = useState<null | { section: Section; editing?: Item }>(null);
  const [titleCa, setTitleCa] = useState("");
  const [titleEs, setTitleEs] = useState("");
  const [price, setPrice] = useState<string>(""); 

  const [drag, setDrag] = useState<Drag>(null);
  const [drop, setDrop] = useState<null | { section: Section; beforeId?: string }>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getAdminSuggestionsCurrent();
      setSheet(data.sheet);

      if (data.sheet) {
        setDateFrom(String(data.sheet.dateFrom).slice(0, 10));
        setDateTo(String(data.sheet.dateTo).slice(0, 10));
      }
    } catch (e: any) {
      alert(e?.message ?? "Error carregant suggerències (admin)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const food = useMemo(() => sheet?.sections.food ?? [], [sheet]);
  const desserts = useMemo(() => sheet?.sections.desserts ?? [], [sheet]);
  const other = useMemo(() => sheet?.sections.other ?? [], [sheet]);

  function openNewItem(section: Section) {
    setDlg({ section });
    setTitleCa("");
    setTitleEs("");
    setPrice("");
  }

  function openEditItem(item: Item) {
    setDlg({ section: item.section, editing: item });
    setTitleCa(item.title.ca || "");
    setTitleEs(item.title.es || "");
    setPrice(Number(item.price || 0).toString().replace(".", ",")); 
  }

  async function createSheet() {
    try {
      await api.createSuggestionSheet({ dateFrom, dateTo, isActive: true });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error creant full de suggerències");
    }
  }

  async function saveSheetDates() {
    if (!sheet) return;
    try {
      await api.updateSuggestionSheet(sheet.id, { dateFrom, dateTo });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error guardant dates");
    }
  }

  async function saveItem() {
    if (!sheet || !dlg) return;
    try {
      let numStr = price.replace(",", ".");
      if (numStr === "") numStr = "0";
      const parsedPrice = Number(numStr) || 0;
      
      const payload = { 
        title: { ca: titleCa.trim(), es: titleEs.trim() }, 
        price: parsedPrice 
      };

      if (dlg.editing) {
        await api.updateSuggestionItem(dlg.editing.id, payload);
      } else {
        await api.createSuggestionItem({
          sheetId: sheet.id,
          section: dlg.section,
          ...payload,
        });
      }

      setDlg(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error guardant item");
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Borrar aquest item?")) return;
    try {
      await api.deleteSuggestionItem(id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error borrant item");
    }
  }

  function listFor(section: Section): Item[] {
    if (!sheet) return [];
    if (section === "FOOD") return food as any;
    if (section === "DESSERT") return desserts as any;
    return other as any;
  }

  async function persistMoveOrReorder(from: Section, to: Section, nextToIds: string[], nextFromIds?: string[]) {
    if (!sheet) return;
    try {
      if (nextFromIds) {
        await api.reorderSuggestionItems(sheet.id, from, nextFromIds);
      }
      await api.reorderSuggestionItems(sheet.id, to, nextToIds);
    } catch (e: any) {
      alert("Error guardant ordre. Revisa connexió.");
      await load();
    }
  }

  function onDropInto(section: Section, beforeId?: string) {
    if (!sheet || !drag) return;

    const from = drag.from;
    const to = section;

    const fromList = listFor(from).map((x) => x.id);
    const toList = listFor(to).map((x) => x.id);
    const itemId = drag.itemId;

    const fromIds = fromList.filter((id) => id !== itemId);
    const toIdsBase = from === to ? fromIds : toList;

    const insertIndex = beforeId ? Math.max(0, toIdsBase.indexOf(beforeId)) : toIdsBase.length;
    const toIds = [...toIdsBase];
    if (!toIds.includes(itemId)) toIds.splice(insertIndex, 0, itemId);

    setSheet((prev) => {
      if (!prev) return prev;
      const all = [...prev.sections.food, ...prev.sections.desserts, ...prev.sections.other];
      const map = new Map(all.map((x) => [x.id, x]));
      const build = (sec: Section, ids: string[]) =>
        ids.map((id, idx) => {
          const it = map.get(id)!;
          return { ...it, section: sec, order: idx };
        });

      return {
        ...prev,
        sections: {
          food: secIds("FOOD", from, to, fromIds, toIds, prev.sections.food.map((x) => x.id), build) as any,
          desserts: secIds("DESSERT", from, to, fromIds, toIds, prev.sections.desserts.map((x) => x.id), build) as any,
          other: secIds("OTHER", from, to, fromIds, toIds, prev.sections.other.map((x) => x.id), build) as any,
        },
      };
    });

    void (async () => {
      await persistMoveOrReorder(from, to, toIds, from === to ? undefined : fromIds);
      setDrag(null);
      setDrop(null);
      await load(); 
    })();
  }

  return (
    <div className="sj-admin">
      <div className="sj-admin__paper">
        <header className="sj-admin__top">
          <Link to="/" className="sj-admin__brandLink" aria-label="Tornar a l'inici">
            <div className="sj-admin__brand">
              <div className="sj-admin__brandName">BAR SANT JORDI</div>
              <div className="sj-admin__brandSub">Admin Suggeriments</div>
            </div>
          </Link>
          <div className="sj-admin__actions"></div>
        </header>

        <div className="sj-admin__rule" />

        {loading ? (
          <div style={{ padding: 16, opacity: 0.7 }}>Carregant…</div>
        ) : (
          <div className="sj-admin__grid sj-admin__grid--stack">
            
            <div style={{ textAlign: "center", marginBottom: "10px", color: "rgba(27, 43, 74, 0.7)", fontSize: "14px", fontWeight: "600", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div className="field field--small" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
                <span>Inici:</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "6px" }} />
              </div>
              <span style={{ color: "#d7b45a" }}>•</span> 
              <div className="field field--small" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
                <span>Fi:</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "6px" }} />
              </div>

              {!sheet ? (
                <button className="btn btn--primary" style={{ marginLeft: "10px" }} type="button" onClick={createSheet}>
                  Crear primera fulla
                </button>
              ) : (
                <button className="btn btn--primary" style={{ marginLeft: "10px" }} type="button" onClick={saveSheetDates}>
                  Guardar dates
                </button>
              )}
            </div>

            {!sheet ? (
              <div className="menuEmpty" style={{ textAlign: "center", padding: "40px 20px" }}>
                No hi ha cap full actiu. Clica "Crear primera fulla".
              </div>
            ) : (
              <div className="sj-admin__col">
                <SectionBlock title={{ ca: "Tapes i Plats", es: "Tapas y Platos" }} section="FOOD" items={food} drag={drag} drop={drop} onAdd={() => openNewItem("FOOD")} onEdit={openEditItem} onDelete={removeItem} onDragStart={(itemId) => setDrag({ itemId, from: "FOOD" })} onDragEnd={() => { setDrag(null); setDrop(null); }} onDragOver={(beforeId) => setDrop({ section: "FOOD", beforeId })} onDrop={(beforeId) => onDropInto("FOOD", beforeId)} onDropEnd={() => onDropInto("FOOD", undefined)} />
                <SectionBlock title={{ ca: "Postres", es: "Postres" }} section="DESSERT" items={desserts} drag={drag} drop={drop} onAdd={() => openNewItem("DESSERT")} onEdit={openEditItem} onDelete={removeItem} onDragStart={(itemId) => setDrag({ itemId, from: "DESSERT" })} onDragEnd={() => { setDrag(null); setDrop(null); }} onDragOver={(beforeId) => setDrop({ section: "DESSERT", beforeId })} onDrop={(beforeId) => onDropInto("DESSERT", beforeId)} onDropEnd={() => onDropInto("DESSERT", undefined)} />
                <SectionBlock title={{ ca: "Altres", es: "Otros" }} section="OTHER" items={other} drag={drag} drop={drop} onAdd={() => openNewItem("OTHER")} onEdit={openEditItem} onDelete={removeItem} onDragStart={(itemId) => setDrag({ itemId, from: "OTHER" })} onDragEnd={() => { setDrag(null); setDrop(null); }} onDragOver={(beforeId) => setDrop({ section: "OTHER", beforeId })} onDrop={(beforeId) => onDropInto("OTHER", beforeId)} onDropEnd={() => onDropInto("OTHER", undefined)} />
              </div>
            )}
          </div>
        )}
      </div>

      {dlg && (
        <>
          <div className="dlg__backdrop" onMouseDown={() => setDlg(null)} />
          <div className="dlg" role="dialog" aria-modal="true">
            <div className="dlg__head">
              <div className="dlg__title">{dlg.editing ? "Editar suggeriment" : "Nou suggeriment"}</div>
              <button className="iconBtn" type="button" onClick={() => setDlg(null)} title="Tancar">✕</button>
            </div>

            <div className="dlg__body">
              <form className="dlg__p" onSubmit={(e) => { 
                e.preventDefault(); 
                if (!titleCa.trim() && !titleEs.trim()) return alert("Has d'escriure el nom en almenys un idioma.");
                saveItem(); 
              }}>
                <div className="formGrid">
                  <label className="field">
                    <span>Nom (CA)</span>
                    <input value={titleCa} onChange={(e) => setTitleCa(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Nombre (ES)</span>
                    <input value={titleEs} onChange={(e) => setTitleEs(e.target.value)} />
                  </label>
                  <label className="field field--small">
                    <span>Preu (€)</span>
                    <input type="text" inputMode="decimal" placeholder="Ej: 3,50" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </label>
                </div>

                <div className="dlg__actions">
                  {dlg.editing ? (
                    <button className="btn btn--danger" type="button" onClick={() => removeItem(dlg.editing!.id)}>
                      Borrar
                    </button>
                  ) : <div></div>}

                  <div className="dlg__actionsRight">
                    <button className="btn btn--ghost" type="button" onClick={() => setDlg(null)}>Cancel·lar</button>
                    <button className="btn btn--primary" type="submit">Guardar</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionBlock(props: {
  title: LangText;
  section: Section;
  items: Item[];

  drag: Drag;
  drop: null | { section: Section; beforeId?: string };

  onAdd: () => void;
  onEdit: (it: Item) => void;
  onDelete: (id: string) => void;

  onDragStart: (itemId: string) => void;
  onDragEnd: () => void;

  onDragOver: (beforeId?: string) => void;
  onDrop: (beforeId?: string) => void;
  onDropEnd: () => void;
}) {
  const isSectionDrop = props.drop?.section === props.section && !props.drop.beforeId;

  return (
    <section
      className={`menuSection ${isSectionDrop ? "is-drop" : ""}`}
      onDragOver={(e) => {
        if (!props.drag) return;
        e.preventDefault();
        e.stopPropagation();
        props.onDragOver(undefined);
      }}
      onDrop={(e) => {
        if (!props.drag) return;
        e.preventDefault();
        e.stopPropagation();
        props.onDropEnd();
      }}
    >
      <div className="menuSection__head">
        <div className="menuSection__headLeft">
          <div className="menuSection__title">{props.title.ca}</div>
        </div>
        <div className="menuSection__headBtns">
          <button className="iconBtn" type="button" onClick={props.onAdd} title="Afegir">+</button>
        </div>
      </div>

      <div className="menuSection__rule" />

      {props.items.length === 0 ? (
        <div className="menuEmpty">Sense items. Arrossega aquí o clica “+”.</div>
      ) : (
        <div className="menuList">
          {props.items.map((it) => {
            const isDropBefore = props.drop?.section === props.section && props.drop.beforeId === it.id;
            return (
              <div
                key={it.id}
                className={`menuRowWrap ${isDropBefore ? "is-drop" : ""}`}
                onDragOver={(e) => {
                  if (!props.drag) return;
                  e.preventDefault();
                  e.stopPropagation();
                  props.onDragOver(it.id);
                }}
                onDrop={(e) => {
                  if (!props.drag) return;
                  e.preventDefault();
                  e.stopPropagation();
                  props.onDrop(it.id);
                }}
              >
                <span className="dragHandle dragHandle--row" draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; props.onDragStart(it.id); }} onDragEnd={props.onDragEnd} title="Arrossega">
                  ⠿
                </span>

                <button className="menuRow" type="button" onClick={() => props.onEdit(it)}>
                  <div className="menuRow__left">
                    <div className="menuRow__titleLine">
                      <span className="menuRow__title">- {it.title.ca || it.title.es || "—"}</span>
                      <span className="menuRow__leader" />
                      <span className="menuRow__price">{fmtEUR(it.price)}</span>
                    </div>
                    {it.title.es && it.title.es !== it.title.ca && (
                      <div className="menuRow__subItalic" style={{ fontSize: "0.85em", color: "rgba(27, 43, 74, 0.65)", marginTop: "2px", fontWeight: "500", textAlign: "left" }}>
                        {it.title.es}
                      </div>
                    )}
                  </div>
                </button>

                <button className="iconBtn iconBtn--danger" type="button" title="Borrar" onClick={(e) => { e.stopPropagation(); props.onDelete(it.id); }}>
                  🗑
                </button>
              </div>
            );
          })}

          <div className="dropZone" onDragOver={(e) => { if (!props.drag) return; e.preventDefault(); e.stopPropagation(); props.onDragOver(undefined); }} onDrop={(e) => { if (!props.drag) return; e.preventDefault(); e.stopPropagation(); props.onDropEnd(); }} />
        </div>
      )}
    </section>
  );
}

function secIds(sec: Section, from: Section, to: Section, fromIds: string[], toIds: string[], originalIds: string[], build: (sec: Section, ids: string[]) => Item[]) {
  if (sec === to) return build(sec, toIds);
  if (sec === from) return build(sec, fromIds);
  return build(sec, originalIds);
}