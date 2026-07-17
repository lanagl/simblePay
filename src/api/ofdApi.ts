// OFD.ru Integration API v1.71 (28.01.2026)
// Base URL: https://ofd.ru/api/integration/v2/
// Auth: AuthToken query parameter (API key from lk.ofd.ru/settings/data-transfer/api/api-key)
// Rate limit: 1 request/second

import {OfdConfig} from "./posApi.ts";

export const OFD_BASE_URL = "https://ferma.ofd.ru";
export const OFD_DEMO_BASE_URL = "https://ferma-test.ofd.ru";
export const OFD_RECEIPT_VIEW_BASE = "https://ofd.ru/rec";

// ─── Standard response envelope ───────────────────────────────────────────────

export interface OfdResponse<T> {
    Status: "Success" | "Failed";
    Data: T;
    Errors?: string[];
    Elapsed: string;
}

// ─── Enums / value maps ───────────────────────────────────────────────────────

export type OperationType = "income" | "incomeReturn" | "outcome" | "outcomeReturn";
export type TagType = 3 | 31 | 4 | 41; // 3=receipt, 31=correction, 4=BSO, 41=BSO correction
export type TaxationType = 1 | 2 | 4 | 8 | 16 | 32;
export type NdsRate = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type SubjectType = number; // 1-33

export const NDS_RATE_LABELS: Record<NdsRate, string> = {
    1: "НДС 20%", 2: "НДС 10%", 3: "НДС 20/120",
    4: "НДС 10/110", 5: "НДС 0%", 6: "Без НДС",
    7: "НДС 5%", 8: "НДС 7%", 9: "НДС 5/105",
    10: "НДС 7/107", 11: "НДС 22%", 12: "НДС 22/122",
};

export const TAXATION_LABELS: Record<TaxationType, string> = {
    1: "ОСН", 2: "УСН Доход", 4: "УСН Д-Р", 8: "ЕНВД", 16: "ЕСХН", 32: "Патент",
};

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface KktInfo {
    Id: string;
    KktRegId: string;
    SerialNumber: string;
    FnNumber: string;
    KktModel: string;
    FnEndDate: string;
    LastDocOnKktDateTime: string;
    ContractStartDate: string;
    ContractEndDate: string;
}

export interface ZReport {
    Id: string;
    ShiftNumber: number;
    IncomeSumm: number;       // kopecks
    RefundIncomeSumm: number;
    Tax10Summ: number;
    Tax18Summ: number;
    Tax22Summ: number;
    TaxNaSumm: number;
    Open_DocDateTime: string;
    Close_DocDateTime: string;
    KktRnm?: string;
}

export interface ReceiptShort {
    Id: string;
    CDateUtc: string;
    Tag: TagType;
    IsBso: boolean;
    IsCorrection: boolean;
    OperationType: OperationType;
    TotalSumm: number;        // kopecks
    CashSumm: number;
    ECashSumm: number;
    Depth: number;
    Operator?: string;
    Operator_Inn?: string;
    DecimalFiscalSign?: string;
    KKT_MachineNumber?: string;
    FnsStatus?: "Success" | "Failed";
    Buyer_Inn?: string;
}

export interface ReceiptItem {
    Name: string;
    Price: number;            // kopecks
    Quantity: number;
    Total: number;            // kopecks
    CalculationMethod: number;
    SubjectType: SubjectType;
    NDS_Rate: NdsRate;
    ProductCode?: {
        Code_EAN_13?: string;
        Code_EAN_8?: string;
        Code_GS_1?: string;
        Code_GS_1M?: string;
        Code_KMK?: string;
        Code_MI?: string;
        [key: string]: string | undefined;
    };
}

export interface ReceiptDetail {
    Id: string;
    CDateUtc: string;
    OperationType: OperationType;
    TaxationType: TaxationType;
    Amount_Total: number;     // kopecks
    Amount_Cash: number;
    Amount_ECash: number;
    FiscalSign: string;
    Format_Version: number;
    Operator?: string;
    Operator_Inn?: string;
    Items: ReceiptItem[];
    KktRnm?: string;
    FnNumber?: string;
    DocNumber?: number;
}

export interface KktFolder {
    Id: string;
    Name: string;
    KktsCount: number;
}

export interface KktListItem {
    Id: string;
    KktRegId: string;
    RnmNumber: string;
    SerialNumber: string;
    FnNumber: string;
    KktModel: string;
    Address?: string;
    FnEndDate: string;
    ContractEndDate: string;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export class OfdApiError extends Error {
    status: number;
    errors: string[];

    constructor(message: string, status: number, errors: string[] = []) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

// ─── Config helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = "ofd_integration_config";


export function saveOfdConfig(cfg: OfdConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function get<T>(path: string, cfg: OfdConfig, extra?: Record<string, string>): Promise<T> {
    const params = new URLSearchParams({AuthToken: cfg.authToken, ...extra});
    const url = `${cfg.baseUrl}${path}?${params}`;

    const res = await fetch(url, {
        headers: {"Accept": "application/json"},
    });

    const body = await res.json() as OfdResponse<T>;

    if (!res.ok || body.Status === "Failed") {
        throw new OfdApiError(
            body.Errors?.[0] ?? `HTTP ${res.status}`,
            res.status,
            body.Errors ?? []
        );
    }

    return body.Data;
}

async function post<T>(path: string, cfg: OfdConfig, data: unknown): Promise<T> {
    const params = new URLSearchParams({AuthToken: cfg.authToken});
    const url = `${cfg.baseUrl}${path}?${params}`;

    const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json", "Accept": "application/json"},
        body: JSON.stringify(data),
    });

    const body = await res.json() as OfdResponse<T>;
    if (!res.ok || body.Status === "Failed") {
        throw new OfdApiError(body.Errors?.[0] ?? `HTTP ${res.status}`, res.status, body.Errors ?? []);
    }
    return body.Data;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const ofdApi = {
    // 2.1 — KKT info (by INN, optional filter by serial/reg number)
    getKkts(cfg: OfdConfig, params?: {
        FNSerialNumber?: string;
        KKTSerialNumber?: string;
        KKTRegNumber?: string
    }): Promise<KktInfo[]> {
        return get<KktInfo[]>(`/kkts`, cfg, params as Record<string, string>);
    },

    // 2.2 — Z-reports for single KKT (max 30-day range)
    getZReports(cfg: OfdConfig, kktRnm: string, dateFrom: string, dateTo: string): Promise<ZReport[]> {
        return get<ZReport[]>(`/kkt/${kktRnm}/zreports`, cfg, {dateFrom, dateTo});
    },

    // 2.3 — Z-reports for all KKTs
    getAllZReports(cfg: OfdConfig, dateFrom: string, dateTo: string): Promise<ZReport[]> {
        return get<ZReport[]>(`/zreports`, cfg, {dateFrom, dateTo});
    },

    // 2.4 — Registration reports
    getRegistrationReports(cfg: OfdConfig, rnm: string, beginDate: string, endDate: string, reportType: "RegReport" | "ReRegReport") {
        return post(`/kkt/registration/${rnm}/regReceipts`, cfg, {beginDate, endDate, reportType});
    },

    // 2.5 — Receipt list by period for a KKT (max 7 days)
    getReceiptsByPeriod(cfg: OfdConfig, kktRnm: string, dateFrom: string, dateTo: string): Promise<ReceiptShort[]> {
        return get<ReceiptShort[]>(`/kkt/${kktRnm}/receipts`, cfg, {dateFrom, dateTo});
    },

    // 2.6 — Receipt list by shift number
    getReceiptsByShift(cfg: OfdConfig, kktRnm: string, shiftNumber: number, fnNumber: string): Promise<ReceiptShort[]> {
        return get<ReceiptShort[]>(`/kkt/${kktRnm}/receipts`, cfg, {
            ShiftNumber: String(shiftNumber), FnNumber: fnNumber,
        });
    },

    // 2.7 — Receipt search by buyer (email/phone/inn) — max 30 days
    searchReceiptsByBuyer(cfg: OfdConfig, params: {
        dateFrom: string;
        dateTo: string;
        contact?: string;
        customerInn?: string
    }): Promise<ReceiptShort[]> {
        return get<ReceiptShort[]>(`/receipts/search`, cfg, params as Record<string, string>);
    },

    // 2.8 — Detailed receipt info by raw document ID
    getReceiptDetail(cfg: OfdConfig, kktRnm: string, rawId: string): Promise<ReceiptDetail> {
        return get<ReceiptDetail>(`/kkt/${kktRnm}/receipt/${rawId}`, cfg);
    },

    // 2.8 alt — Detailed receipt by shift + doc number
    getReceiptByShiftDoc(cfg: OfdConfig, kktRnm: string, shiftNumber: number, docShiftNumber: number): Promise<ReceiptDetail> {
        return get<ReceiptDetail>(`/kkt/${kktRnm}/zreport/${shiftNumber}/receipt/${docShiftNumber}`, cfg);
    },

    // 2.10 — Receipts with full detail (max 30 days)
    getReceiptsWithDetail(cfg: OfdConfig, kktRnm: string, dateFrom: string, dateTo: string): Promise<ReceiptShort[]> {
        return get<ReceiptShort[]>(`/kkt/${kktRnm}/receipts-with-fpd-short`, cfg, {dateFrom, dateTo});
    },

    // 2.10.1 — Receipts with marking codes
    getReceiptsWithMarkingCodes(cfg: OfdConfig, kktRnm: string, dateFrom: string, dateTo: string): Promise<ReceiptShort[]> {
        return get<ReceiptShort[]>(`kkt/${kktRnm}/receipts-info`, cfg, {dateFrom, dateTo});
    },

    // 3.1 — Folders list
    getFolders(cfg: OfdConfig): Promise<KktFolder[]> {
        return get<KktFolder[]>(`/folders`, cfg);
    },

    // 3.2 — KKT list
    getKktList(cfg: OfdConfig): Promise<KktListItem[]> {
        return get<KktListItem[]>(`/kkts-list`, cfg);
    },

    // 3.3 — All KKT addresses by token
    getAddresses(cfg: OfdConfig): Promise<unknown[]> {
        return get<unknown[]>("/addresses", cfg);
    },

    // URL для просмотра чека в браузере
    getReceiptViewUrl(inn: string, kktRnm: string, fnNumber: string, docNumber: number, fiscalSign: string): string {
        return `${OFD_RECEIPT_VIEW_BASE}/${inn}/${kktRnm}/${fnNumber}/${docNumber}/${fiscalSign}`;
    },
};

export default ofdApi;
