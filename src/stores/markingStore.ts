import { makeAutoObservable, runInAction } from "mobx";
import fermaApi, { FermaApiError } from "../api/fermaApi";
import type { AuthStore } from "./authStore";

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

  /** Check a single marking code via Ferma PIOT API */
  async checkCode(code: string, totalSum: number): Promise<boolean> {
    const token = await this.auth.ensureToken();
    if (!token) {
      runInAction(() => { this.lastError = "Нет авторизации"; });
      return false;
    }

    runInAction(() => {
      this.isChecking = true;
      this.lastError = null;
      this.results.set(code, { code, status: "checking" });
    });

    try {
      const checkRes = await fermaApi.checkMarkingCodes(token, {
        Request: {
          Items: [{ Type: "UNKNOWN_PRODUCT_CODE", Code: code, PlannedStatus: "PIECE_PRODUCT_INCOME" }],
          TotalSum: totalSum,
          OperationType: 1,
        },
      });

      // Poll status
      const result = await this.pollCheckStatus(token, checkRes.Id, code);
      runInAction(() => { this.isChecking = false; });
      return result;
    } catch (err) {
      runInAction(() => {
        this.isChecking = false;
        const msg =
          err instanceof FermaApiError
            ? `Ошибка проверки КМ (${err.status})`
            : "Нет связи с CRPT";
        this.lastError = msg;
        this.results.set(code, { code, status: "error", error: msg });
      });
      return false;
    }
  }

  private async pollCheckStatus(token: string, checkId: string, code: string, attempts = 0): Promise<boolean> {
    if (attempts > 10) {
      runInAction(() => {
        this.results.set(code, { code, status: "error", error: "Превышено время ожидания CRPT" });
      });
      return false;
    }

    await new Promise<void>((r) => setTimeout(r, 1000));

    try {
      const res = await fermaApi.getMarkingCheckStatus(token, checkId);
      if (res.Status === 1) {
        // READY
        const item = res.Items?.[0];
        const ok = item?.Status === 0;
        runInAction(() => {
          this.results.set(code, {
            code,
            status: ok ? "ok" : "error",
            error: ok ? undefined : (item?.Error ?? "КМ не прошёл проверку CRPT"),
          });
        });
        return ok;
      } else if (res.Status === 2) {
        runInAction(() => {
          this.results.set(code, { code, status: "error", error: "Ошибка CRPT" });
        });
        return false;
      } else {
        return this.pollCheckStatus(token, checkId, code, attempts + 1);
      }
    } catch {
      return this.pollCheckStatus(token, checkId, code, attempts + 1);
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
