// Ferma® OFD API v2.84 (13.07.2026) — HTTP client
// Docs: https://ferma.ofd.ru
// Auth: POST /api/Authorization/CreateAuthToken → ?AuthToken={Code}

let FERMA_BASE_URL = "https://ferma-test.ofd.ru"; // switch to ferma.ofd.ru for production

// ─── Value types ──────────────────────────────────────────────────────────────

export type VatType =
    | "VatNo"          // Без НДС
    | "Vat0"           // НДС 0%
    | "Vat5"           // НДС 5%
    | "Vat7"           // НДС 7%
    | "Vat10"          // НДС 10%
    | "Vat20"          // НДС 20%
    | "Vat22"          // НДС 22%
    | "ObsoleteVat20"  // устаревший НДС 20%
    | "CalculatedVat5105"    // НДС 5% от 105%
    | "CalculatedVat7107"    // НДС 7% от 107%
    | "CalculatedVat10110"   // НДС 10% от 110%
    | "CalculatedVat20120"   // НДС 20% от 120%
    | "ObsoleteVat20120"     // устаревший НДС 20/120
    | "CalculatedVat22122";  // НДС 22% от 122%

export type MeasureType =
    | "PIECE" | "GRAM" | "KILOGRAM" | "TON"
    | "CENTIMETER" | "DECIMETER" | "METER"
    | "SQUARE_CENTIMETER" | "SQUARE_DECIMETER" | "SQUARE_METER"
    | "MILLILITER" | "LITER" | "CUBIC_METER"
    | "KILOWATT_HOUR" | "GIGACALORIE"
    | "DAY" | "HOUR" | "MINUTE" | "SECOND"
    | "KILOBYTE" | "MEGABYTE" | "GIGABYTE" | "TERABYTE"
    | "OTHER";

export type TaxationSystem =
    | "Common" | "0"
    | "SimpleIn" | "1"
    | "SimpleInOut" | "2"
    | "Unified" | "3"
    | "UnifiedAgricultural" | "4"
    | "Patent" | "5";

export type ReceiptType =
    | "Income"                   // Приход
    | "IncomeReturn"             // Возврат прихода
    | "IncomePrepayment"         // Авансовый платёж
    | "IncomeReturnPrepayment"   // Возврат аванса
    | "IncomeCorrection"         // Чек коррекции/приход
    | "BuyCorrection"            // Чек коррекции/расход
    | "IncomeReturnCorrection"   // Чек коррекции/Возврат прихода
    | "ExpenseReturnCorrection"  // Чек коррекции/Возврат расхода
    | "Expense"                  // Расход
    | "ExpenseReturn";           // Возврат расхода

// 0=cash 1=cashless 2=prepaid 3=credit 4=counter
export type PaymentSumType = 0 | 1 | 2 | 3 | 4;
export type ReceiptStatusCode = 0 | 1 | 2 | 3; // NEW / PROCESSED / CONFIRMED / KKT_ERROR
export type CheckMcMode = "IGNORE_ANY_ERRORS" | "REQUIRE_NO_M_MINUS";

// ─── Marking code ─────────────────────────────────────────────────────────────

export type MarkingCodeFormatType =
    | "UNKNOWN_PRODUCT_CODE"
    | "EAN8" | "EAN13" | "ITF14"
    | "GS1" | "GS1M"
    | "SHORT_MC"
    | "FUR"
    | "EGAIS20" | "EGAIS30"
    | "KTF1" | "KTF2" | "KTF3" | "KTF4" | "KTF5" | "KTF6";

export type MarkingPlannedStatus =
    | "PIECE_PRODUCT_INCOME"
    | "MEASURED_PRODUCT_INCOME"
    | "PIECE_PRODUCT_RETURN"
    | "MEASURED_PRODUCT_RETURN"
    | "PIECE_PRODUCT_ONSALE"
    | "MEASURED_PRODUCT_SOLD"
    | "PRODUCT_STATUS_NOT_CHANGED";

export interface MarkingCodeFractional {
    Numerator: number;   // строго < Denominator, не 0
    Denominator: number; // не 0
}

/** ФФД 1.2 — передаётся в Items[].MarkingCodeData */
export interface MarkingCodeData {
    Type: MarkingCodeFormatType;
    Code: string;
    PlannedStatus?: MarkingPlannedStatus;
    Fractional?: MarkingCodeFractional; // для дробной реализации
}

/** ФФД 1.1 альтернатива: структурированный КМ */
export interface MarkingCodeStructured {
    Type: "MEDICINES" | "TOBACCO" | "SHOES" | "UNIFIED";
    Gtin: string;
    Serial: string;
}

// ─── Receipt item ─────────────────────────────────────────────────────────────

export interface IndustryItemRequisite {
    FoivId: string;       // 001-072
    DocDate: string;      // ДД.ММ.ГГГГ
    DocNumber: string;
    Value: string;
}

export interface PaymentAgentInfo {
    AgentType: "BANK_PAYMENT_AGENT" | "BANK_PAYMENT_SUBAGENT" | "PAYMENT_AGENT" | "PAYMENT_SUBAGENT" | "CONFIDANT" | "COMMISSIONER" | "AGENT";
    TransferAgentPhone?: string;
    TransferAgentName?: string;
    TransferAgentAddress?: string;
    TransferAgentINN?: string;
    PaymentAgentOperation?: string;
    PaymentAgentPhone?: string;
    ReceiverPhone?: string;
    SupplierInn?: string;
    SupplierName?: string;
    SupplierPhone?: string;
}

export interface ReceiptItem {
    Label: string;
    Price: number;
    Quantity: number;
    Amount: number;
    Vat: VatType;
    Measure?: MeasureType;              // обязательно для ФФД 1.2
    PaymentMethod?: number;             // 1–7, 4 = полный расчёт
    PaymentType?: number;               // признак предмета расчёта (1-33)
    Excise?: number;                    // сумма акциза
    OriginCountryCode?: string;         // 2-3 цифры
    CustomsDeclarationNumber?: string;  // макс. 32 символа
    MarkingCodeData?: MarkingCodeData;         // ФФД 1.2
    MarkingCode?: string;                      // ФФД 1.1, hex
    MarkingCodeStructured?: MarkingCodeStructured; // ФФД 1.1
    IndustryItemRequisite?: IndustryItemRequisite;
    PaymentAgentInfo?: PaymentAgentInfo; // только per-item для ФФД 1.2
}

// ─── Payment items ────────────────────────────────────────────────────────────

export interface PaymentItem {
    PaymentType: PaymentSumType; // 0=наличными, 1=безналично, 2=предоплата, 3=кредит, 4=встречное
    Sum: number;
}

export interface CashlessPayment {
    PaymentSum: number;
    PaymentMethodFlag?: string;
    PaymentIdentifiers?: string;
    AdditionalInformation?: string;
}

// ─── Customer receipt ─────────────────────────────────────────────────────────

export interface ClientInfo {
    Name?: string;
    Inn?: string;
    Birthday?: string;        // ISO date
    Citizenship?: string;
    IdDocType?: string;       // код вида документа
    IdDocData?: string;
    Address?: string;
}

export interface IndustryRequisite {
    FoivId: string;
    DocDate: string;
    DocNumber: string;
    Value: string;
}

export interface OperationRequisite {
    Id: string;
    Details: string;
    DateTime: number; // unix timestamp
}

export interface CorrectionInfo {
    Type: "SELF" | "INSTRUCTION";
    Description: string;
    ReceiptDate: string; // ДД.ММ.ГГ
    ReceiptId: string;
}

export interface CustomUserProperty {
    Name: string;
    Value: string;
}

export interface CustomerReceipt {
    TaxationSystem: TaxationSystem;
    Email?: string;
    Phone?: string;
    PaymentType?: number;              // признак предмета расчёта для всего чека
    CheckMcMode?: CheckMcMode;
    IsInternet?: boolean;
    Timezone?: number;                 // номер часовой зоны (2 = Москва)
    KktFA?: boolean;                   // true для вендинговых касс ФА
    AutomatNumber?: string;            // номер автоматического устройства
    BillAddress?: string;              // место расчётов
    CustomUserProperty?: CustomUserProperty;
    CashlessPayments?: CashlessPayment[];
    ClientInfo?: ClientInfo;
    IndustryRequisite?: IndustryRequisite;
    OperationRequisite?: OperationRequisite;
    Items: ReceiptItem[];
    PaymentItems?: PaymentItem[];
    AdditionalReceiptProp?: string;    // макс. 16 символов
}

export interface ReceiptRequest {
    Inn: string;
    Type: ReceiptType;
    InvoiceId: string;
    McCheckRetryPeriodSec?: number;  // 1–1800, ожидание проверки КМ
    CallbackUrl?: string;
    CustomerReceipt: CustomerReceipt;
    Cashier?: { Name: string; Inn?: string };
    CorrectionInfo?: CorrectionInfo;  // только для чеков коррекции
    PaymentAgentInfo?: PaymentAgentInfo; // только для ФФД 1.05/1.1
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface AuthRequest {
    Login: string;
    Password: string;
}

export interface AuthResponse {
    AuthToken: string;
    ExpirationDateUtc: string;
}

export interface ReceiptResponse {
    ReceiptId: string;
}

// Для чека с большим числом позиций (split)
export interface ReceiptBatchResponse {
    DataList: Array<{ ReceiptId: string }>;
}

export interface ReceiptStatusDevice {
    DeviceId: string;
    RNM: string;
    ZN: string;
    FN: string;
    FDN: string;
    FPD: string;
    ShiftNumber?: number | null;
    ReceiptNumInShift: number;
    DeviceType?: string | null;
    OfdReceiptUrl?: string;
}

export interface ReceiptStatusResponse {
    StatusCode: ReceiptStatusCode;
    StatusName: "NEW" | "PROCESSED" | "CONFIRMED" | "KKT_ERROR";
    StatusMessage?: string;
    ModifiedDateUtc?: string;
    ReceiptDateUtc?: string;
    ModifiedDateTimeIso?: string;
    ReceiptDateTimeIso?: string;
    Device?: ReceiptStatusDevice | null;
    // При ошибке (KKT_ERROR)
    Description?: string;
}

// Реестр чеков (list / list2)
export interface ReceiptListItem {
    ReceiptId: string;
    StatusName: string;
    StatusMessage?: string;
    ModifiedDateUtc?: string;
    ReceiptDateUtc?: string;
    InvoiceId?: string;
    Receipt?: Record<string, unknown>;
}

// Список ФН в период
export interface FnAggregate {
    fn: string;
    firstReceiptDate: string;
    lastReceiptDate: string;
}

// Расширенный реестр чеков
export interface ExtendedReceiptItem {
    Id: string;
    Tag: number;
    TotalSumm: number;
    CashSumm: number;
    ECashSumm: number;
    DocDateTime: string;
    OperationType: string;
    DocNumber: number;
    KktRegNumber: string;
    FnNumber: string;
    DocShiftNumber: number;
    DecimalFiscalSign: string;
    CDateUt: string;
}

// Мониторинг ККТ
export interface CashboxExtendedInfo {
    deviceId: number;
    fn: string;
    zn: string;
    rnm: string;
    kktModel: string;
    kktState: string;
    tariffType: string;
    tariffEndDate: string;
    tariffChecksCnt: number | null;
    fnName: string;
    fnModelName: string;
    checksCnt: number;
    fnVolumePercent: number;
    projectedFnReplaceDate: string;
    projectedFnFilledDate: string;
    fnLastChangeDate: string;
}

// Очередь чеков
export interface QueueResponse {
    Length: number;
    UpdateTime: string;
}

// ─── Marking code check (ТС ПИоТ) ────────────────────────────────────────────

export interface MarkingCheckRequest {
    Type: MarkingCodeFormatType;
    Code: string;
    PlannedStatus?: MarkingPlannedStatus;
    Numerator?: number;
    Denominator?: number;
}

export interface MarkingCheckResponse {
    Status: string;
    McId: string;
    RequestTime: string;
}

export interface MarkingCheckCode {
    cis: string;
    found: boolean;
    valid: boolean;
    printView?: string;
    gtin?: string;
    groupIds?: number[];
    verified?: boolean;
    realizable?: boolean;
    utilised?: boolean;
    expireDate?: string;
    isOwner?: boolean;
    isBlocked?: boolean;
    errorCode?: number;
    isTracking?: boolean;
    sold?: boolean;
    grayZone?: boolean;
    packageType?: "UNIT" | "GROUP" | "BUNDLE";
    producerInn?: string;
}

export interface MarkingCheckStatusResponse {
    code: number;          // 0 = успешно
    description: string;  // "ok" или сообщение об ошибке
    codes?: MarkingCheckCode[];
    reqId?: string;
    reqTimestamp?: number;
}

// ─── API error ────────────────────────────────────────────────────────────────

export class FermaApiError extends Error {
    status: number;
    body: unknown;
    errorCode?: number;
    errorMessage?: string;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.status = status;
        this.body = body;
        if (body && typeof body === "object") {
            const b = body as Record<string, unknown>;
            if (b.Error && typeof b.Error === "object") {
                const e = b.Error as Record<string, unknown>;
                this.errorCode = e.Code as number;
                this.errorMessage = e.Message as string;
            }
        }
    }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    authToken?: string,
    queryParams?: Record<string, string>
): Promise<T> {
    const params = new URLSearchParams(queryParams ?? {});
    if (authToken) params.set("AuthToken", authToken);
    const qs = params.toString() ? `?${params}` : "";
    const url = `${FERMA_BASE_URL}${path}${qs}`;

    const res = await fetch(url, {
        method,
        headers: {"Content-Type": "application/json"},
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        let errBody: unknown;
        try {
            errBody = await res.json();
        } catch {
            errBody = await res.text();
        }
        throw new FermaApiError(`Ferma API error ${res.status}`, res.status, errBody);
    }

    const text = await res.text();
    if (!text) return undefined as T;
    const json = JSON.parse(text);
    // Unwrap Data envelope when present
    if (json && typeof json === "object" && "Status" in json) {
        if (json.Status === "Failed") {
            throw new FermaApiError(
                json.Error?.Message ?? `Ferma API failed`,
                res.status,
                json
            );
        }
        return (json.Data ?? json) as T;
    }
    return json as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const fermaApi = {
    get baseUrl() {
        return FERMA_BASE_URL;
    },

    setBaseUrl(url: string) {
        FERMA_BASE_URL = url;
    },

    // 2. Авторизация
    createAuthToken(login: string, password: string): Promise<AuthResponse> {
        return request<AuthResponse>("POST", "/api/Authorization/CreateAuthToken", {
            Login: login,
            Password: password,
        });
    },

    // 3.2.1 — Формирование фискального документа
    createReceipt(authToken: string, req: ReceiptRequest): Promise<ReceiptResponse> {
        return request<ReceiptResponse>("POST", "/api/kkt/cloud/receipt", {Request: req}, authToken);
    },

    // 3.4 — Проверка статуса чека (по ReceiptId или InvoiceId)
    getReceiptStatus(authToken: string, id: string, byInvoiceId = false): Promise<ReceiptStatusResponse> {
        const body = byInvoiceId ? {Request: {InvoiceId: id}} : {Request: {ReceiptId: id}};
        return request<ReceiptStatusResponse>("POST", "/api/kkt/cloud/status", body, authToken);
    },

    // 3.5 — Реестр чеков (серверное время обработки)
    getReceiptList(authToken: string, params: {
        ReceiptId?: string;
        StartDateUtc?: string;
        EndDateUtc?: string;
        StartDateLocal?: string;
        EndDateLocal?: string;
    }): Promise<ReceiptListItem[]> {
        return request<ReceiptListItem[]>("POST", "/api/kkt/cloud/list", {...params}, authToken);
    },

    // 3.5 — Реестр чеков (время пробития)
    getReceiptList2(authToken: string, params: {
        ReceiptId?: string;
        StartDateLocal?: string;
        EndDateLocal?: string;
    }): Promise<ReceiptListItem[]> {
        return request<ReceiptListItem[]>("POST", "/api/kkt/cloud/list2", {...params}, authToken);
    },

    // 3.6 — Список ФН за период
    getFnAggregates(authToken: string, dateFrom: string, dateTo: string): Promise<FnAggregate[]> {
        return request<FnAggregate[]>(
            "GET",
            "/api/kkt/cloud/stats/fn/aggregates",
            undefined,
            authToken,
            {dateFrom, dateTo}
        );
    },

    // 3.7 — Расширенный реестр чеков
    getReceiptsExtended(
        authToken: string,
        params: { dateFromIncl?: string; dateToIncl?: string; receiptId?: string; zn?: string; fn?: string }
    ): Promise<{ Receipts: ExtendedReceiptItem[] }> {
        return request<{ Receipts: ExtendedReceiptItem[] }>(
            "GET",
            "/api/kkt/cloud/stats/receipts/extended",
            undefined,
            authToken,
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>
        );
    },

    // 3.8 — Мониторинг ККТ и ФН
    getMonitoringInfo(authToken: string, params?: {
        deviceId?: string;
        rnm?: string;
        zn?: string;
        fn?: string
    }): Promise<CashboxExtendedInfo[]> {
        return request<CashboxExtendedInfo[]>(
            "GET",
            "/api/kkt/cloud/stats/cashboxes/extended",
            undefined,
            authToken,
            params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string> : undefined
        );
    },

    // 3.10 — Очередь чеков
    getQueueLength(authToken: string): Promise<QueueResponse> {
        return request<QueueResponse>("GET", "/api/kkt/cloud/stats/receipts/queue/length", undefined, authToken);
    },

    // 3.3.3 — Проверка КМ в ТС ПИоТ (до формирования чека)
    checkMarkingCode(authToken: string, req: MarkingCheckRequest): Promise<MarkingCheckResponse> {
        console.log("ТС ПИоТ");
        return request<MarkingCheckResponse>("POST", "/api/kkt/cloud/mc/piot/check", req, authToken);
    },

    // 3.3.4 — Результат проверки КМ по McId
    getMarkingCheckStatus(authToken: string, mcId: string): Promise<MarkingCheckStatusResponse> {
        return request<MarkingCheckStatusResponse>(
            "POST",
            "/api/kkt/cloud/mc/piot/check/status",
            {McId: mcId},
            authToken
        );
    },

    // Legacy alias for backward compat with markingStore
    checkMarkingCodes(authToken: string, code: string, type: MarkingCodeFormatType = "UNKNOWN_PRODUCT_CODE"): Promise<MarkingCheckResponse> {
        return fermaApi.checkMarkingCode(authToken, {Type: type, Code: code});
    },
};

export default fermaApi;
