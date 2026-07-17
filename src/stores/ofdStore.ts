import {makeAutoObservable, runInAction} from "mobx";
import ofdApi, {
    KktInfo,
    KktListItem,
    OfdApiError,
    ReceiptDetail,
    ReceiptShort,
    saveOfdConfig,
    ZReport,
} from "../api/ofdApi";

import {OfdConfig} from "../api/posApi";
import type {PosAuthStore} from "./posAuthStore.ts";
import posApi from "../api/posApi.ts";

function isoDate(d: Date) {
    return d.toISOString().split("T")[0] + "T00:00:00";
}

function isoDateEnd(d: Date) {
    const s = d.toISOString().split("T")[0];
    return s + "T23:59:59";
}

const INITIAL_CONFIG: OfdConfig = {
    login: "", baseUrl: "https://ferma-test.ofd.ru", password: "", authToken: "", inn: ""

}

export class OfdStore {
    private posAuth: PosAuthStore;

    config: OfdConfig = INITIAL_CONFIG;

    // Connection state
    isConnected = false;
    isConnecting = false;
    connectionError: string | null = null;

    // KKT list
    kktList: KktListItem[] = [];
    kktInfo: KktInfo[] = [];
    isLoadingKkts = false;

    // Receipts
    receipts: ReceiptShort[] = [];
    isLoadingReceipts = false;
    receiptsError: string | null = null;

    // Selected receipt detail
    receiptDetail: ReceiptDetail | null = null;
    isLoadingDetail = false;

    // Z-reports
    zReports: ZReport[] = [];
    isLoadingZReports = false;
    zReportsError: string | null = null;

    // Selected date range
    dateFrom: string = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return isoDate(d);
    })();
    dateTo: string = isoDateEnd(new Date());

    // Selected KKT
    selectedKktRnm: string | null = null;

    constructor(posAuth: PosAuthStore) {
        this.posAuth = posAuth;
        makeAutoObservable(this);
        if (this.config.authToken) this.testConnection();
    }

    // ─── Config ───────────────────────────────────────────────────────────────

    setConfig(cfg: Partial<OfdConfig>) {
        this.config = {...this.config, ...cfg};
        saveOfdConfig(this.config);
    }

    setDateRange(from: string, to: string) {
        this.dateFrom = from;
        this.dateTo = to;
    }

    get configValid(): boolean {
        return !!(this.config.authToken);
    }

    async loadOfdConfig(): Promise<void> {
        const {token} = this.posAuth;

        try {
            const config = await posApi.loadOfdConfig(token ?? "");
            console.log("config", config);
            runInAction(() => {
                this.config = config[0];
            });
            this.testConnection();
        } catch {

        }
    }

    // ─── Connection test ──────────────────────────────────────────────────────

    async testConnection(): Promise<boolean> {
        if (!this.configValid) {
            runInAction(() => {
                this.connectionError = "Укажите API-ключ и ИНН";
                this.isConnected = false;
            });
            return false;
        }

        runInAction(() => {
            this.isConnecting = true;
            this.connectionError = null;
        });

        try {
            const list = this.configValid;
            runInAction(() => {
                this.isConnected = true;
                this.isConnecting = false;
                // if (list.length > 0 && !this.selectedKktRnm) {
                //     this.selectedKktRnm = list[0].RnmNumber;
                // }
            });
            return true;
        } catch (err) {
            runInAction(() => {
                this.isConnected = false;
                this.isConnecting = false;
                this.connectionError =
                    err instanceof OfdApiError
                        ? err.errors[0] ?? `Ошибка ${err.status}`
                        : "Нет связи с OFD.ru";
            });
            return false;
        }
    }

    // ─── KKT monitoring ───────────────────────────────────────────────────────

    async loadKktInfo(): Promise<void> {
        if (!this.isConnected) return;
        runInAction(() => {
            this.isLoadingKkts = true;
        });
        try {
            const info = await ofdApi.getKkts(this.config);
            runInAction(() => {
                this.kktInfo = info;
                this.isLoadingKkts = false;
            });
        } catch {
            runInAction(() => {
                this.isLoadingKkts = false;
            });
        }
    }

    // ─── Receipts ─────────────────────────────────────────────────────────────

    async loadReceipts(kktRnm?: string): Promise<void> {
        const rnm = kktRnm ?? this.selectedKktRnm;
        if (!rnm || !this.isConnected) return;

        runInAction(() => {
            this.isLoadingReceipts = true;
            this.receiptsError = null;
        });

        try {
            const list = await ofdApi.getReceiptsWithDetail(this.config, rnm, this.dateFrom, this.dateTo);
            runInAction(() => {
                this.receipts = list;
                this.isLoadingReceipts = false;
                this.selectedKktRnm = rnm;
            });
        } catch (err) {
            runInAction(() => {
                this.receiptsError = err instanceof OfdApiError ? err.errors[0] ?? "Ошибка загрузки" : "Ошибка загрузки чеков";
                this.isLoadingReceipts = false;
            });
        }
    }

    async loadReceiptDetail(kktRnm: string, rawId: string): Promise<void> {
        runInAction(() => {
            this.isLoadingDetail = true;
            this.receiptDetail = null;
        });
        try {
            const detail = await ofdApi.getReceiptDetail(this.config, kktRnm, rawId);
            runInAction(() => {
                this.receiptDetail = detail;
                this.isLoadingDetail = false;
            });
        } catch {
            runInAction(() => {
                this.isLoadingDetail = false;
            });
        }
    }

    clearReceiptDetail() {
        this.receiptDetail = null;
    }

    // ─── Z-Reports ────────────────────────────────────────────────────────────

    async loadZReports(kktRnm?: string): Promise<void> {
        if (!this.isConnected) return;

        runInAction(() => {
            this.isLoadingZReports = true;
            this.zReportsError = null;
        });

        try {
            const rnm = kktRnm ?? this.selectedKktRnm;
            const reports = rnm
                ? await ofdApi.getZReports(this.config, rnm, this.dateFrom, this.dateTo)
                : await ofdApi.getAllZReports(this.config, this.dateFrom, this.dateTo);
            runInAction(() => {
                this.zReports = reports;
                this.isLoadingZReports = false;
            });
        } catch (err) {
            runInAction(() => {
                this.zReportsError = err instanceof OfdApiError ? err.errors[0] ?? "Ошибка загрузки" : "Ошибка загрузки Z-отчётов";
                this.isLoadingZReports = false;
            });
        }
    }

    // ─── Computed ─────────────────────────────────────────────────────────────

    get selectedKktInfo(): KktListItem | undefined {
        return this.kktList.find(k => k.RnmNumber === this.selectedKktRnm);
    }

    get totalReceiptsAmount(): number {
        return this.receipts.reduce((s, r) => s + r.TotalSumm, 0);
    }

    get incomeReceipts(): ReceiptShort[] {
        return this.receipts.filter(r => r.OperationType === "income");
    }

    get returnReceipts(): ReceiptShort[] {
        return this.receipts.filter(r => r.OperationType === "incomeReturn");
    }
}
