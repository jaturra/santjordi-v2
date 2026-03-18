export type LangText = { ca: string; es: string };

export type MenuPayload = {
  departments: Array<{
    id: string;
    title: LangText;
    order: number;
    items: Array<{
      id: string;
      departmentId: string;
      title: LangText;
      price: number;
      order: number;
      allergens: string[];
    }>;
  }>;
  supplementGroups: Array<{
    id: string;
    title: LangText;
    order: number;
    items: Array<{
      id: string;
      groupId: string;
      title: LangText;
      price: number;
      order: number;
      allergens: string[];
    }>;
  }>;
  allergens: Array<{
    id: string;
    code: string;
    label: LangText;
  }>;
};

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "sj_admin_token";

/* =========================
   Token helpers
========================= */
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return Boolean(getToken());
}

/* =========================
   Core request
========================= */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  // headers finales: primero Content-Type, luego Authorization (si hay token),
  // y al final lo que venga en init.headers por si quieres override
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Si init.headers es Headers | Record | Array, lo normalizamos
  if (init?.headers) {
    const h = new Headers(init.headers as any);
    h.forEach((v, k) => (headers[k] = v));
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      setToken(null);
    }

    let extra = "";
    try {
      const j = await res.json();
      extra = j?.error ? ` — ${j.error}` : "";
    } catch {}

    throw new Error(`${res.status} ${res.statusText}${extra}`);
  }

  // @ts-ignore
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

/* =========================
   Auth
========================= */
export const loginAdmin = (body: { username: string; password: string }) =>
  request<{ token: string }>("/auth/login", { method: "POST", body: JSON.stringify(body) });

export async function loginAndStore(body: { username: string; password: string }) {
  const { token } = await loginAdmin(body);
  setToken(token);
  return { token };
}

export const logoutAdmin = () => {
  setToken(null);
};

/* =========================
   Public
========================= */
export const getMenu = () => request<MenuPayload>("/menu");



/* =========================
   Public - Sugerencias
========================= */
export async function getPublicSuggestionsCurrent() {
  // Petición a la ruta que NO tiene /admin/ en el backend
  const res = await fetch(`${import.meta.env.VITE_API_URL}/suggestions/current`);
  
  if (!res.ok) {
    throw new Error("Error obteniendo suggerències públiques");
  }
  return res.json();
}


/* =========================
   Departments
========================= */
export const createDepartment = (body: { title: LangText; order: number }) =>
  request<{ id: string }>("/admin/departments", { method: "POST", body: JSON.stringify(body) });

export const updateDepartment = (id: string, body: Partial<{ title: LangText; order: number }>) =>
  request<{ ok: true }>(`/admin/departments/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteDepartment = (id: string) =>
  request<{ ok: true }>(`/admin/departments/${id}`, { method: "DELETE" });

export const reorderDepartments = (ids: string[]) =>
  request<{ ok: true }>(`/admin/reorder/departments`, { method: "POST", body: JSON.stringify({ ids }) });

/* =========================
   Items
========================= */
export const createItem = (body: {
  departmentId: string;
  title: LangText;
  price: number;
  allergens: string[];
  order: number;
}) => request<{ id: string }>(`/admin/items`, { method: "POST", body: JSON.stringify(body) });

export const updateItem = (
  id: string,
  body: Partial<{
    departmentId: string;
    title: LangText;
    price: number;
    allergens: string[];
    order: number;
  }>
) => request<{ ok: true }>(`/admin/items/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteItem = (id: string) => request<{ ok: true }>(`/admin/items/${id}`, { method: "DELETE" });

export const reorderItems = (departmentId: string, ids: string[]) =>
  request<{ ok: true }>(`/admin/reorder/items/${departmentId}`, { method: "POST", body: JSON.stringify({ ids }) });

/* =========================
   Supplement groups
========================= */
export const createSupplementGroup = (body: { title: LangText; order: number }) =>
  request<{ id: string }>(`/admin/supplement-groups`, { method: "POST", body: JSON.stringify(body) });

export const updateSupplementGroup = (id: string, body: Partial<{ title: LangText; order: number }>) =>
  request<{ ok: true }>(`/admin/supplement-groups/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteSupplementGroup = (id: string) =>
  request<{ ok: true }>(`/admin/supplement-groups/${id}`, { method: "DELETE" });

/* =========================
   Supplement items
========================= */
export const createSupplementItem = (body: {
  groupId: string;
  title: LangText;
  price: number;
  allergens: string[];
  order: number;
}) => request<{ id: string }>(`/admin/supplement-items`, { method: "POST", body: JSON.stringify(body) });

export const updateSupplementItem = (
  id: string,
  body: Partial<{
    groupId: string;
    title: LangText;
    price: number;
    allergens: string[];
    order: number;
  }>
) => request<{ ok: true }>(`/admin/supplement-items/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteSupplementItem = (id: string) =>
  request<{ ok: true }>(`/admin/supplement-items/${id}`, { method: "DELETE" });

export const reorderSupplementItems = (groupId: string, ids: string[]) =>
  request<{ ok: true }>(`/admin/reorder/supplement-items/${groupId}`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });

/* =========================
   Allergens
========================= */
export const createAllergen = (body: { code: string; label: LangText }) =>
  request<{ id: string }>(`/admin/allergens`, { method: "POST", body: JSON.stringify(body) });

export const deleteAllergen = (id: string) => request<{ ok: true }>(`/admin/allergens/${id}`, { method: "DELETE" });

/* =========================
   Suggestions (public)
========================= */
export type SuggestionsPayload = {
  sheet: null | {
    id: string;
    dateFrom: string;
    dateTo: string;
    sections: {
      food: Array<{ id: string; title: LangText; price: number; order: number }>;
      desserts: Array<{ id: string; title: LangText; price: number; order: number }>;
      other: Array<{ id: string; title: LangText; price: number; order: number }>;
    };
  };
};

export const getSuggestionsCurrent = () => request<SuggestionsPayload>("/suggestions/current");

/* =========================
   Suggestions (admin)
========================= */
export type SuggestionSection = "FOOD" | "DESSERT" | "OTHER";

export type AdminSuggestionsCurrent = {
  sheet: null | {
    id: string;
    dateFrom: string;
    dateTo: string;
    isActive: boolean;
    sections: {
      food: Array<{ id: string; section: SuggestionSection; title: LangText; price: number; order: number }>;
      desserts: Array<{ id: string; section: SuggestionSection; title: LangText; price: number; order: number }>;
      other: Array<{ id: string; section: SuggestionSection; title: LangText; price: number; order: number }>;
    };
  };
};

export const getAdminSuggestionsCurrent = () => request<AdminSuggestionsCurrent>("/admin/suggestions/current");

export const createSuggestionSheet = (body: { dateFrom: string; dateTo: string; isActive?: boolean }) =>
  request<{ id: string }>("/admin/suggestions/sheets", { method: "POST", body: JSON.stringify(body) });

export const updateSuggestionSheet = (
  id: string,
  body: Partial<{ dateFrom: string; dateTo: string; isActive: boolean }>
) => request<{ ok: true }>(`/admin/suggestions/sheets/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteSuggestionSheet = (id: string) =>
  request<{ ok: true }>(`/admin/suggestions/sheets/${id}`, { method: "DELETE" });

export const createSuggestionItem = (body: {
  sheetId: string;
  section: SuggestionSection;
  title: LangText;
  price: number;
  order?: number;
}) => request<{ id: string }>(`/admin/suggestions/items`, { method: "POST", body: JSON.stringify(body) });

export const updateSuggestionItem = (
  id: string,
  body: Partial<{ section: SuggestionSection; title: LangText; price: number; order: number }>
) => request<{ ok: true }>(`/admin/suggestions/items/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteSuggestionItem = (id: string) =>
  request<{ ok: true }>(`/admin/suggestions/items/${id}`, { method: "DELETE" });

export const reorderSuggestionItems = (sheetId: string, section: SuggestionSection, ids: string[]) =>
  request<{ ok: true }>(`/admin/suggestions/reorder/${sheetId}/${section}`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
