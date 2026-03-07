import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./db";
import { requireAdmin, signAdminToken } from "./auth";

const app = express();

// --- CONFIGURACIÓN CORS MEJORADA ---
// Lista de dominios permitidos
const allowedOrigins = [
  "http://localhost:5173", // Vite local
  "http://localhost:3000", // Backend local (por si acaso)
  process.env.FRONTEND_URL, // <--- ¡IMPORTANTE! Define esto en Coolify (ej: https://tudominio.com)
  // "https://mi-bar-web.com" // Puedes poner tu dominio "a fuego" aquí si prefieres
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como Postman o curl) o si el origen está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Bloqueado por CORS: ${origin}`); // Esto saldrá en los logs de Coolify si falla
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Permite envío de headers seguros
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
// -----------------------------------

app.use(express.json());

// Log de peticiones (muy útil en producción)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- FUNCIONES UTILITARIAS ---
function asISO(d: Date) {
  return d.toISOString();
}

function assertSuggestionSection(x: any): x is "FOOD" | "DESSERT" | "OTHER" {
  return x === "FOOD" || x === "DESSERT" || x === "OTHER";
}

// --- ENDPOINTS DE AUTENTICACIÓN ---
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: "missing_credentials" });
  }

  const u = process.env.ADMIN_USER;
  const p = process.env.ADMIN_PASS;

  if (!u || !p) return res.status(500).json({ error: "admin_env_missing" });

  if (username !== u || password !== p) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = signAdminToken({ username });
  return res.json({ token });
});

// --- ENDPOINTS DE DEPARTAMENTOS ---
app.post("/admin/departments", requireAdmin, async (req, res) => {
  const { title, order } = req.body ?? {};

  if (!title || typeof title !== "object") {
    return res.status(400).json({ error: "title_required" });
  }

  const created = await prisma.department.create({
    data: {
      title,
      order: typeof order === "number" ? order : 0,
    },
  });

  res.json({ id: created.id });
});

app.patch("/admin/departments/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, order } = req.body ?? {};

  await prisma.department.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });

  res.json({ ok: true });
});

app.delete("/admin/departments/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await prisma.department.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/admin/reorder/departments", requireAdmin, async (req, res) => {
  const { ids } = req.body ?? {};

  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return res.status(400).json({ error: "ids_invalid" });
  }

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.department.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  res.json({ ok: true });
});

// --- ENDPOINTS DE ITEMS ---
app.post("/admin/items", requireAdmin, async (req, res) => {
  const { departmentId, title, price, allergens, order } = req.body ?? {};

  if (!departmentId || typeof departmentId !== "string") {
    return res.status(400).json({ error: "departmentId_required" });
  }
  if (!title || typeof title !== "object") {
    return res.status(400).json({ error: "title_required" });
  }
  if (typeof price !== "number") {
    return res.status(400).json({ error: "price_required" });
  }

  const allergenIds: string[] = Array.isArray(allergens)
    ? allergens.filter((x) => typeof x === "string")
    : [];

  const created = await prisma.item.create({
    data: {
      departmentId,
      title,
      price, // Prisma Decimal acepta number
      order: typeof order === "number" ? order : 0,
      allergens: {
        create: allergenIds.map((allergenId) => ({ allergenId })),
      },
    },
  });

  res.json({ id: created.id });
});

app.patch("/admin/items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { departmentId, title, price, allergens, order } = req.body ?? {};

  const data: any = {};
  if (departmentId !== undefined) data.departmentId = departmentId;
  if (title !== undefined) data.title = title;
  if (price !== undefined) data.price = price;
  if (order !== undefined) data.order = order;

  if (allergens !== undefined) {
    const allergenIds: string[] = Array.isArray(allergens)
      ? allergens.filter((x) => typeof x === "string")
      : [];

    data.allergens = {
      deleteMany: {}, // borra todos los ItemAllergen actuales del item
      create: allergenIds.map((allergenId) => ({ allergenId })),
    };
  }

  await prisma.item.update({
    where: { id },
    data,
  });

  res.json({ ok: true });
});

app.delete("/admin/items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await prisma.item.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/admin/reorder/items/:departmentId", requireAdmin, async (req, res) => {
  const { departmentId } = req.params;
  const { ids } = req.body ?? {};

  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return res.status(400).json({ error: "ids_invalid" });
  }

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.item.update({
        where: { id },
        data: { order: index, departmentId },
      })
    )
  );

  res.json({ ok: true });
});

// --- ADMIN PING ---
app.get("/admin/ping", requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

// --- MENU PÚBLICO (MOCKED / REAL) ---
app.get("/menu", async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { order: "asc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { allergens: true }, // ItemAllergen[]
      },
    },
  });

  const supplementGroups = await prisma.supplementGroup.findMany({
    orderBy: { order: "asc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { allergens: true }, // SupplementItemAllergen[]
      },
    },
  });

  const allergens = await prisma.allergen.findMany({ orderBy: { code: "asc" } });

  res.json({
    departments: departments.map((d: any) => ({
      id: d.id,
      title: d.title,
      order: d.order,
      items: d.items.map((it: any) => ({
        id: it.id,
        departmentId: it.departmentId,
        title: it.title,
        price: Number(it.price),
        order: it.order,
        allergens: it.allergens.map((x: any) => x.allergenId),
      })),
    })),

    supplementGroups: supplementGroups.map((g: any) => ({
      id: g.id,
      title: g.title,
      order: g.order,
      items: g.items.map((si: any) => ({
        id: si.id,
        groupId: si.groupId,
        title: si.title,
        price: Number(si.price),
        order: si.order,
        allergens: si.allergens.map((x: any) => x.allergenId),
      })),
    })),

    allergens: allergens.map((a: any) => ({
      id: a.id,
      code: a.code,
      label: a.label,
    })),
  });
});

// --- ENDPOINTS DE SUPLEMENTOS ---
app.post("/admin/supplement-groups", requireAdmin, async (req, res) => {
  const { title, order } = req.body ?? {};

  if (!title || typeof title !== "object") {
    return res.status(400).json({ error: "title_required" });
  }

  const created = await prisma.supplementGroup.create({
    data: {
      title,
      order: typeof order === "number" ? order : 0,
    },
  });

  res.json({ id: created.id });
});

app.patch("/admin/supplement-groups/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, order } = req.body ?? {};

  try {
    await prisma.supplementGroup.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(order !== undefined ? { order } : {}),
      },
    });

    res.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "not_found" });
    console.error("update supplement-group failed:", e);
    return res.status(500).json({ error: "update_failed" });
  }
});

app.delete("/admin/supplement-groups/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.supplementGroup.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "not_found" });
    console.error("delete supplement-group failed:", e);
    return res.status(500).json({ error: "delete_failed" });
  }
});

app.post("/admin/supplement-items", requireAdmin, async (req, res) => {
  const { groupId, title, price, allergens, order } = req.body ?? {};

  if (!groupId || typeof groupId !== "string") {
    return res.status(400).json({ error: "groupId_required" });
  }
  if (!title || typeof title !== "object") {
    return res.status(400).json({ error: "title_required" });
  }
  if (typeof price !== "number") {
    return res.status(400).json({ error: "price_required" });
  }

  const allergenIds: string[] = Array.isArray(allergens)
    ? allergens.filter((x) => typeof x === "string")
    : [];

  const created = await prisma.supplementItem.create({
    data: {
      groupId,
      title,
      price,
      order: typeof order === "number" ? order : 0,
      allergens: {
        create: allergenIds.map((allergenId) => ({ allergenId })),
      },
    },
  });

  res.json({ id: created.id });
});

app.patch("/admin/supplement-items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { groupId, title, price, allergens, order } = req.body ?? {};

  const data: any = {};
  if (groupId !== undefined) data.groupId = groupId;
  if (title !== undefined) data.title = title;
  if (price !== undefined) data.price = price;
  if (order !== undefined) data.order = order;

  if (allergens !== undefined) {
    const allergenIds: string[] = Array.isArray(allergens)
      ? allergens.filter((x) => typeof x === "string")
      : [];

    data.allergens = {
      deleteMany: {},
      create: allergenIds.map((allergenId) => ({ allergenId })),
    };
  }

  try {
    await prisma.supplementItem.update({
      where: { id },
      data,
    });

    res.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "not_found" });
    console.error("update supplement-item failed:", e);
    return res.status(500).json({ error: "update_failed" });
  }
});

app.delete("/admin/supplement-items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.supplementItem.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "not_found" });
    console.error("delete supplement-item failed:", e);
    return res.status(500).json({ error: "delete_failed" });
  }
});

app.post("/admin/reorder/supplement-items/:groupId", requireAdmin, async (req, res) => {
  const { groupId } = req.params;
  const { ids } = req.body ?? {};

  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return res.status(400).json({ error: "ids_invalid" });
  }

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.supplementItem.update({
        where: { id },
        data: { order: index, groupId },
      })
    )
  );

  res.json({ ok: true });
});

// --- ENDPOINTS DE ALÉRGENOS ---
app.post("/admin/allergens", requireAdmin, async (req, res) => {
  try {
    const { code, label } = req.body ?? {};

    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "code_required" });
    }
    if (typeof label !== "object" || label === null) {
      return res.status(400).json({ error: "label_required" });
    }

    const created = await prisma.allergen.create({
      data: { code: code.trim().toUpperCase(), label },
      select: { id: true },
    });

    return res.json({ id: created.id });
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ error: "code_exists" });
    console.error("POST /admin/allergens failed:", e);
    return res.status(500).json({ error: "create_failed" });
  }
});

app.delete("/admin/allergens/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // 1) existe?
    const exists = await prisma.allergen.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return res.status(404).json({ error: "not_found" });

    // 2) está en uso?
    const [usedInItems, usedInSupps] = await prisma.$transaction([
      prisma.itemAllergen.count({ where: { allergenId: id } }),
      prisma.supplementItemAllergen.count({ where: { allergenId: id } }),
    ]);

    if (usedInItems > 0 || usedInSupps > 0) {
      return res.status(409).json({
        error: "allergen_in_use",
        usedIn: { items: usedInItems, supplements: usedInSupps },
      });
    }

    // 3) borrar
    await prisma.allergen.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /admin/allergens/:id failed:", e);
    return res.status(500).json({ error: "delete_failed" });
  }
});

app.get("/api/ping", (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

// --- ENDPOINTS DE SUGERENCIAS ---
app.get("/admin/suggestions/current", requireAdmin, async (_req, res) => {
  try {
    const sheet = await prisma.suggestionSheet.findFirst({
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { order: "asc" } } },
    });

    if (!sheet) return res.json({ sheet: null });

    const food = sheet.items.filter((x: any) => x.section === "FOOD");
    const desserts = sheet.items.filter((x: any) => x.section === "DESSERT");
    const other = sheet.items.filter((x: any) => x.section === "OTHER");

    res.json({ sheet: { ...sheet, sections: { food, desserts, other } } });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/admin/suggestions/sheets", requireAdmin, async (req, res) => {
  const { dateFrom, dateTo, isActive } = req.body ?? {};
  const created = await prisma.suggestionSheet.create({
    data: {
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      isActive: isActive ?? true,
    },
  });
  res.json({ id: created.id });
});

app.patch("/admin/suggestions/sheets/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { dateFrom, dateTo } = req.body ?? {};
  await prisma.suggestionSheet.update({
    where: { id },
    data: {
      ...(dateFrom ? { dateFrom: new Date(dateFrom) } : {}),
      ...(dateTo ? { dateTo: new Date(dateTo) } : {}),
    },
  });
  res.json({ ok: true });
});

app.post("/admin/suggestions/items", requireAdmin, async (req, res) => {
  const { sheetId, section, title, price, order } = req.body ?? {};
  const created = await prisma.suggestionItem.create({
    data: {
      sheetId, section, title, 
      price: Number(price) || 0,
      order: order || 0,
    },
  });
  res.json({ id: created.id });
});

app.patch("/admin/suggestions/items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, price } = req.body ?? {};
  await prisma.suggestionItem.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
    },
  });
  res.json({ ok: true });
});

app.delete("/admin/suggestions/items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await prisma.suggestionItem.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/admin/reorder/suggestions/:sheetId/:section", requireAdmin, async (req, res) => {
  const { section } = req.params;
  const { ids } = req.body ?? {};

  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids_invalid" });

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.suggestionItem.update({
        where: { id },
        data: { order: index, section },
      })
    )
  );
  res.json({ ok: true });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
});