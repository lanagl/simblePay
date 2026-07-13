import {makeAutoObservable, runInAction} from "mobx";
import posApi, {ApiError, loadApiConfig, saveApiConfig} from "../api/posApi";

export interface PosUser {
    id: number;
    name: string;
    username: string;
    role: "cashier" | "admin" | "manager";
}

const STORAGE_KEY = "pos_auth";

export class PosAuthStore {
    token: string | null = null;
    username: string | null = null;
    password: string | null = null;
    user: PosUser | null = null;
    isLoading = false;
    error: string | null = null;
    apiBaseUrl: string = loadApiConfig().baseUrl;

    constructor() {
        makeAutoObservable(this);
        this.restore();
    }

    get isAuthenticated(): boolean {
        return !!(this.token);
    }

    private restore() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const {token, user} = JSON.parse(saved);
                this.token = token;
                this.user = user;
            }
        } catch { /* ignore */
        }
    }

    private persist() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({token: this.token, user: this.user}));
    }

    setApiBaseUrl(url: string) {
        this.apiBaseUrl = url;
        saveApiConfig({baseUrl: url});
    }

    async login(username: string, password: string): Promise<boolean> {
        runInAction(() => {
            this.isLoading = true;
            this.error = null;
        });

        try {
            const res = await posApi.login(username, password);
            runInAction(() => {
                this.username = username;
                this.password = password;
                this.token = btoa(`${username}:${password}`);
                this.isLoading = false;
            });
            this.persist();
            return true;
        } catch (err) {
            runInAction(() => {
                this.isLoading = false;
                if (err instanceof ApiError) {
                    if (err.status === 401) {
                        this.error = "Неверный логин или пароль";
                    } else if (err.status === 0 || err.message.includes("fetch")) {
                        this.error = "Нет связи с сервером. Проверьте адрес API.";
                    } else {
                        this.error = err.message;
                    }
                } else {
                    this.error = "Нет связи с сервером. Проверьте адрес API.";
                }
            });
            return false;
        }
    }

    async validateToken(): Promise<boolean> {
        if (!this.token) return false;
        try {
            const user = await posApi.me(this.token);
            runInAction(() => {
                this.user = user;
            });
            return true;
        } catch {
            runInAction(() => {
                this.token = null;
                this.user = null;
            });
            localStorage.removeItem(STORAGE_KEY);
            return false;
        }
    }

    async logout() {
        if (this.token) {
            try {
                await posApi.logout(this.token);
            } catch { /* ignore */
            }
        }
        runInAction(() => {
            this.token = null;
            this.user = null;
            this.error = null;
        });
        localStorage.removeItem(STORAGE_KEY);
    }
}
