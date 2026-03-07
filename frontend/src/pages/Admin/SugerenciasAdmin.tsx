import { useEffect, useMemo, useState } from "react";
import "../Admin/Admin.css"; 
import * as api from "../../api/sjApi";
import { Link } from "react-router-dom";

type Section = api.SuggestionSection;

function fmtEUR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(2).replace(".", ",")}€`;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// CORRECCIÓN: Volvemos a decirle a TypeScript que 'title' es 'api.LangText'
type Item = { id: string; section: Section; title: api.LangText; price: number; order: number };
type Drag = null | { itemId: string; from: Section };

export default function SugerenciasAdmin() {
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<api.AdminSuggestionsCurrent["sheet"]>(null);

  // editor sheet
  const [dateFrom, setDateFrom] = useState<string>(isoDate(new Date()));
  const [dateTo, setDateTo] = useState<string>(isoDate(new Date(Date.now() + 2 * 86400000)));

  // modal item (solo usamos un título en la UI)
  const [dlg, setDlg] = useState<null | { section: Section; editing?: Item }>(null);
  const [title, setTitle] = useState(""); 
  const [price, setPrice] = useState<number>(0);

  // DnD
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
    setTitle("");
    setPrice(0);
  }

  function openEditItem(item: Item) {
    setDlg({ section: item.section, editing: item });
    // CORRECCIÓN: Al abrir, cogemos el texto guardado (ya sea ca o es)
    setTitle(item.title.ca || item.title.es || "");
    setPrice(item.price);
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
      // CORRECCIÓN MAGIA: Mandamos un solo input pero duplicado para cumplir con la API
      const payload = { 
        title: { ca: title, es: title }, 
        price: Number(price) || 0 
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
      alert(e?.message ?? "Error guardant ordre");
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

      const nextFood = secIds("FOOD", from, to, fromIds, toIds, prev.sections.food.map((x) => x.id), build);
      const nextDess = secIds("DESSERT", from, to, fromIds, toIds, prev.sections.desserts.map((x) => x.id), build);
      const nextOther = secIds("OTHER", from, to, fromIds, toIds, prev.sections.other.map((x) => x.id), build);

      return {
        ...prev,
        sections: { food: nextFood as any, desserts: nextDess as any, other: nextOther as any },
      };
    });

    void (async () => {
      if (from === to) {
        await persistMoveOrReorder(from, to, toIds);
      } else {
        await persistMoveOrReorder(from, to, toIds, fromIds);
      }
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

          <div className="sj-admin__actions">
            {!sheet ? (
              <button className="btn btn--primary" type="button" onClick={createSheet}>
                Crear primera fulla
              </button>
            ) : (
              <button className="btn btn--primary" type="button" onClick={saveSheetDates}>
                Guardar dates
              </button>
            )}
          </div>
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
            </div>

            {!sheet ? (
              <div className="menuEmpty" style={{ textAlign: "center", padding: "40px 20px" }}>
                No hi ha cap full actiu. Clica el botó blau per crear-ne un.
              </div>
            ) : (
              <div className="sj-admin__col">
                <SectionBlock
                  title="Tapes i Plats"
                  section="FOOD"
                  items={food as any}
                  drag={drag}
                  drop={drop}
                  onAdd={() => openNewItem("FOOD")}
                  onEdit={openEditItem}
                  onDelete={removeItem}
                  onDragStart={(itemId) => setDrag({ itemId, from: "FOOD" })}
                  onDragEnd={() => { setDrag(null); setDrop(null); }}
                  onDragOver={(beforeId) => setDrop({ section: "FOOD", beforeId })}
                  onDrop={(beforeId) => onDropInto("FOOD", beforeId)}
                  onDropEnd={() => onDropInto("FOOD", undefined)}
                />

                <SectionBlock
                  title="Postres"
                  section="DESSERT"
                  items={desserts as any}
                  drag={drag}
                  drop={drop}
                  onAdd={() => openNewItem("DESSERT")}
                  onEdit={openEditItem}
                  onDelete={removeItem}
                  onDragStart={(itemId) => setDrag({ itemId, from: "DESSERT" })}
                  onDragEnd={() => { setDrag(null); setDrop(null); }}
                  onDragOver={(beforeId) => setDrop({ section: "DESSERT", beforeId })}
                  onDrop={(beforeId) => onDropInto("DESSERT", beforeId)}
                  onDropEnd={() => onDropInto("DESSERT", undefined)}
                />

                <SectionBlock
                  title="Altres"
                  section="OTHER"
                  items={other as any}
                  drag={drag}
                  drop={drop}
                  onAdd={() => openNewItem("OTHER")}
                  onEdit={openEditItem}
                  onDelete={removeItem}
                  onDragStart={(itemId) => setDrag({ itemId, from: "OTHER" })}
                  onDragEnd={() => { setDrag(null); setDrop(null); }}
                  onDragOver={(beforeId) => setDrop({ section: "OTHER", beforeId })}
                  onDrop={(beforeId) => onDropInto("OTHER", beforeId)}
                  onDropEnd={() => onDropInto("OTHER", undefined)}
                />
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
              <div className="dlg__title">{dlg.editing ? "Editar suggeriment" : "Afegir suggeriment"}</div>
              <button className="iconBtn" type="button" onClick={() => setDlg(null)} title="Tancar">✕</button>
            </div>

            <div className="dlg__body">
              <form className="dlg__p" onSubmit={(e) => { e.preventDefault(); saveItem(); }}>
                <div className="formGrid">
                  <label className="field">
                    <span>Nom de la suggerència</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </label>
                  <label className="field field--small">
                    <span>Preu (€)</span>
                    <input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
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
  title: string;
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
        props.onDragOver(undefined);
      }}
      onDrop={(e) => {
        e.preventDefault();
        props.onDropEnd();
      }}
    >
      <div className="menuSection__head">
        <div className="menuSection__headLeft">
          <div className="menuSection__title">{props.title}</div>
        </div>
        <div className="menuSection__headBtns">
          <button className="iconBtn" type="button" onClick={props.onAdd} title="Afegir suggeriment">+</button>
        </div>
      </div>

      <div className="menuSection__rule" />

      {props.items.length === 0 ? (
        <div className="menuEmpty">Sense suggeriments. Clica “+” per afegir-ne un.</div>
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
                  props.onDragOver(it.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  props.onDrop(it.id);
                }}
              >
                <span
                  className="dragHandle dragHandle--row"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    props.onDragStart(it.id);
                  }}
                  onDragEnd={props.onDragEnd}
                  title="Arrossega"
                >
                  ⠿
                </span>

                <button className="menuRow" type="button" onClick={() => props.onEdit(it)}>
                  <div className="menuRow__left">
                    <div className="menuRow__titleLine">
                      {/* CORRECCIÓN: Mostramos la primera traducción disponible */}
                      <span className="menuRow__title">{it.title.ca || it.title.es || "Sin título"}</span>
                      <span className="menuRow__leader" />
                      <span className="menuRow__price">{fmtEUR(it.price)}</span>
                    </div>
                  </div>
                </button>

                <button className="iconBtn iconBtn--danger" type="button" title="Borrar" onClick={(e) => {
                  e.stopPropagation();
                  props.onDelete(it.id);
                }}>
                  🗑
                </button>
              </div>
            );
          })}

          <div
            className="dropZone"
            onDragOver={(e) => {
              if (!props.drag) return;
              e.preventDefault();
              props.onDragOver(undefined);
            }}
            onDrop={(e) => {
              e.preventDefault();
              props.onDropEnd();
            }}
          />
        </div>
      )}
    </section>
  );
}

function secIds(
  sec: Section,
  from: Section,
  to: Section,
  fromIds: string[],
  toIds: string[],
  originalIds: string[],
  build: (sec: Section, ids: string[]) => Item[]
) {
  if (sec === to) return build(sec, toIds);
  if (sec === from) return build(sec, fromIds);
  return build(sec, originalIds);
}