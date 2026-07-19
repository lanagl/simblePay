// WFM API client — https://wfm.utitel.ru/api

import {LoginResponse} from "./posApi.ts";
import {TaxationSystem, VatType} from "./fermaApi.ts";

const WFM_BASE_URL = "https://wfm.utitel.ru/api";

export interface WfmCondition {
    field: string;
    operator: string;
    value: unknown;
}

export interface WfmQuery {
    logic: "And" | "Or";
    conditions: WfmCondition[];
}

// Empty conditions = no filter = all records
export const ALL_RECORDS: WfmQuery = {logic: "And", conditions: []};

// ─── Entity shapes ────────────────────────────────────────────────────────────

export interface WfmProduct {
    id: number;
    name: string;
    price: number;
    emoji?: string;
    category?: number;
    barcode?: string;
    is_marked?: boolean;
}

export interface WfmCategory {
    id: number;
    name: string;
    code: string;
}

export interface WfmOfdConfig {
    id: number;
    name: string;
    login: string;
    password: string;
    inn: string;
    cashierName: string;
    baseUrl: string;
    taxationSystem: TaxationSystem;
    vatType: VatType;
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

export class WfmApiError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

async function request<T>(method: string, path: string, body?: unknown, token?: string | null): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Basic ${token}`;
    }
    const res = await fetch(`${WFM_BASE_URL}/${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        let errBody: unknown;
        try {
            errBody = await res.json();
        } catch {
            errBody = await res.text();
        }
        throw new WfmApiError(`WFM ${res.status}: ${path}`, res.status, errBody);
    }
    const text = await res.text();
    if (!text) return [] as T;
    return JSON.parse(text) as T;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const wfmApi = {
    login(username: string, password: string): Promise<LoginResponse> {
        const token = btoa(`${username}:${password}`);
        return request<LoginResponse>("POST", "Entity/Kassa/data", undefined, token);
    },
    /** POST Entity/Kassa/data */
    getProducts(token: string, q?: WfmQuery): Promise<WfmProduct[]> {
        if (!q) {
            const q = ALL_RECORDS;
        }
        return request<WfmProduct[]>("POST", "Entity/Kassa/data", q, token);
    },

    /** POST Entity/KassaCategory/data */
    getCategories(token: string, q?: WfmQuery): Promise<WfmCategory[]> {
        if (!q) {
            const q = ALL_RECORDS;
        }
        return request<WfmCategory[]>("POST", "Entity/KassaCategory/data", q, token);
    },

    /** POST Entity/OfdConfig/data — Ferma® credentials stored on server */
    getOfdSettings(token: string): Promise<WfmOfdConfig[]> {
        return request<WfmOfdConfig[]>("POST", "Entity/KassaSettings/data", undefined, token);
    },
};

export default wfmApi;
