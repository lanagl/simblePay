// Ferma® OFD API v2.83 — HTTP client

let FERMA_BASE_URL = "https://ferma-test.ofd.ru"; // switch to ferma.ofd.ru for production

export type VatType = "None" | "Vat0" | "Vat10" | "Vat20" | "Vat10110" | "Vat20120";
export type MeasureType =
    "PIECE"
    | "GRAM"
    | "KILOGRAM"
    | "TON"
    | "CENTIMETER"
    | "DECIMETER"
    | "METER"
    | "SQUARE_CENTIMETER"
    | "SQUARE_DECIMETER"
    | "SQUARE_METER"
    | "MILLILITER"
    | "LITER"
    | "CUBIC_METER"
    | "KILOWATT_HOUR"
    | "GIGACALORIE"
    | "DAY"
    | "HOUR"
    | "MINUTE"
    | "SECOND"
    | "KILOBYTE"
    | "MEGABYTE"
    | "GIGABYTE"
    | "TERABYTE"
    | "OTHER";
export type TaxationSystem =
    "Common"
    | "SimplifiedIncome"
    | "SimplifiedIncomeOutcome"
    | "UnifiedAgricultural"
    | "Patent";
export type ReceiptType = "Income" | "IncomeReturn" | "Outcome" | "OutcomeReturn";
export type PaymentMethodType = 1 | 2 | 3; // 1=cash, 2=card, 3=prepayment
export type ReceiptStatus = 0 | 1 | 2 | 3; // NEW, PROCESSED, CONFIRMED, KKT_ERROR

export interface AuthRequest {
    Login: string;
    Password: string;
}

export interface AuthResponse {
    AuthToken: string;
    ExpirationDateUtc: string;
}

export interface MarkingCodeData {
    Type: "UNKNOWN_PRODUCT_CODE" | "EAN_8" | "EAN_13" | "ITF_14" | "GS_10" | "GS_1M" | "SHORT" | "FUR_GOODS" | "EGAIS_20" | "EGAIS_30" | "F_1" | "F_2" | "F_3" | "F_4" | "F_5" | "F_6";
    Code: string;
    PlannedStatus: "PIECE_PRODUCT_INCOME" | "BULK_PRODUCT_INCOME" | "VOLUME_PRODUCT_INCOME" | "PIECE_PRODUCT_OUTCOME" | "PIECE_RETURN";
}

export interface ReceiptItem {
    Label: string;
    Price: number;
    Quantity: number;
    Amount: number;
    Vat: VatType;
    Measure: MeasureType;
    PaymentMethod: number; // 4 = full payment
    MarkingCodeData?: MarkingCodeData;
}

export interface PaymentItem {
    PaymentType: number; // 0=cash, 1=card
    Sum: number;
}

export interface CustomerReceipt {
    TaxationSystem: TaxationSystem;
    Email?: string;
    Phone?: string;
    PaymentType?: PaymentMethodType;
    Items: ReceiptItem[];
    PaymentItems: PaymentItem[];
}

export interface ReceiptRequest {
    Inn: string;
    Type: ReceiptType;
    InvoiceId: string;
    CustomerReceipt: CustomerReceipt;
    Cashier?: { Name: string; INN?: string };
}

export interface ReceiptResponse {
    ReceiptId: string;
}

export interface ReceiptStatusRequest {
    Request: { ReceiptId: string };
}

export interface ReceiptStatusResponse {
    Status: ReceiptStatus;
    // 0=NEW, 1=PROCESSED, 2=CONFIRMED, 3=KKT_ERROR
    KktRegNumber?: string;
    FnSerialNumber?: string;
    FiscalDocumentNumber?: number;
    FiscalSign?: string;
    Url?: string;
    Error?: {
        Code: number;
        Message?: string;
    };
}

export interface MarkingCheckItem {
    Type: string;
    Code: string;
    PlannedStatus: string;
}

export interface MarkingCheckRequest {
    Request: {
        Items: MarkingCheckItem[];
        TotalSum: number;
        OperationType: number; // 1 = sell
    };
}

export interface MarkingCheckResponse {
    Id: string;
}

export interface MarkingCheckStatusResponse {
    Status: number; // 0=WAIT, 1=READY, 2=ERROR
    Items?: Array<{
        Code: string;
        Status: number; // 0=OK, 1=ERROR
        Error?: string;
    }>;
}

export interface CashboxExtendedInfo {
    Id: string;
    Name: string;
    SerialNumber: string;
    Status: number;
    Inn?: string;
    LastConnected?: string;
}

export interface MonitoringResponse {
    Cashboxes: CashboxExtendedInfo[];
}

class FermaApiError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    authToken?: string
): Promise<T> {
    const url = authToken
        ? `${FERMA_BASE_URL}${path}?AuthToken=${encodeURIComponent(authToken)}`
        : `${FERMA_BASE_URL}${path}`;

    return await fetch(url, {
        method,
        headers: {"Content-Type": "application/json"},
        body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(response => {
        return response.text();
    }).then(text => {
        const data = JSON.parse(text);
        console.log(data);
        return data?.Data as T;
    }).catch(error => {
        let errBody: unknown;
        try {
            errBody = error.json();
        } catch {
            errBody = error.text();
        }
        throw new FermaApiError(`Ferma API error ${error.status}`, error.status, errBody);
    })
}

export const fermaApi = {
    baseUrl: FERMA_BASE_URL,

    setBaseUrl(url: string) {
        FERMA_BASE_URL = url;
        (fermaApi as { baseUrl: string }).baseUrl = url;
    },

    /** POST /api/Authorization/CreateAuthToken */
    createAuthToken(login: string, password: string): Promise<AuthResponse> {
        return request<AuthResponse>("POST", "/api/Authorization/CreateAuthToken", {
            Login: login,
            Password: password,
        });
    },

    /** POST /api/kkt/cloud/receipt — send fiscal receipt */
    createReceipt(authToken: string, req: ReceiptRequest): Promise<ReceiptResponse> {
        return request<ReceiptResponse>("POST", "/api/kkt/cloud/receipt", {Request: req}, authToken);
    },

    /** POST /api/kkt/cloud/status — get receipt processing status */
    getReceiptStatus(authToken: string, receiptId: string): Promise<ReceiptStatusResponse> {
        return request<ReceiptStatusResponse>(
            "POST",
            "/api/kkt/cloud/status",
            {Request: {ReceiptId: receiptId}},
            authToken
        );
    },

    /** POST /api/kkt/cloud/mc/piot/check — pre-check marking codes */
    checkMarkingCodes(authToken: string, req: MarkingCheckRequest): Promise<MarkingCheckResponse> {
        return request<MarkingCheckResponse>("POST", "/api/kkt/cloud/mc/piot/check", req, authToken);
    },

    /** POST /api/kkt/cloud/mc/piot/check/status — get marking check result */
    getMarkingCheckStatus(authToken: string, checkId: string): Promise<MarkingCheckStatusResponse> {
        return request<MarkingCheckStatusResponse>(
            "POST",
            "/api/kkt/cloud/mc/piot/check/status",
            {Request: {Id: checkId}},
            authToken
        );
    },

    /** GET /api/kkt/cloud/stats/cashboxes/extended — KKT monitoring */
    getMonitoringInfo(authToken: string): Promise<MonitoringResponse> {
        return request<MonitoringResponse>("GET", "/api/kkt/cloud/stats/cashboxes/extended", undefined, authToken);
    },
};

export {FermaApiError};
export default fermaApi;
