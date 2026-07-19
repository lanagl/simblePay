import {makeAutoObservable, runInAction} from "mobx";
import fermaApi, {FermaApiError} from "../api/fermaApi";
import type {AuthStore} from "./authStore";

export type MarkCodeCheckStatus = "idle" | "checking" | "ok" | "error";

export interface MarkCodeResult {
    code: string;
    status: MarkCodeCheckStatus;
    error?: string;
}

export class MarkingStore {
    private auth: AuthStore;
    results = new Map<string, MarkCodeResult>();
    isChecking = false;
    lastError: string | null = null;

    constructor(auth: AuthStore) {
        this.auth = auth;
        makeAutoObservable(this);
    }

    getResult(code: string): MarkCodeResult | undefined {
        return this.results.get(code);
    }

    /** Check a single marking code via Ferma PIOT API v2.84 */
    async checkCode(code: string): Promise<boolean> {

        const token = await this.auth.ensureToken();
        if (!token) {
            runInAction(() => {
                this.lastError = "Нет авторизации";
            });
            return false;
        }

        runInAction(() => {
            this.isChecking = true;
            this.lastError = null;
            this.results.set(code, {code, status: "checking"});
        });

        try {
            const checkRes = await fermaApi.checkMarkingCode(token, {
                Type: "UNKNOWN_PRODUCT_CODE",
                Code: code,
                PlannedStatus: "PIECE_PRODUCT_INCOME",
            });

            const result = await this.pollCheckStatus(token, checkRes.McId, code);
            runInAction(() => {
                this.isChecking = false;
            });
            return result;
        } catch (err) {
            console.log(`Checking code err: ${err}`);
            runInAction(() => {
                this.isChecking = false;
                const msg =
                    err instanceof FermaApiError
                        ? `Ошибка проверки КМ (${err.status})`
                        : "Нет связи с CRPT";
                this.lastError = msg;
                this.results.set(code, {code, status: "error", error: msg});
            });
            return false;
        }
    }

    private async pollCheckStatus(token: string, mcId: string, code: string, attempts = 0): Promise<boolean> {
        if (attempts > 10) {
            runInAction(() => {
                this.results.set(code, {code, status: "error", error: "Превышено время ожидания CRPT"});
            });
            return false;
        }

        await new Promise<void>((r) => setTimeout(r, 1000));

        try {
            const res = await fermaApi.getMarkingCheckStatus(token, mcId);
            if (res.code === 0 && res.codes !== undefined) {
                const item = res.codes[0];
                const ok = item?.valid === true;
                runInAction(() => {
                    this.results.set(code, {
                        code,
                        status: ok ? "ok" : "error",
                        error: ok ? undefined : (item?.errorCode !== undefined ? `Код ошибки CRPT: ${item.errorCode}` : "КМ не прошёл проверку CRPT"),
                    });
                });
                return ok;
            } else if (res.code !== 0) {
                runInAction(() => {
                    this.results.set(code, {code, status: "error", error: res.description ?? "Ошибка CRPT"});
                });
                return false;
            } else {
                // Still processing — codes is undefined
                return this.pollCheckStatus(token, mcId, code, attempts + 1);
            }
        } catch {
            return this.pollCheckStatus(token, mcId, code, attempts + 1);
        }
    }

    clearCode(code: string) {
        this.results.delete(code);
    }

    clearAll() {
        this.results.clear();
        this.lastError = null;
    }
}
