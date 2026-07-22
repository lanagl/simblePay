import {makeAutoObservable, runInAction} from "mobx";
import fermaApi, {FermaApiError, ReceiptRequest, ReceiptStatusResponse} from "../api/fermaApi";
import type {AuthStore} from "./authStore";

export type ReceiptSendStatus = "idle" | "sending" | "polling" | "confirmed" | "error";

export interface SentReceipt {
    receiptId: string;
    invoiceId: string;
    sentAt: Date;
    status: ReceiptSendStatus;
    fiscalData?: ReceiptStatusResponse;
    error?: string;
}

export class ReceiptStore {
    private auth: AuthStore;
    currentReceipt: SentReceipt | null = null;
    history: SentReceipt[] = [];
    isLoading = false;
    error: string | null = null;

    constructor(auth: AuthStore) {
        this.auth = auth;
        makeAutoObservable(this);
    }

    get lastReceipt(): SentReceipt | null {
        return this.history[this.history.length - 1] ?? null;
    }

    async sendReceipt(req: ReceiptRequest): Promise<SentReceipt | null> {
        const token = await this.auth.ensureToken();
        if (!token) {
            runInAction(() => {
                this.error = "Нет авторизации в ОФД";
            });
            return null;
        }

        runInAction(() => {
            this.isLoading = true;
            this.error = null;
        });

        try {
            const res = await fermaApi.createReceipt(token, req);
            const sent: SentReceipt = {
                receiptId: res.ReceiptId,
                invoiceId: req.InvoiceId,
                sentAt: new Date(),
                status: "sending",
            };

            runInAction(() => {
                this.currentReceipt = sent;
                this.history.push(sent);
                this.isLoading = false;
            });

            this.pollStatus(res.ReceiptId, token);
            return sent;
        } catch (err) {
            runInAction(() => {
                this.error =
                    err instanceof FermaApiError
                        ? `Ошибка отправки чека (${err.status})`
                        : "Ошибка соединения с ОФД";
                this.isLoading = false;
            });
            return null;
        }
    }

    private async pollStatus(receiptId: string, token: string, attempts = 0) {
        if (attempts > 20) {
            this.updateReceiptStatus(receiptId, "error", undefined, "Превышено время ожидания");
            return;
        }

        await delay(attempts < 5 ? 1500 : 3000);

        try {
            const status = await fermaApi.getReceiptStatus(token, receiptId);
            const s = status.StatusCode;

            if (s === 2) {
                // CONFIRMED
                this.updateReceiptStatus(receiptId, "confirmed", status);
            } else if (s === 3) {
                // KKT_ERROR
                this.updateReceiptStatus(
                    receiptId,
                    "error",
                    status,
                    status.Description ?? "Ошибка ККТ"
                );
            } else {
                // NEW (0) or PROCESSED (1) — keep polling
                this.updateReceiptStatus(receiptId, "polling", status);
                this.pollStatus(receiptId, token, attempts + 1);
            }
        } catch {
            this.updateReceiptStatus(receiptId, "error", undefined, "Ошибка получения статуса");
        }
    }

    private updateReceiptStatus(
        receiptId: string,
        status: ReceiptSendStatus,
        fiscalData?: ReceiptStatusResponse,
        error?: string
    ) {
        runInAction(() => {
            const r = this.history.find((r) => r.receiptId === receiptId);
            if (r) {
                r.status = status;
                if (fiscalData) r.fiscalData = fiscalData;
                if (error) r.error = error;
            }
            if (this.currentReceipt?.receiptId === receiptId) {
                this.currentReceipt = r ?? this.currentReceipt;
            }
        });
    }
}

function delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
