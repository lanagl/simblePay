import {makeAutoObservable, runInAction} from "mobx";
import type {TaxationSystem} from "../api/fermaApi";
import fermaApi, {FermaApiError} from "../api/fermaApi";

export const INITIAL_AUTH = {
    login: "fermatest2",
    password: "Go2999483Mb",
    inn: "000000000000",
    cashierName: "",
    taxationSystem: "SimpleIn" as TaxationSystem,
    baseUrl: "https://ferma-test.ofd.ru"
}

export class AuthStore {
    token: string | null = null;
    tokenExpiresAt: Date | null = null;
    login = INITIAL_AUTH.login;
    password = INITIAL_AUTH.password;
    inn = INITIAL_AUTH.inn;
    cashierName = INITIAL_AUTH.cashierName;
    taxationSystem: TaxationSystem = INITIAL_AUTH.taxationSystem;
    baseUrl = INITIAL_AUTH.baseUrl;
    isLoading = false;
    error: string | null = null;
    isConnected = false;

    constructor() {
        makeAutoObservable(this);
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const saved = localStorage.getItem("ferma_auth");
            if (saved) {
                const {
                    token,
                    expiresAt,
                    login,
                    password,
                    inn,
                    cashierName,
                    taxationSystem,
                    baseUrl
                } = JSON.parse(saved);
                if (token && new Date(expiresAt) > new Date()) {
                    this.token = token;
                    this.tokenExpiresAt = new Date(expiresAt);
                    this.isConnected = true;
                }
                if (login) this.login = login;
                if (password) this.password = password;
                if (inn) this.inn = inn;
                if (cashierName) this.cashierName = cashierName;
                if (taxationSystem) this.taxationSystem = taxationSystem;
                if (baseUrl) {
                    this.baseUrl = baseUrl;
                    fermaApi.setBaseUrl(baseUrl);
                }
            }
        } catch {
            // ignore
        }
    }

    private saveToStorage() {
        localStorage.setItem(
            "ferma_auth",
            JSON.stringify({
                token: this.token,
                expiresAt: this.tokenExpiresAt?.toISOString(),
                login: this.login,
                password: this.password,
                inn: this.inn,
                cashierName: this.cashierName,
                taxationSystem: this.taxationSystem,
                baseUrl: this.baseUrl,
            })
        );
    }

    setCredentials(login: string, password: string, inn: string) {
        this.login = login;
        this.password = password;
        this.inn = inn;
        this.saveToStorage();
    }

    setFermaConfig(cfg: {
        login: string;
        password: string;
        inn: string;
        cashierName: string;
        taxationSystem: TaxationSystem;
        baseUrl: string;
    }) {
        this.login = cfg.login;
        this.password = cfg.password;
        this.inn = cfg.inn;
        this.cashierName = cfg.cashierName;
        this.taxationSystem = cfg.taxationSystem;
        this.baseUrl = cfg.baseUrl;
        fermaApi.setBaseUrl(cfg.baseUrl);
        this.saveToStorage();
    }

    get isTokenValid(): boolean {
        return !!(this.token && this.tokenExpiresAt && this.tokenExpiresAt > new Date());
    }

    get tokenExpiresStr(): string {
        if (!this.tokenExpiresAt) return "";
        return this.tokenExpiresAt.toLocaleString("ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    }

    async authenticate(): Promise<boolean> {
        this.isLoading = true;
        this.error = null;
        fermaApi.setBaseUrl(this.baseUrl);
        try {
            const res = await fermaApi.createAuthToken(this.login, this.password);
            runInAction(() => {
                this.token = res.AuthToken;
                this.tokenExpiresAt = new Date(res.ExpirationDateUtc);
                this.isConnected = true;
                this.isLoading = false;
            });
            this.saveToStorage();
            return true;
        } catch (err) {
            runInAction(() => {
                this.error =
                    err instanceof FermaApiError
                        ? `Ошибка ${err.status}: неверный логин или пароль`
                        : "Нет связи с сервером ОФД";
                this.isConnected = false;
                this.isLoading = false;
            });
            return false;
        }
    }

    async ensureToken(): Promise<string | null> {
        if (this.isTokenValid) return this.token;
        const ok = await this.authenticate();
        return ok ? this.token : null;
    }

    logout() {
        this.token = null;
        this.tokenExpiresAt = null;
        this.isConnected = false;
        localStorage.removeItem("ferma_auth");
    }
}
