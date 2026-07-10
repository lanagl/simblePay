import { makeAutoObservable, runInAction } from "mobx";
import fermaApi, { FermaApiError } from "../api/fermaApi";

export class AuthStore {
  token: string | null = null;
  tokenExpiresAt: Date | null = null;
  login = "fermatest1";
  password = "Hjsf3321klsadfAA";
  inn = "000000000000";
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
        const { token, expiresAt, login, password, inn } = JSON.parse(saved);
        if (token && new Date(expiresAt) > new Date()) {
          this.token = token;
          this.tokenExpiresAt = new Date(expiresAt);
          this.isConnected = true;
        }
        if (login) this.login = login;
        if (password) this.password = password;
        if (inn) this.inn = inn;
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
      })
    );
  }

  setCredentials(login: string, password: string, inn: string) {
    this.login = login;
    this.password = password;
    this.inn = inn;
    this.saveToStorage();
  }

  get isTokenValid(): boolean {
    return !!(this.token && this.tokenExpiresAt && this.tokenExpiresAt > new Date());
  }

  async authenticate(): Promise<boolean> {
    this.isLoading = true;
    this.error = null;
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
