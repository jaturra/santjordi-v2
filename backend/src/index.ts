import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./db";
import { requireAdmin, signAdminToken } from "./auth";

const app = express();

// ==========================================
// 1. CONFIGURACIÓN DE SEGURIDAD Y CORS
// ==========================================
const allowedOrigins = [
  "http://localhost:5173", // Vite local
  "http://localhost:3000", // Backend local
  "https://barsantjordi.es",      // <--- TU WEB 
  "https://www.barsantjordi.es",  // <--- TU WEB CON WWW
  process.env.FRONTEND_URL, 
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Bloqueado por CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Log de peticiones para ver el tráfico en Coolify
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Endpoint básico para comprobar que el servidor está vivo
app.get("/health", (_req, res) => res.json({ ok: true }));


// ==========================================
// 2. AUTENTICACIÓN (LOGIN)
// ==========================================
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


// ==========================================
// 3. RUTAS PÚBLICAS (LA CARTA DEL RESTAURANTE)
// ==========================================
app.get("/menu", async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { order: "asc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { allergens: true }, 
      },
    },
  });

  const supplementGroups = await prisma.supplementGroup.findMany({
    orderBy: { order: "asc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { allergens: true },
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

// Endpoint para obtener las sugerencias activas actuales (¡NUEVO!)
app.get("/suggestions/current", async (_req, res) => {
  try {
    // 1. Buscamos la hoja activa actual
    const now = new Date();
    const sheet = await prisma.suggestionSheet.findFirst({
      where: {
        isActive: true,
        dateFrom: { lte: now },
        dateTo: { gte: now },
      },
      orderBy: { dateFrom: "desc" },
    });

    if (!sheet) {
      return res.json({ sheet: null });
    }

    // 2. Buscamos sus items ordenados
    const items = await prisma.suggestionItem.findMany({
      where: { sheetId: sheet.id },
      orderBy: { order: "asc" },
    });

    // 3. Agrupamos por sección
    const food = items.filter((x: any) => x.section === "FOOD");
    const desserts = items.filter((x: any) => x.section === "DESSERT");
    const other = items.filter((x: any) => x.section === "OTHER");

    res.json({
      sheet: {
        id: sheet.id,
        dateFrom: sheet.dateFrom,
        dateTo: sheet.dateTo,
        sections: { food, desserts, other },
      },
    });
  } catch (e) {
    console.error("Error fetching public suggestions:", e);
    res.status(500).json({ error: "server_error" });
  }
});
// ==========================================
// 4. ADMINISTRACIÓN: DEPARTAMENTOS Y PLATOS
// ==========================================
app.post("/admin/departments", requireAdmin, async (req, res) => {
  const { title, order } = req.body ?? {};
  if (!title || typeof title !== "object") return res.status(400).json({ error: "title_required" });

  const created = await prisma.department.create({
    data: { title, order: typeof order === "number" ? order : 0 },
  });
  res.json({ id: created.id });
});

app.patch("/admin/departments/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const { title, order } = req.body ?? {};
  await prisma.department.update({
    where: { id },
    data: { ...(title !== undefined ? { title } : {}), ...(order !== undefined ? { order } : {}) },
  });
  res.json({ ok: true });
});

app.delete("/admin/departments/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  await prisma.department.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/admin/reorder/departments", requireAdmin, async (req, res) => {
  const { ids } = req.body ?? {};
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids_invalid" });

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.department.update({ where: { id }, data: { order: index } })
    )
  );
  res.json({ ok: true });
});

app.post("/admin/items", requireAdmin, async (req, res) => {
  const { departmentId, title, price, allergens, order } = req.body ?? {};
  if (!departmentId) return res.status(400).json({ error: "departmentId_required" });

  const allergenIds: string[] = Array.isArray(allergens) ? allergens.filter((x) => typeof x === "string") : [];
  const created = await prisma.item.create({
    data: {
      departmentId, title, price,
      order: typeof order === "number" ? order : 0,
      allergens: { create: allergenIds.map((allergenId) => ({ allergenId })) },
    },
  });
  res.json({ id: created.id });
});

app.patch("/admin/items/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const { departmentId, title, price, allergens, order } = req.body ?? {};

  const data: any = { departmentId, title, price, order };
  if (allergens !== undefined) {
    const allergenIds: string[] = Array.isArray(allergens) ? allergens.filter((x) => typeof x === "string") : [];
    data.allergens = {
      deleteMany: {}, 
      create: allergenIds.map((allergenId) => ({ allergenId })),
    };
  }

  // Limpiamos undefined
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

  await prisma.item.update({ where: { id }, data });
  res.json({ ok: true });
});

app.delete("/admin/items/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  await prisma.item.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/admin/reorder/items/:departmentId", requireAdmin, async (req, res) => {
  const departmentId = req.params.departmentId as string;
  const { ids } = req.body ?? {};
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids_invalid" });

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.item.update({ where: { id }, data: { order: index, departmentId } })
    )
  );
  res.json({ ok: true });
});


// ==========================================
// 5. ADMINISTRACIÓN: SUPLEMENTOS Y ALÉRGENOS
// ==========================================
app.post("/admin/supplement-groups", requireAdmin, async (req, res) => {
  const { title, order } = req.body ?? {};
  const created = await prisma.supplementGroup.create({
    data: { title, order: typeof order === "number" ? order : 0 },
  });
  res.json({ id: created.id });
});

app.patch("/admin/supplement-groups/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const { title, order } = req.body ?? {};
  await prisma.supplementGroup.update({
    where: { id },
    data: { ...(title !== undefined ? { title } : {}), ...(order !== undefined ? { order } : {}) },
  });
  res.json({ ok: true });
});

app.delete("/admin/supplement-groups/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  await prisma.supplementGroup.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/admin/supplement-items", requireAdmin, async (req, res) => {
  const { groupId, title, price, allergens, order } = req.body ?? {};
  const allergenIds: string[] = Array.isArray(allergens) ? allergens.filter((x) => typeof x === "string") : [];
  
  const created = await prisma.supplementItem.create({
    data: {
      groupId, title, price,
      order: typeof order === "number" ? order : 0,
      allergens: { create: allergenIds.map((allergenId) => ({ allergenId })) },
    },
  });
  res.json({ id: created.id });
});

app.patch("/admin/supplement-items/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const { groupId, title, price, allergens, order } = req.body ?? {};
  const data: any = { groupId, title, price, order };
  
  if (allergens !== undefined) {
    const allergenIds: string[] = Array.isArray(allergens) ? allergens.filter((x) => typeof x === "string") : [];
    data.allergens = { deleteMany: {}, create: allergenIds.map((allergenId) => ({ allergenId })) };
  }
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

  await prisma.supplementItem.update({ where: { id }, data });
  res.json({ ok: true });
});

app.delete("/admin/supplement-items/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  await prisma.supplementItem.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/admin/reorder/supplement-items/:groupId", requireAdmin, async (req, res) => {
  const groupId = req.params.groupId as string;
  const { ids } = req.body ?? {};
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids_invalid" });

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.supplementItem.update({ where: { id }, data: { order: index, groupId } })
    )
  );
  res.json({ ok: true });
});

app.post("/admin/allergens", requireAdmin, async (req, res) => {
  const { code, label } = req.body ?? {};
  const created = await prisma.allergen.create({
    data: { code: code.trim().toUpperCase(), label },
    select: { id: true },
  });
  res.json({ id: created.id });
});

app.delete("/admin/allergens/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  await prisma.allergen.delete({ where: { id } });
  res.json({ ok: true });
});


// ==========================================
// 6. ADMINISTRACIÓN: SUGERENCIAS (¡NUEVO!)
// ==========================================
app.get("/admin/suggestions/current", requireAdmin, async (_req, res) => {
  try {
    // Buscamos la hoja más reciente ordenando por fecha de inicio
    const sheet = await prisma.suggestionSheet.findFirst({
      orderBy: { dateFrom: "desc" }
    });

    if (!sheet) return res.json({ sheet: null });

    // Buscamos los items de esta hoja por separado para evitar errores TS
    const items = await prisma.suggestionItem.findMany({
      where: { sheetId: sheet.id },
      orderBy: { order: "asc" }
    });

    const food = items.filter((x: any) => x.section === "FOOD");
    const desserts = items.filter((x: any) => x.section === "DESSERT");
    const other = items.filter((x: any) => x.section === "OTHER");

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
  const id = req.params.id as string;
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
      sheetId, 
      section: section as any, // Magia para TypeScript
      title, 
      price: Number(price) || 0,
      order: order || 0,
    },
  });
  res.json({ id: created.id });
});

app.patch("/admin/suggestions/items/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
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
  const id = req.params.id as string;
  await prisma.suggestionItem.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/admin/reorder/suggestions/:sheetId/:section", requireAdmin, async (req, res) => {
  const section = req.params.section as string;
  
  // EL TRUCO MAGISTRAL: Acepta tanto si el frontend envía { ids: [...] } como si envía directamente [...]
  const ids = Array.isArray(req.body) ? req.body : req.body?.ids;

  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids_invalid" });

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.suggestionItem.update({
        where: { id },
        data: { order: index, section: section as any }, // Magia para TypeScript
      })
    )
  );
  res.json({ ok: true });
});

// ==========================================
// 7. ARRANQUE DEL SERVIDOR
// ==========================================
app.get("/admin/ping", requireAdmin, (_req, res) => res.json({ ok: true }));
app.get("/api/ping", (_req, res) => res.json({ pong: true, ts: Date.now() }));

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
});