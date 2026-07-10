// REST API client for the MySQL-backed backend

const DEFAULT_BASE_URL = "http://localhost:3000/api";
const STORAGE_KEY = "pos_api_config";

export interface ApiConfig {
  baseUrl: string;
}

function getConfig(): ApiConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { baseUrl: DEFAULT_BASE_URL };
}

export function saveApiConfig(cfg: ApiConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function loadApiConfig(): ApiConfig {
  return getConfig();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    username: string;
    role: "cashier" | "admin" | "manager";
  };
}

export interface ApiProduct {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category: string;
  barcode: string;
  is_marked: boolean; // MySQL snake_case
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null
): Promise<T> {
  const { baseUrl } = getConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errBody: unknown;
    try { errBody = await res.json(); } catch { errBody = await res.text(); }
    const msg =
      typeof errBody === "object" && errBody !== null && "message" in errBody
        ? String((errBody as { message: string }).message)
        : `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, errBody);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const posApi = {
  /** POST /auth/login → {token, user} */
  login(username: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("POST", "/auth/login", { username, password });
  },

  /** POST /auth/logout (invalidate token server-side) */
  logout(token: string): Promise<void> {
    return request<void>("POST", "/auth/logout", {}, token);
  },

  /** GET /auth/me — validate stored token & get current user */
  me(token: string): Promise<LoginResponse["user"]> {
    return request<LoginResponse["user"]>("GET", "/auth/me", undefined, token);
  },

  // ─── Products ─────────────────────────────────────────────────────────────

  /** GET /products */
  getProducts(token: string): Promise<ApiProduct[]> {
    return request<ApiProduct[]>("GET", "/products", undefined, token);
  },

  /** POST /products */
  createProduct(token: string, p: Omit<ApiProduct, "id">): Promise<ApiProduct> {
    return request<ApiProduct>("POST", "/products", p, token);
  },

  /** PUT /products/:id */
  updateProduct(token: string, id: number, p: Partial<Omit<ApiProduct, "id">>): Promise<ApiProduct> {
    return request<ApiProduct>("PUT", `/products/${id}`, p, token);
  },

  /** DELETE /products/:id */
  deleteProduct(token: string, id: number): Promise<void> {
    return request<void>("DELETE", `/products/${id}`, undefined, token);
  },
};

export default posApi;
