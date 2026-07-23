import React, {useCallback, useEffect, useRef, useState} from "react";
import {observer} from "mobx-react-lite";
import {
    AlertTriangle,
    BadgeCheck,
    Banknote,
    BarChart3,
    Building2,
    CheckCheck,
    CheckCircle2,
    CheckSquare,
    ChevronDown,
    ChevronRight,
    Clock,
    CreditCard,
    Database,
    Eye,
    EyeOff,
    Info,
    LayoutGrid,
    ListOrdered,
    Loader2,
    Lock,
    LogIn,
    LogOut,
    Minus,
    PackagePlus,
    Pencil,
    Plus,
    Receipt,
    RefreshCw,
    ScanLine,
    Search,
    Server,
    Settings,
    ShieldCheck,
    ShoppingCart,
    Tag,
    Trash,
    Trash2,
    TrendingUp,
    User,
    UserCircle,
    Wallet,
    Wifi,
    WifiOff,
    X,
    Zap,
} from "lucide-react";
import {useStore} from "../stores/rootStore";
import type {CartItem, PaymentMethod, Product} from "../stores/posStore";
import wfmApi, {WfmCategory} from "../api/wfmApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_CATEGORIES = ["Напитки", "Выпечка", "Молочные", "Снеки", "Табак"];
const PRESET_EMOJIS = ["👧", "💰", "🛍", "👜", "🎊", "🏷️", "🛁", "🕯️", "🎂", "📷", "📃", "🖨", "🥛", "🧼", "🛍️", "🥤", "💧", "🍊", "⚡", "☕", "🥐", "🥖", "🫓", "🥛", "🍶", "🧀", "🫙", "🥔", "🍫", "🥜", "🚬", "🔥", "🍕", "🍔", "🌮", "🍱", "🥗", "🍰", "🍩", "🍬", "🧃", "🍺", "🫖", "🧴", "🪥", "📦", "🛒"];
const CASHIERS = ["Глазырина С."];
const TAX_RATE = 0.0;

const fmt = (n: number) =>
    n.toLocaleString("ru-RU", {style: "currency", currency: "RUB", minimumFractionDigits: 2});

const fmtKop = (kopecks: number) => fmt(kopecks / 100);

const nowStr = () =>
    new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

const fmtDt = (iso: string) => {
    try {
        return new Date(iso).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return iso;
    }
};

const fmtDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit", year: "numeric"});
    } catch {
        return iso;
    }
};

const isoLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const genDemoCode = (barcode: string) => {
    const rnd = Math.random().toString(36).slice(2, 12).toUpperCase();
    return `010${barcode}21${rnd}`;
};

type AppView = "pos" | "payment" | "receipt";
type MobileTab = "catalog" | "cart";

// ─── NumPad ───────────────────────────────────────────────────────────────────

function NumPad({value, onChange}: { value: string; onChange: (v: string) => void }) {
    const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "⌫"];
    const press = (k: string) => {
        if (k === "⌫") onChange(value.length > 1 ? value.slice(0, -1) : "0");
        else if (k === "00") onChange(value === "0" ? "0" : value + "00");
        else onChange(value === "0" ? k : value.length < 9 ? value + k : value);
    };
    return (
        <div className="grid grid-cols-3 gap-2">
            {keys.map(k => (
                <button key={k} onClick={() => press(k)}
                        className={`h-14 rounded-lg text-xl font-mono font-semibold transition-all active:scale-95
            ${k === "⌫" ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                            : "bg-secondary text-foreground hover:bg-muted border border-border"}`}>
                    {k}
                </button>
            ))}
        </div>
    );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

const LoginScreen = observer(({onShowApiSettings}: { onShowApiSettings: () => void }) => {
    const {posAuth, posStore} = useStore();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        let usernameTmp = username ? username : posAuth.username;
        let passwordTmp = password ? username : posAuth.password;
        if (usernameTmp && passwordTmp) {
            const token = btoa(`${usernameTmp}:${passwordTmp}`);
        }
        const ok = await posAuth.login(username, password);
        if (ok) {
            await posStore.loadProducts();
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div
                        className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
                        <Receipt className="w-10 h-10 text-primary-foreground"/>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">КассаPRO</h1>
                    <p className="text-muted-foreground text-sm mt-2">Система кассового обслуживания</p>
                </div>

                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-border">
                        <div className="flex items-center gap-2">
                            <UserCircle className="w-5 h-5 text-primary"/>
                            <h2 className="font-bold text-foreground">Вход в систему</h2>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="p-6 space-y-4">
                        {posAuth.error && (
                            <div
                                className="flex items-center gap-2 bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
                                <AlertTriangle className="w-4 h-4 shrink-0"/>
                                {posAuth.error}
                            </div>
                        )}
                        <div>
                            <label
                                className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Логин</label>
                            <div className="relative">
                                <User
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                <input value={username} onChange={e => setUsername(e.target.value)}
                                       placeholder="Введите логин" autoComplete="username" required
                                       className="w-full h-11 bg-secondary border border-border rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:border-primary/60 transition-colors"/>
                            </div>
                        </div>
                        <div>
                            <label
                                className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Пароль</label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                <input type={showPass ? "text" : "password"} value={password}
                                       onChange={e => setPassword(e.target.value)} placeholder="Введите пароль"
                                       autoComplete="current-password" required
                                       className="w-full h-11 bg-secondary border border-border rounded-xl pl-10 pr-11 text-sm focus:outline-none focus:border-primary/60 transition-colors"/>
                                <button type="button" onClick={() => setShowPass(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={posAuth.isLoading || !username || !password}
                                className="w-full h-12 mt-2 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {posAuth.isLoading
                                ? <><Loader2 className="w-5 h-5 animate-spin"/>Вход...</>
                                : <><LogIn className="w-5 h-5"/>Войти</>}
                        </button>
                    </form>
                </div>

                <button onClick={onShowApiSettings}
                        className="w-full mt-4 flex items-center justify-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors py-2">
                    <Server className="w-4 h-4"/>
                    Настройки подключения к серверу
                </button>
                <p className="text-center text-muted-foreground text-xs mt-6 font-mono">ООО «РОМАШКА» · ИНН
                    7701234567</p>
            </div>
        </div>
    );
});

// ─── API Settings Modal ───────────────────────────────────────────────────────

const ApiSettingsModal = observer(({onClose}: { onClose: () => void }) => {
    const {posAuth} = useStore();
    const [url, setUrl] = useState(posAuth.apiBaseUrl);
    const [testResult, setTestResult] = useState<"idle" | "testing" | "ok" | "error">("idle");
    const [testMsg, setTestMsg] = useState("");

    const handleTest = async () => {
        setTestResult("testing");
        posAuth.setApiBaseUrl(url);
        try {
            await fetch(`${url}/health`).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
            });
            setTestResult("ok");
            setTestMsg("Сервер доступен");
        } catch (e) {
            setTestResult("error");
            setTestMsg("Сервер недоступен: " + (e instanceof Error ? e.message : "неизвестная ошибка"));
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div
                className="w-full sm:max-w-lg bg-card border border-border sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-primary"/>
                        <h2 className="font-bold text-foreground">Подключение к серверу</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label
                            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5"/>Адрес API
                        </label>
                        <input value={url} onChange={e => {
                            setUrl(e.target.value);
                            setTestResult("idle");
                        }}
                               placeholder="http://localhost:3000/api"
                               className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm font-mono focus:outline-none focus:border-primary/60 transition-colors"/>
                    </div>

                    {testResult !== "idle" && (
                        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 border text-sm ${
                            testResult === "testing" ? "bg-muted border-border text-muted-foreground"
                                : testResult === "ok" ? "bg-primary/5 border-primary/20 text-primary"
                                    : "bg-destructive/5 border-destructive/20 text-destructive"
                        }`}>
                            {testResult === "testing" ? <Loader2 className="w-4 h-4 animate-spin shrink-0"/>
                                : testResult === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0"/>
                                    : <AlertTriangle className="w-4 h-4 shrink-0"/>}
                            {testMsg || "Проверка..."}
                        </div>
                    )}

                    <div className="bg-muted rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-muted-foreground"/>Ожидаемая схема MySQL
                        </p>
                        <pre
                            className="text-[11px] text-muted-foreground leading-relaxed overflow-x-auto">{`CREATE TABLE products
                                                                                                            (
                                                                                                                id        INT AUTO_INCREMENT PRIMARY KEY,
                                                                                                                name      VARCHAR(255)   NOT NULL,
                                                                                                                price     DECIMAL(10, 2) NOT NULL,
                                                                                                                emoji     VARCHAR(10) DEFAULT '📦',
                                                                                                                category  VARCHAR(100)   NOT NULL,
                                                                                                                barcode   VARCHAR(50),
                                                                                                                is_marked TINYINT(1) DEFAULT 0
                                                                                                            );`}</pre>
                    </div>

                    <div className="bg-muted rounded-xl p-3 flex gap-2">
                        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"/>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Бэкенд принимает <span className="font-mono">Bearer</span> токен.
                            Эндпоинты: <span className="font-mono">POST /auth/login</span>, <span className="font-mono">GET /products</span>, <span
                            className="font-mono">POST|PUT|DELETE /products/:id</span>.
                        </p>
                    </div>
                </div>

                <div className="px-5 pb-5 flex gap-3">
                    <button onClick={handleTest} disabled={testResult === "testing"}
                            className="flex-1 h-12 bg-secondary border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        {testResult === "testing" ? <Loader2 className="w-4 h-4 animate-spin"/> :
                            <RefreshCw className="w-4 h-4"/>}
                        Проверить
                    </button>
                    <button onClick={() => {
                        posAuth.setApiBaseUrl(url);
                        onClose();
                    }}
                            className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <CheckSquare className="w-4 h-4"/>Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
});

// ─── OFD Integration Settings Modal (v1.71 API) ───────────────────────────────

const TAXATION_OPTIONS: { value: string; label: string }[] = [
    {value: "Common", label: "ОСН — Общая"},
    {value: "SimpleIn", label: "УСН доход"},
    {value: "SimpleInOut", label: "УСН доход−расход"},
    {value: "Unified", label: "ЕНВД"},
    {value: "UnifiedAgricultural", label: "ЕСХН"},
    {value: "Patent", label: "Патент"},
];

const OfdSettingsModal = observer(({onClose}: { onClose: () => void }) => {
    const {auth, posAuth} = useStore();
    const [fLogin, setFLogin] = useState(auth.login);
    const [fPassword, setFPassword] = useState(auth.password);
    const [fInn, setFInn] = useState(auth.inn);
    const [fCashier, setFCashier] = useState(auth.cashierName);
    const [fTaxation, setFTaxation] = useState<string>(auth.taxationSystem);
    const [fBaseUrl, setFBaseUrl] = useState(auth.baseUrl);
    const [showFPass, setShowFPass] = useState(false);
    const [loadingServer, setLoadingServer] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [server, setServer] = useState<string>("test");

    const applyConfig = (cfg: {
        login: string;
        password: string;
        inn: string;
        cashierName: string;
        baseUrl: string;
        taxationSystem: string
    }) => {
        if (cfg.login) setFLogin(cfg.login);
        if (cfg.password) setFPassword(cfg.password);
        if (cfg.inn) setFInn(cfg.inn);
        if (cfg.cashierName) setFCashier(cfg.cashierName);
        if (cfg.baseUrl) setFBaseUrl(cfg.baseUrl);
        if (cfg.taxationSystem) setFTaxation(cfg.taxationSystem);
    };

    const handleLoadFromServer = async () => {
        setLoadingServer(true);
        setServerError(null);
        try {
            const list = await wfmApi.getOfdSettings(posAuth.token ?? "");
            if (list.length > 0) {
                const listServer = list.find(s => s.name === server);
                if (listServer)
                    applyConfig(listServer);
            } else setServerError("Настройки не найдены на сервере");
        } catch {
            setServerError("Не удалось загрузить настройки с сервера wfm.utitel.ru");
        } finally {
            setLoadingServer(false);
        }
    };

    const handleSave = () => {
        auth.setFermaConfig({
            login: fLogin.trim(),
            password: fPassword,
            inn: fInn.trim(),
            cashierName: fCashier.trim(),
            taxationSystem: fTaxation as never,
            baseUrl: fBaseUrl.trim() || "https://ferma.ofd.ru",
        });
        onClose();
    };

    const handleTest = async () => {
        auth.setFermaConfig({
            login: fLogin.trim(),
            password: fPassword,
            inn: fInn.trim(),
            cashierName: fCashier.trim(),
            taxationSystem: fTaxation as never,
            baseUrl: fBaseUrl.trim() || "https://ferma.ofd.ru",
        });
        await auth.authenticate();
    };

    const statusOk = auth.isConnected && auth.isTokenValid;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div
                className="w-full sm:max-w-lg bg-card border border-border sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[95vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-primary"/>
                        </div>
                        <div>
                            <h2 className="font-bold text-foreground leading-none">Ферма® OFD</h2>
                            <p className="text-muted-foreground text-xs mt-0.5 font-mono">API v2.84</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleLoadFromServer} disabled={loadingServer}
                                className="flex items-center gap-1.5 h-8 px-3 bg-secondary border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-50">
                            {loadingServer ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> :
                                <RefreshCw className="w-3.5 h-3.5"/>}
                            С сервера
                        </button>
                        <button onClick={onClose}
                                className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                    {/* Server load error */}
                    {serverError && (
                        <div
                            className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-xs text-destructive">
                            <AlertTriangle className="w-4 h-4 shrink-0"/>{serverError}
                        </div>
                    )}

                    {/* Status banner */}
                    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                        statusOk ? "bg-primary/5 border-primary/20" : auth.isLoading ? "bg-yellow-500/5 border-yellow-500/20" : "bg-muted border-border"
                    }`}>
                        {auth.isLoading
                            ? <Loader2 className="w-4 h-4 text-yellow-500 animate-spin shrink-0"/>
                            : statusOk
                                ? <BadgeCheck className="w-4 h-4 text-primary shrink-0"/>
                                : <WifiOff className="w-4 h-4 text-muted-foreground shrink-0"/>}
                        <div className="min-w-0">
                            <p className={`text-sm font-semibold ${statusOk ? "text-primary" : auth.isLoading ? "text-yellow-500" : "text-muted-foreground"}`}>
                                {auth.isLoading ? "Авторизация..." : statusOk ? `Подключено ${server} · токен действует` : auth.error ?? "Не авторизован"}
                            </p>
                            {statusOk && auth.tokenExpiresStr && (
                                <p className="text-xs text-muted-foreground font-mono truncate">до {auth.tokenExpiresStr}</p>
                            )}
                        </div>
                    </div>

                    {/* Login + Password */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label
                                className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <User className="w-3 h-3"/>Логин
                            </label>
                            <input value={fLogin} onChange={e => setFLogin(e.target.value)} autoComplete="username"
                                   placeholder="login"
                                   className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm font-mono focus:outline-none focus:border-primary/60 transition-colors"/>
                        </div>
                        <div>
                            <label
                                className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <Lock className="w-3 h-3"/>Пароль
                            </label>
                            <div className="relative">
                                <input type={showFPass ? "text" : "password"} value={fPassword}
                                       onChange={e => setFPassword(e.target.value)} autoComplete="current-password"
                                       placeholder="••••••••"
                                       className="w-full h-11 bg-secondary border border-border rounded-xl px-3 pr-11 text-sm font-mono focus:outline-none focus:border-primary/60 transition-colors"/>
                                <button type="button" onClick={() => setShowFPass(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showFPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* INN */}
                    <div>
                        <label
                            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5"/>ИНН организации
                        </label>
                        <input value={fInn} onChange={e => setFInn(e.target.value.replace(/\D/g, ""))}
                               inputMode="numeric" maxLength={12} placeholder="000000000000"
                               className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm font-mono focus:outline-none focus:border-primary/60 transition-colors"/>
                    </div>

                    {/* Cashier */}
                    <div>
                        <label
                            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                            <UserCircle className="w-3.5 h-3.5"/>Кассир по умолчанию
                        </label>
                        <input value={fCashier} onChange={e => setFCashier(e.target.value)}
                               placeholder="Иванова А.Н."
                               className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary/60 transition-colors"/>
                    </div>

                    {/* Taxation */}
                    <div>
                        <label
                            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5"/>Система налогообложения
                        </label>
                        <select value={fTaxation} onChange={e => setFTaxation(e.target.value)}
                                className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary/60 transition-colors appearance-none cursor-pointer">
                            {TAXATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Server URL */}
                    <div>
                        <label
                            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5"/>Сервер
                        </label>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => setServer("test")}
                                    className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-all ${server === "test" ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-600" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                                Тест
                            </button>
                            <button onClick={() => setServer("prod")}
                                    className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-all ${server === "prod" ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                                Продукт
                            </button>
                        </div>
                        <input value={fBaseUrl} onChange={e => setFBaseUrl(e.target.value)}
                               className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm font-mono focus:outline-none focus:border-primary/60 transition-colors"/>
                    </div>

                    <div className="bg-muted rounded-xl p-3 flex gap-2">
                        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"/>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Нажмите «С сервера» для автозаполнения из <span className="font-mono">wfm.utitel.ru</span>.
                            API v2.84: НДС 5%, 7%, 22%, авансы, коррекции, дробная реализация.
                        </p>
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
                    <button onClick={handleTest} disabled={auth.isLoading || !fLogin || !fPassword}
                            className="flex-1 h-12 bg-secondary border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        {auth.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wifi className="w-4 h-4"/>}
                        Проверить
                    </button>
                    <button onClick={handleSave}
                            className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <CheckSquare className="w-4 h-4"/>Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
});

// ─── Mark Scan Modal ──────────────────────────────────────────────────────────

interface MarkScanModalProps {
    item: CartItem;
    onSave: (codes: string[]) => void;
    onClose: () => void;
}

function MarkScanModal({item, onSave, onClose}: MarkScanModalProps) {
    const [codes, setCodes] = useState<string[]>([...item.markCodes]);
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const {markingStore} = useStore();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const needed = item.qty - codes.length;
    const addCode = (raw: string) => {
        const code = raw.trim();
        if (!code) return;
        if (code.length < 10) {
            setError("Код слишком короткий");
            return;
        }
        if (codes.includes(code)) {
            setError("Этот код уже добавлен");
            return;
        }
        if (codes.length >= item.qty) {
            setError("Все коды уже отсканированы");
            return;
        }
        setCodes(c => [...c, code]);
        // markingStore.checkCode(code)
        //     .then(r => {
        //         if (r)
        //             setCodes(c => [...c, code])
        //         else
        //             setError("Ошибочный код")
        //     });

        setInput("");
        setError("");

        inputRef.current?.focus();
    };
    const allDone = codes.length >= item.qty;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div
                className="w-full sm:max-w-lg bg-card border border-border sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-primary"/>
                        <div>
                            <h2 className="font-bold text-foreground text-sm leading-none">Коды маркировки</h2>
                            <p className="text-muted-foreground text-xs mt-0.5">{item.product.emoji} {item.product.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                    <div
                        className={`rounded-xl p-3 flex items-center gap-3 ${allDone ? "bg-primary/10 border border-primary/20" : "bg-accent/10 border border-accent/20"}`}>
                        {allDone ? <CheckCheck className="w-5 h-5 text-primary shrink-0"/> :
                            <AlertTriangle className="w-5 h-5 text-accent shrink-0"/>}
                        <div className="flex-1">
                            <p className={`text-sm font-semibold ${allDone ? "text-primary" : "text-accent"}`}>
                                {allDone ? "Все коды отсканированы" : `Осталось: ${needed} из ${item.qty}`}
                            </p>
                            <div className="flex gap-1 mt-1.5">
                                {Array.from({length: item.qty}).map((_, i) => (
                                    <div key={i}
                                         className={`flex-1 h-1.5 rounded-full ${i < codes.length ? "bg-primary" : "bg-border"}`}/>
                                ))}
                            </div>
                        </div>
                    </div>
                    {!allDone && (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input ref={inputRef} value={input}
                                       onChange={e => {
                                           setInput(e.target.value);
                                           setError("");
                                       }}
                                       onKeyDown={e => e.key === "Enter" && addCode(input)}
                                       placeholder="010xxxxxxxxxxxxxxx21xxxxxxxxxx"
                                       className={`flex-1 h-11 bg-secondary border rounded-xl px-3 text-sm font-mono focus:outline-none transition-colors ${error ? "border-destructive" : "border-border focus:border-primary/60"}`}/>
                                <button onClick={() => addCode(input)} disabled={!input.trim()}
                                        className="h-11 px-4 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-30">+
                                </button>
                            </div>
                            {error && <p className="text-destructive text-xs">{error}</p>}
                            <button onClick={() => addCode(genDemoCode(item.product.barcode))}
                                    className="w-full h-10 bg-secondary border border-dashed border-primary/40 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                                <ScanLine className="w-4 h-4"/>Симулировать сканирование
                            </button>
                        </div>
                    )}
                    {codes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Отсканировано</p>
                            {codes.map((c, i) => (
                                <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0"/>
                                    <span className="flex-1 text-xs font-mono text-foreground truncate">{c}</span>
                                    <button onClick={() => setCodes(c => c.filter((_, idx) => idx !== i))}
                                            className="text-muted-foreground hover:text-destructive transition-colors">
                                        <X className="w-3.5 h-3.5"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
                    <button onClick={onClose}
                            className="flex-1 h-12 bg-secondary border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors">
                        Отмена
                    </button>
                    <button onClick={() => {
                        onSave(codes);
                        onClose();
                    }}
                            className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <CheckCheck className="w-4 h-4"/>Сохранить{codes.length > 0 && ` (${codes.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Add / Edit Product Modal ─────────────────────────────────────────────────

interface ProductModalProps {
    existingCategories: WfmCategory[];
    initial?: Product;
    onSave: (p: Omit<Product, "id">) => void;
    onClose: () => void;
}

function ProductModal({existingCategories, initial, onSave, onClose}: ProductModalProps) {
    const allCats = Array.from(new Set([...existingCategories]));
    const [name, setName] = useState(initial?.name ?? "");
    const [priceStr, setPriceStr] = useState(initial ? String(initial.price) : "");
    const [category, setCategory] = useState(initial?.category ?? allCats[0].id);
    const [customCat, setCustomCat] = useState();
    const [emoji, setEmoji] = useState(initial?.emoji ?? "📦");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [barcode, setBarcode] = useState(initial?.barcode ?? "");
    const [isMarked, setIsMarked] = useState(initial?.isMarked ?? false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const isEdit = !!initial;

    const validate = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Введите название";
        const p = parseFloat(priceStr.replace(",", "."));
        if (!priceStr || isNaN(p) || p <= 0) e.price = "Введите корректную цену";
        return e;
    };

    const handleSubmit = () => {
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            return;
        }
        onSave({
            name: name.trim(),
            price: Math.round(parseFloat(priceStr.replace(",", ".")) * 100) / 100,
            category: category,
            emoji,
            barcode: barcode.trim() || String(Date.now()),
            isMarked,
        });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div
                className="w-full sm:max-w-lg bg-card border border-border sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[95vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        {isEdit ? <Pencil className="w-5 h-5 text-primary"/> :
                            <PackagePlus className="w-5 h-5 text-primary"/>}
                        <h2 className="font-bold text-foreground">{isEdit ? "Редактировать товар" : "Добавить товар"}</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                    <div>
                        <label
                            className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Иконка</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowEmojiPicker(v => !v)}
                                    className="w-14 h-14 bg-secondary border border-border rounded-xl text-3xl flex items-center justify-center hover:border-primary/50 transition-colors">
                                {emoji}
                            </button>
                            <div className="flex items-center gap-1 text-muted-foreground text-sm"><span>Нажмите для выбора</span><ChevronDown
                                className="w-4 h-4"/></div>
                        </div>
                        {showEmojiPicker && (
                            <div
                                className="mt-2 bg-secondary border border-border rounded-xl p-3 grid grid-cols-8 gap-1">
                                {PRESET_EMOJIS.map(e => (
                                    <button key={e} onClick={() => {
                                        setEmoji(e);
                                        setShowEmojiPicker(false);
                                    }}
                                            className={`w-9 h-9 text-xl rounded-lg flex items-center justify-center transition-colors ${emoji === e ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted"}`}>
                                        {e}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Название
                            *</label>
                        <input value={name} onChange={e => {
                            setName(e.target.value);
                            setErrors(v => ({...v, name: ""}));
                        }}
                               placeholder="Молоко Простоквашино 1л"
                               className={`w-full h-11 bg-secondary border rounded-xl px-3 text-sm focus:outline-none transition-colors ${errors.name ? "border-destructive" : "border-border focus:border-primary/60"}`}/>
                        {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Цена, ₽
                            *</label>
                        <input value={priceStr} onChange={e => {
                            setPriceStr(e.target.value);
                            setErrors(v => ({...v, price: ""}));
                        }}
                               inputMode="decimal" placeholder="0.00"
                               className={`w-full h-11 bg-secondary border rounded-xl px-3 text-sm font-mono focus:outline-none transition-colors ${errors.price ? "border-destructive" : "border-border focus:border-primary/60"}`}/>
                        {errors.price && <p className="text-destructive text-xs mt-1">{errors.price}</p>}
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Категория
                            *</label>
                        <div className="grid grid-cols-3 gap-2">
                            {allCats.map(c => (
                                <button key={c.id} onClick={() => setCategory(c.id)}
                                        className={`h-9 rounded-lg text-sm font-medium transition-colors truncate px-2 ${category === c.id ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border hover:text-foreground"}`}>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label
                            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Штрихкод</label>
                        <input value={barcode} onChange={e => setBarcode(e.target.value)} inputMode="numeric"
                               placeholder="Введите или отсканируйте"
                               className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm font-mono focus:outline-none focus:border-primary/60 transition-colors"/>
                    </div>
                    <div>
                        <label
                            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Маркировка</label>
                        <button onClick={() => setIsMarked(v => !v)}
                                className={`w-full h-12 rounded-xl border font-semibold text-sm flex items-center gap-3 px-4 transition-all ${isMarked ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                            <ShieldCheck className="w-5 h-5"/>
                            <div className="flex-1 text-left">
                                <span>{isMarked ? "Товар подлежит маркировке" : "Маркировка не требуется"}</span>
                                {isMarked &&
									<p className="text-xs font-normal text-primary/70">При продаже нужно сканировать
										DataMatrix</p>}
                            </div>
                            <div
                                className={`w-10 h-6 rounded-full relative transition-colors ${isMarked ? "bg-primary" : "bg-border"}`}>
                                <div
                                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isMarked ? "left-5" : "left-1"}`}/>
                            </div>
                        </button>
                    </div>
                </div>
                <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
                    <button onClick={onClose}
                            className="flex-1 h-12 bg-secondary border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors">
                        Отмена
                    </button>
                    <button onClick={handleSubmit}
                            className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        {isEdit ? <><Pencil className="w-4 h-4"/>Сохранить</> : <><Plus
                            className="w-4 h-4"/>Добавить</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Shift Open Screen ────────────────────────────────────────────────────────

const ShiftOpenScreen = observer(({onOpen}: { onOpen: (cashier: string, cash: number) => void }) => {
    const {posStore, posAuth, auth} = useStore();
    const [cashier, setCashier] = useState(posAuth.user?.name ?? CASHIERS[0]);
    const [cashStr, setCashStr] = useState("0");
    const [step, setStep] = useState<"form" | "confirm">("form");
    const [showOfdSettings, setShowOfdSettings] = useState(false);

    const cashAmt = parseInt(cashStr) || 0;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Receipt className="w-8 h-8 text-primary-foreground"/>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">КассаPRO</h1>
                    <p className="text-muted-foreground text-sm mt-1 font-mono">Терминал №3 · ИНН 7701234567</p>
                    {posAuth.user && (
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                            <UserCircle className="w-4 h-4"/>
                            <span>{posAuth.user.name}</span>
                            <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-md">{posAuth.user.role}</span>
                        </div>
                    )}
                </div>

                {step === "form" ? (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="px-6 pt-6 pb-2">
                            <div className="flex items-center gap-2 mb-5">
                                <LogIn className="w-5 h-5 text-primary"/>
                                <h2 className="font-bold text-foreground">Открытие смены
                                    №{posStore.shiftNumber + 1}</h2>
                            </div>
                            <button onClick={() => setShowOfdSettings(true)}
                                    className={`hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                                        auth.isConnected && auth.isTokenValid
                                            ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                                            : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                                    }`}>
                                {auth.isLoading ? <Loader2 className="w-3 h-3 animate-spin"/>
                                    : auth.isConnected && auth.isTokenValid ? <Zap className="w-3 h-3"/>
                                        : <WifiOff className="w-3 h-3"/>}
                                <span className="hidden md:inline">Ферма</span>
                            </button>
                            <div className="mb-4">
                                <label
                                    className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Кассир</label>
                                <div className="space-y-1.5">
                                    {CASHIERS.map(c => (
                                        <button key={c} onClick={() => setCashier(c)}
                                                className={`w-full flex items-center gap-3 h-11 px-4 rounded-xl border text-sm font-medium transition-all ${cashier === c ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-border text-foreground hover:border-primary/30"}`}>
                                            <User className="w-4 h-4"/>{c}
                                            {cashier === c && <CheckCircle2 className="w-4 h-4 ml-auto"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-5">
                                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Остаток
                                    наличных</label>
                                <div
                                    className="bg-secondary border border-border rounded-xl px-4 py-3 flex items-baseline justify-between mb-3">
                                    <span className="text-muted-foreground text-sm">Сумма</span>
                                    <span className="font-mono text-xl font-bold text-foreground">{fmt(cashAmt)}</span>
                                </div>
                                <NumPad value={cashStr} onChange={setCashStr}/>
                            </div>
                        </div>
                        <div className="px-6 pb-6">
                            <button onClick={() => setStep("confirm")}
                                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                <LogIn className="w-4 h-4"/>Продолжить
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="p-6">
                            <h2 className="font-bold text-foreground mb-4">Подтвердите открытие смены</h2>
                            <div className="space-y-3 mb-6">
                                {[
                                    {
                                        icon: <BarChart3 className="w-4 h-4"/>,
                                        label: "Смена",
                                        val: `№${posStore.shiftNumber + 1}`
                                    },
                                    {icon: <User className="w-4 h-4"/>, label: "Кассир", val: cashier},
                                    {icon: <Clock className="w-4 h-4"/>, label: "Время", val: nowStr(), mono: true},
                                    {
                                        icon: <Wallet className="w-4 h-4"/>,
                                        label: "Наличные",
                                        val: fmt(cashAmt),
                                        mono: true
                                    },
                                ].map(({icon, label, val, mono}) => (
                                    <div key={label}
                                         className="flex justify-between items-center py-3 border-b border-border last:border-0">
                                        <span
                                            className="text-muted-foreground text-sm flex items-center gap-2">{icon}{label}</span>
                                        <span
                                            className={`font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{val}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setStep("form")}
                                        className="flex-1 h-12 bg-secondary border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors">
                                    Назад
                                </button>
                                <button onClick={() => onOpen(cashier, cashAmt)}
                                        className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                    <LogIn className="w-4 h-4"/>Открыть
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {showOfdSettings && <OfdSettingsModal onClose={() => setShowOfdSettings(false)}/>}
        </div>
    );
});

// ─── Shift Close Modal ────────────────────────────────────────────────────────

const ShiftCloseModal = observer(({onClose, onConfirm}: { onClose: () => void; onConfirm: () => void }) => {
    const {posStore} = useStore();
    const shift = posStore.currentShift!;
    const receipts = posStore.completedReceipts;
    const cashTotal = receipts.reduce((s, r) => s + (r.paymentMethod === "cash" ? r.cashPaid : 0), 0);
    const cardTotal = receipts.reduce((s, r) => s + (r.paymentMethod === "card" ? r.total : 0), 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div
                className="w-full sm:max-w-lg bg-card border border-border sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[95vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <LogOut className="w-5 h-5 text-destructive"/>
                        <h2 className="font-bold text-foreground">Закрытие смены №{shift.number}</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            {icon: <User className="w-4 h-4"/>, label: "Кассир", val: shift.cashier},
                            {icon: <Clock className="w-4 h-4"/>, label: "Открыта", val: shift.openTime},
                            {icon: <Receipt className="w-4 h-4"/>, label: "Чеков", val: String(receipts.length)},
                        ].map(({icon, label, val}) => (
                            <div key={label} className="bg-secondary rounded-xl p-3 text-center">
                                <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="font-semibold text-foreground text-sm mt-0.5 truncate">{val}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-secondary rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><TrendingUp
                                className="w-4 h-4 text-primary"/>Выручка</p>
                        </div>
                        <div className="divide-y divide-border">
                            <div className="flex justify-between px-4 py-3">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><Banknote
                                    className="w-4 h-4"/>Наличные</span>
                                <span className="font-mono font-semibold text-foreground">{fmt(cashTotal)}</span>
                            </div>
                            <div className="flex justify-between px-4 py-3">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><CreditCard
                                    className="w-4 h-4"/>Карта</span>
                                <span className="font-mono font-semibold text-foreground">{fmt(cardTotal)}</span>
                            </div>
                            <div className="flex justify-between px-4 py-3 bg-primary/5">
                                <span className="text-sm font-bold text-foreground">Итого</span>
                                <span
                                    className="font-mono font-bold text-primary text-lg">{fmt(cashTotal + cardTotal)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5"/>
                        <p className="text-xs text-destructive/80">После закрытия смены операции невозможны до открытия
                            новой.</p>
                    </div>
                </div>
                <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
                    <button onClick={onClose}
                            className="flex-1 h-12 bg-secondary border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors">
                        Отмена
                    </button>
                    <button onClick={onConfirm}
                            className="flex-1 h-12 bg-destructive text-destructive-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4"/>Закрыть смену
                    </button>
                </div>
            </div>
        </div>
    );
});

// ─── Shift Closed Screen ──────────────────────────────────────────────────────

const ShiftClosedScreen = observer(({shift, onNewShift}: {
    shift: { number: number; cashier: string; openTime: string; openCash: number };
    onNewShift: () => void;
}) => {
    const {posStore} = useStore();
    const receipts = posStore.completedReceipts;
    const cashTotal = receipts.reduce((s, r) => s + (r.paymentMethod === "cash" ? r.cashPaid : 0), 0);
    const cardTotal = receipts.reduce((s, r) => s + (r.paymentMethod === "card" ? r.total : 0), 0);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="bg-muted border-b border-border p-6 text-center">
                        <div
                            className="w-14 h-14 bg-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Lock className="w-7 h-7 text-muted-foreground"/>
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Смена №{shift.number} закрыта</h2>
                        <p className="text-muted-foreground text-sm mt-1">{nowStr()}</p>
                    </div>
                    <div className="p-5 space-y-3">
                        {[
                            {label: "Кассир", val: shift.cashier},
                            {label: "Открыта", val: shift.openTime, mono: true},
                            {label: "Чеков пробито", val: String(receipts.length)},
                            {label: "Наличные", val: fmt(cashTotal), mono: true},
                            {label: "Карта", val: fmt(cardTotal), mono: true},
                            {label: "Итого выручка", val: fmt(cashTotal + cardTotal), bold: true, mono: true},
                            {
                                label: "В ящике",
                                val: fmt(shift.openCash + cashTotal),
                                bold: true,
                                accent: true,
                                mono: true
                            },
                        ].map(({label, val, bold, accent, mono}) => (
                            <div key={label}
                                 className="flex justify-between items-center py-2 border-b border-border last:border-0">
                                <span className="text-sm text-muted-foreground">{label}</span>
                                <span
                                    className={`text-sm ${bold ? "font-bold" : ""} ${accent ? "text-accent" : "text-foreground"} ${mono ? "font-mono" : ""}`}>{val}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-5 pt-0">
                        <button onClick={onNewShift}
                                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                            <LogIn className="w-4 h-4"/>Открыть новую смену
                        </button>
                    </div>
                </div>
                <p className="text-center text-muted-foreground text-xs mt-4 font-mono">ООО «РОМАШКА» · ФН
                    9999078900012345</p>
            </div>
        </div>
    );
});

// ─── OFD Status Badge ─────────────────────────────────────────────────────────

const OfdStatusBadge = observer(({receiptId}: { receiptId?: string }) => {
    const {receiptStore} = useStore();
    if (!receiptId) return null;
    const sent = receiptStore.history.find(r => r.receiptId === receiptId);
    if (!sent) return null;
    const cfgs = {
        sending: {
            icon: <Loader2 className="w-3.5 h-3.5 animate-spin"/>,
            label: "Отправка в ОФД...",
            cls: "bg-accent/10 text-accent border-accent/20"
        },
        polling: {
            icon: <Loader2 className="w-3.5 h-3.5 animate-spin"/>,
            label: "Обработка ФН...",
            cls: "bg-accent/10 text-accent border-accent/20"
        },
        confirmed: {
            icon: <CheckCircle2 className="w-3.5 h-3.5"/>,
            label: "Фискализирован",
            cls: "bg-primary/10 text-primary border-primary/20"
        },
        error: {
            icon: <AlertTriangle className="w-3.5 h-3.5"/>,
            label: sent.error ?? "Ошибка ОФД",
            cls: "bg-destructive/10 text-destructive border-destructive/20"
        },
        idle: null as null,
    };
    const cfg = cfgs[sent.status];
    if (!cfg) return null;
    return (
        <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 border text-xs font-medium ${cfg.cls}`}>
            {cfg.icon}<span>{cfg.label}</span>
            {sent.status === "confirmed" && sent.fiscalData?.Device?.FPD && (
                <span className="font-mono opacity-70">· ФП {sent.fiscalData?.Device?.FPD}</span>
            )}
        </div>
    );
});

// ─── Main App ─────────────────────────────────────────────────────────────────

export default observer(function App() {
    const {auth, posAuth, posStore, receiptStore} = useStore();

    const [category, setCategory] = useState<number | string>("Все");
    const [search, setSearch] = useState("");
    const [email, setEmail] = useState("info@podarokmaster.ru");
    const [view, setView] = useState<AppView>("pos");
    const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
    const [cashInput, setCashInput] = useState("0");
    const [discount, setDiscount] = useState(0);
    const [mobileTab, setMobileTab] = useState<MobileTab>("catalog");
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showOfdSettings, setShowOfdSettings] = useState(false);
    const [showApiSettings, setShowApiSettings] = useState(false);
    const [scanningProductId, setScanningProductId] = useState<number | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [lastReceipt, setLastReceipt] = useState<{
        items: CartItem[]; total: number; cash: number; change: number;
        method: PaymentMethod; time: string; fermaReceiptId?: string;
    } | null>(null);
    const [closedShiftSnap, setClosedShiftSnap] = useState<{
        number: number; cashier: string; openTime: string; openCash: number;
    } | null>(null);

    // Auto-connect Ferma + load products on mount
    useEffect(() => {
        if (!auth.isConnected && !auth.isLoading) auth.authenticate();
        posStore.loadProducts();
    }, []);

    const allCategories = [...posStore.productCategories];
    const subtotal = posStore.cartTotal;
    const discountAmt = Math.round(subtotal * discount / 100);
    const total = subtotal - discountAmt;
    const tax = Math.round(total * TAX_RATE / (1 + TAX_RATE));
    const cashNum = parseInt(cashInput) || 0;
    const change = cashNum - total;
    const cartCount = posStore.cartItemCount;
    const missingCodes = posStore.missingMarkCodes;
    const canPay = posStore.canPay;

    const filtered = posStore.products.filter(p =>
        (category === "Все" || p.category === category) &&
        (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search))
    );

    const scanningItem = scanningProductId !== null
        ? posStore.cart.find(i => i.product.id === scanningProductId) ?? null
        : null;

    const handlePay = useCallback(async () => {
        if (!canPay || isPaying) return;
        if (payMethod === "cash" && cashNum < total) return;
        setIsPaying(true);
        const cartSnapshot = posStore.cart.map(i => ({...i}));
        const result = await posStore.processPayment(
            payMethod,
            payMethod === "cash" ? cashNum : 0,
            payMethod === "card" ? total : 0,
            email
        );
        setIsPaying(false);
        if (result) {
            setLastReceipt({
                items: cartSnapshot,
                total: result.total,
                cash: result.cashPaid,
                change: result.change,
                method: result.paymentMethod,
                time: result.time,
                fermaReceiptId: result.fermaReceiptId,
            });
            setView("receipt");
            setCashInput("0");
            setDiscount(0);
        }
    }, [canPay, isPaying, payMethod, cashNum, total, posStore]);

    // ── Auth gate ─────────────────────────────────────────────────────────────

    if (!posAuth.isAuthenticated) {
        return (
            <>
                <LoginScreen onShowApiSettings={() => setShowApiSettings(true)}/>
                {showApiSettings && <ApiSettingsModal onClose={() => setShowApiSettings(false)}/>}
            </>
        );
    }

    // ── Shift screens ─────────────────────────────────────────────────────────

    if (posStore.shiftState === "closed") {
        return (
            <>
                <ShiftOpenScreen onOpen={(cashier, cash) => posStore.openShift(cashier, cash)}/>
                {showOfdSettings && <OfdSettingsModal onClose={() => setShowOfdSettings(false)}/>}
                {showApiSettings && <ApiSettingsModal onClose={() => setShowApiSettings(false)}/>}
            </>
        );
    }

    if (posStore.shiftState === "closing" && closedShiftSnap) {
        return (
            <ShiftClosedScreen
                shift={closedShiftSnap}
                onNewShift={() => {
                    posStore.startNewShift();
                    setClosedShiftSnap(null);
                }}
            />
        );
    }

    // ── Receipt screen ────────────────────────────────────────────────────────

    if (view === "receipt" && lastReceipt) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="bg-primary/10 border-b border-border p-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3"/>
                            <h2 className="text-xl font-bold text-foreground">Оплата прошла</h2>
                            <p className="text-muted-foreground text-sm mt-1">{lastReceipt.time}</p>
                        </div>
                        {lastReceipt.fermaReceiptId && (
                            <div className="px-5 pt-4"><OfdStatusBadge receiptId={lastReceipt.fermaReceiptId}/></div>
                        )}
                        {posStore.lastOfdError && !lastReceipt.fermaReceiptId && (
                            <div className="px-5 pt-4">
                                <div
                                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 border bg-destructive/10 text-destructive border-destructive/20 text-xs">
                                    <WifiOff className="w-3.5 h-3.5"/>{posStore.lastOfdError}
                                </div>
                            </div>
                        )}
                        <div className="p-5 space-y-2">
                            {lastReceipt.items.map((i, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm">
                    <span className="text-foreground flex items-center gap-1.5">
                      {i.product.isMarked && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0"/>}
                        {i.product.name} <span className="text-muted-foreground">×{i.qty}</span>
                    </span>
                                        <span
                                            className="font-mono font-semibold text-foreground">{fmt(i.product.price * i.qty)}</span>
                                    </div>
                                    {i.product.isMarked && i.markCodes.map((c, ci) => (
                                        <p key={ci}
                                           className="text-xs font-mono text-muted-foreground pl-5 mt-0.5 truncate">↳ {c}</p>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-border mx-5"/>
                        <div className="p-5 space-y-2 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>НДС 20%</span><span className="font-mono">{fmt(tax)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-foreground">
                                <span>ИТОГО</span><span
                                className="font-mono text-primary">{fmt(lastReceipt.total)}</span>
                            </div>
                            {lastReceipt.method === "cash" && (
                                <>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Принято</span><span className="font-mono">{fmt(lastReceipt.cash)}</span>
                                    </div>
                                    <div className="flex justify-between text-accent font-semibold">
                                        <span>Сдача</span><span className="font-mono">{fmt(lastReceipt.change)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-5 pt-0">
                            <button onClick={() => {
                                setView("pos");
                                setMobileTab("catalog");
                                setLastReceipt(null);
                            }}
                                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
                                Новый чек
                            </button>
                        </div>
                    </div>
                    <p className="text-center text-muted-foreground text-xs mt-4 font-mono">ООО «РОМАШКА» · ИНН
                        7701234567 · ФН 9999078900012345</p>
                </div>
            </div>
        );
    }

    // ── Payment screen ────────────────────────────────────────────────────────

    if (view === "payment") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-lg font-bold text-foreground">Оплата заказа</h2>
                        <button onClick={() => setView("pos")}
                                className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                            <p className="text-muted-foreground text-sm mb-1">К оплате</p>
                            <p className="text-4xl font-mono font-bold text-primary">{fmt(total)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {(["cash", "card"] as PaymentMethod[]).map(m => (
                                <button key={m} onClick={() => setPayMethod(m)}
                                        className={`flex items-center justify-center gap-2 h-14 rounded-xl border font-semibold transition-all ${payMethod === m ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:border-primary/50"}`}>
                                    {m === "cash" ? <Banknote className="w-5 h-5"/> : <CreditCard className="w-5 h-5"/>}
                                    {m === "cash" ? "Наличные" : "Карта"}
                                </button>
                            ))}
                        </div>
                        {payMethod === "cash" && (
                            <div className="space-y-3">
                                <div
                                    className="bg-secondary border border-border rounded-xl px-4 py-3 flex items-baseline justify-between">
                                    <span className="text-muted-foreground text-sm">Принято</span>
                                    <span className="font-mono text-2xl font-bold text-foreground">{fmt(cashNum)}</span>
                                </div>
                                <NumPad value={cashInput} onChange={setCashInput}/>
                                <div className="grid grid-cols-4 gap-2">
                                    {[500, 1000, 2000, 5000].map(a => (
                                        <button key={a} onClick={() => setCashInput(String(a))}
                                                className="h-9 bg-secondary hover:bg-muted border border-border rounded-lg text-sm font-mono font-semibold text-foreground transition-colors">{a}</button>
                                    ))}
                                </div>
                                {cashNum >= total && (
                                    <div
                                        className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 flex justify-between">
                                        <span className="text-accent font-medium">Сдача</span>
                                        <span className="font-mono text-xl font-bold text-accent">{fmt(change)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {payMethod === "card" && (
                            <div className="bg-secondary/50 border border-border rounded-xl p-6 text-center">
                                <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3"/>
                                <p className="text-foreground font-medium">Приложите или вставьте карту</p>
                                <p className="text-muted-foreground text-sm mt-1">Ожидание терминала...</p>
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Email
                                *</label>
                            <input value={email} onChange={e => {
                                setEmail(e.target.value);
                                setErrors(v => ({...v, email: ""}));
                            }}
                                   placeholder="Молоко Простоквашино 1л"
                                   className={`w-full h-11 bg-secondary border rounded-xl px-3 text-sm focus:outline-none transition-colors ${errors.name ? "border-destructive" : "border-border focus:border-primary/60"}`}/>
                            {errors.name && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                        </div>
                        <button onClick={handlePay}
                                disabled={(payMethod === "cash" && cashNum < total) || isPaying}
                                className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {isPaying
                                ? <><Loader2 className="w-5 h-5 animate-spin"/>Отправка в ОФД...</>
                                : payMethod === "cash"
                                    ? cashNum >= total ? `Принять — ${fmt(total)}` : `Не хватает ${fmt(total - cashNum)}`
                                    : `Оплата картой — ${fmt(total)}`}
                        </button>
                        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                            auth.isConnected ? "bg-primary/5 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground"
                        }`}>
                            {auth.isConnected ? <Wifi className="w-3.5 h-3.5 shrink-0"/> :
                                <WifiOff className="w-3.5 h-3.5 shrink-0"/>}
                            {auth.isConnected
                                ? "Ферма® v2.84 · чек будет фискализирован"
                                : "ОФД не подключён · чек сохраняется локально"}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── POS main screen ───────────────────────────────────────────────────────

    const CatalogPanel = () => (
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <div className="px-4 pt-4 pb-3 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                               placeholder="Поиск или штрихкод..."
                               className="w-full h-10 bg-secondary border border-border rounded-xl pl-9 pr-3 text-sm focus:outline-none focus:border-primary/60 transition-colors"/>
                    </div>
                    <button onClick={() => {
                        setEditingProduct(null);
                        setShowProductModal(true);
                    }}
                            className="h-10 px-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0">
                        <PackagePlus className="w-4 h-4"/>
                        <span className="hidden sm:inline text-sm">Товар</span>
                    </button>
                </div>

                {posStore.isLoadingProducts && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin"/>Загрузка товаров с сервера...
                    </div>
                )}
                {posStore.productsError && (
                    <div className="flex items-center gap-2 text-xs text-accent px-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>{posStore.productsError}
                    </div>
                )}
                {posStore.productsFromApi && (
                    <div className="flex items-center gap-2 text-xs text-primary px-1">
                        <Database className="w-3.5 h-3.5"/>Товары загружены с wfm.utitel.ru
                    </div>
                )}

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button onClick={() => setCategory("Все")}
                            className={`shrink-0 px-4 h-8 rounded-lg text-sm font-medium transition-all ${category === "Все" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
                        Все
                    </button>
                    {allCategories.map(c => (
                        <button key={c.id} onClick={() => setCategory(c.id)}
                                className={`shrink-0 px-4 h-8 rounded-lg text-sm font-medium transition-all ${category === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filtered.map(p => {
                        const inCart = posStore.cart.find(i => i.product.id === p.id);
                        return (
                            <div key={p.id}
                                 className={`relative text-left bg-card border rounded-xl p-3 transition-all group ${inCart ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            setEditingProduct(p);
                                            setShowProductModal(true);
                                        }}
                                        className="w-6 h-6 bg-secondary border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                        <Pencil className="w-3 h-3"/>
                                    </button>
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            posStore.deleteProduct(p.id);
                                        }}
                                        className="w-6 h-6 bg-secondary border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                                        <Trash className="w-3 h-3"/>
                                    </button>
                                </div>
                                {p.isMarked && (
                                    <span
                                        className="absolute top-2 left-2 flex items-center gap-0.5 bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                    <ShieldCheck className="w-2.5 h-2.5"/>М
                  </span>
                                )}
                                {inCart && (
                                    <span
                                        className="absolute bottom-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {inCart.qty}
                  </span>
                                )}
                                <button className="w-full text-left" onClick={() => posStore.addToCart(p)}>
                                    <div className="text-3xl mb-2 mt-1">{p.emoji}</div>
                                    <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{p.name}</p>
                                    <p className="text-primary font-mono font-bold text-sm mt-2">{fmt(p.price)}</p>
                                </button>
                            </div>
                        );
                    })}
                </div>
                {filtered.length === 0 && !posStore.isLoadingProducts && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Search className="w-10 h-10 mb-3 opacity-30"/>
                        <p>Товар не найден</p>
                        <button onClick={() => {
                            setEditingProduct(null);
                            setShowProductModal(true);
                        }}
                                className="mt-4 px-4 h-9 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4"/>Добавить новый
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const CartPanel = ({fullWidth = false}: { fullWidth?: boolean }) => (
        <div
            className={`flex flex-col ${fullWidth ? "flex-1" : "w-80 xl:w-96 shrink-0 border-l border-border"} bg-card`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-muted-foreground"/>
                    <span className="font-semibold text-foreground text-sm">Чек</span>
                    {cartCount > 0 && <span
						className="bg-primary/20 text-primary text-xs font-mono font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
                </div>
                {posStore.cart.length > 0 && (
                    <button onClick={() => posStore.clearCart()}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 className="w-4 h-4"/>
                    </button>
                )}
            </div>

            {missingCodes.length > 0 && (
                <div className="mx-3 mt-3 bg-accent/10 border border-accent/30 rounded-xl px-3 py-2.5 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5"/>
                    <div>
                        <p className="text-accent text-xs font-semibold">Требуются коды маркировки</p>
                        <p className="text-accent/80 text-xs mt-0.5">{missingCodes.map(i => i.product.name).join(", ")}</p>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {posStore.cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                        <ShoppingCart className="w-12 h-12 mb-3 opacity-20"/>
                        <p className="text-sm">Добавьте товары из каталога</p>
                    </div>
                ) : (
                    posStore.cart.map(item => {
                        const codesOk = !item.product.isMarked || item.markCodes.length >= item.qty;
                        const codesPartial = item.product.isMarked && item.markCodes.length > 0 && item.markCodes.length < item.qty;
                        return (
                            <div key={item.product.id}
                                 className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border transition-colors ${!codesOk ? "bg-accent/5 border-accent/20" : "bg-secondary border-transparent"}`}>
                                <span className="text-xl shrink-0 mt-0.5">{item.product.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                                        {item.product.isMarked && <ShieldCheck
											className={`w-3.5 h-3.5 shrink-0 ${codesOk ? "text-primary" : "text-accent"}`}/>}
                                    </div>
                                    <p className="text-xs font-mono text-muted-foreground">{fmt(item.product.price)} × {item.qty}</p>
                                    {item.product.isMarked && (
                                        <button onClick={() => setScanningProductId(item.product.id)}
                                                className={`mt-1.5 flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${codesOk ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-accent/15 text-accent hover:bg-accent/25"}`}>
                                            <ScanLine className="w-3 h-3"/>
                                            {codesOk ? `${item.markCodes.length}/${item.qty} ✓` : codesPartial ? `${item.markCodes.length}/${item.qty} — добавить` : "Сканировать коды"}
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <p className="text-sm font-mono font-bold text-foreground">{fmt(item.product.price * item.qty)}</p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => posStore.changeQty(item.product.id, -1)}
                                                className="w-6 h-6 rounded-md bg-muted hover:bg-border flex items-center justify-center transition-colors">
                                            <Minus className="w-3 h-3"/></button>
                                        <span className="w-6 text-center text-xs font-mono font-bold">{item.qty}</span>
                                        <button onClick={() => posStore.changeQty(item.product.id, 1)}
                                                className="w-6 h-6 rounded-md bg-muted hover:bg-border flex items-center justify-center transition-colors">
                                            <Plus className="w-3 h-3"/></button>
                                        <button onClick={() => posStore.removeFromCart(item.product.id)}
                                                className="w-6 h-6 rounded-md bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors ml-0.5">
                                            <X className="w-3 h-3 text-muted-foreground"/></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {posStore.cart.length > 0 && (
                <div className="px-4 pb-2">
                    <div className="flex gap-1.5">
                        {[0, 5, 10, 25, 30, 50].map(d => (
                            <button key={d} onClick={() => setDiscount(d)}
                                    className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${discount === d ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground border border-border hover:border-accent/50"}`}>
                                {d === 0 ? "—" : <><Tag className="w-2.5 h-2.5"/>{d}%</>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="border-t border-border px-4 py-4 space-y-2">
                {posStore.cart.length > 0 && (
                    <>
                        <div className="flex justify-between text-sm text-muted-foreground"><span>Товаров</span><span
                            className="font-mono">{fmt(subtotal)}</span></div>
                        {discount > 0 && <div className="flex justify-between text-sm text-accent">
							<span>Скидка {discount}%</span><span className="font-mono">− {fmt(discountAmt)}</span>
						</div>}
                        <div className="flex justify-between text-sm text-muted-foreground"><span>НДС 20%</span><span
                            className="font-mono">{fmt(tax)}</span></div>
                    </>
                )}
                <div className="flex justify-between items-baseline pt-1">
                    <span className="text-foreground font-bold">ИТОГО</span>
                    <span className="text-2xl font-mono font-bold text-primary">{fmt(total)}</span>
                </div>
                <button onClick={() => canPay && setView("payment")} disabled={!canPay}
                        className="w-full h-12 mt-1 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {missingCodes.length > 0 ? <><AlertTriangle className="w-4 h-4"/>Нужны коды
                        маркировки</> : <>Оплатить <ChevronRight className="w-5 h-5"/></>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Header */}
            <header
                className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-primary-foreground"/>
                    </div>
                    <div>
                        <p className="text-foreground font-bold text-sm leading-none">КассаPRO</p>
                        <p className="text-muted-foreground text-xs mt-0.5 font-mono hidden sm:block">
                            Смена №{posStore.currentShift?.number} · {posStore.currentShift?.cashier}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    {posAuth.user && (
                        <div
                            className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground">
                            <UserCircle className="w-3.5 h-3.5"/>
                            <span>{posAuth.user.name}</span>
                        </div>
                    )}

                    {/* Ферма® connection status */}
                    <button onClick={() => setShowOfdSettings(true)}
                            className={`hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                                auth.isConnected && auth.isTokenValid
                                    ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                                    : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                            }`}>
                        {auth.isLoading ? <Loader2 className="w-3 h-3 animate-spin"/>
                            : auth.isConnected && auth.isTokenValid ? <Zap className="w-3 h-3"/>
                                : <WifiOff className="w-3 h-3"/>}
                        <span className="hidden md:inline">Ферма</span>
                    </button>

                    <div className="text-right hidden sm:block">
                        <p className="text-muted-foreground text-xs">Выручка</p>
                        <p className="text-accent font-mono font-bold text-sm">{fmt(posStore.shiftRevenue)}</p>
                    </div>
                    <div className="w-px h-7 bg-border hidden sm:block"/>
                    <div className="text-right hidden xs:block">
                        <p className="text-muted-foreground text-xs">Чеков</p>
                        <p className="text-foreground font-mono font-bold text-sm">{posStore.completedReceipts.length}</p>
                    </div>
                    <div className="w-px h-7 bg-border"/>

                    {/* Settings (mobile) */}
                    <button onClick={() => setShowApiSettings(true)}
                            className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors">
                        <Settings className="w-4 h-4"/>
                    </button>

                    <button onClick={() => {
                        posStore.closeShift();
                        posAuth.logout();
                    }}
                            className="flex items-center gap-1.5 h-8 px-3 bg-secondary border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors">
                        <LogOut className="w-3.5 h-3.5"/>
                        <span className="hidden sm:inline">Выход</span>
                    </button>

                    <button onClick={() => setShowCloseModal(true)}
                            className="flex items-center gap-1.5 h-8 px-3 bg-secondary border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors">
                        <Lock className="w-3.5 h-3.5"/>
                        <span className="hidden sm:inline">Закрыть смену</span>
                    </button>
                </div>
            </header>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                <div className="hidden md:flex flex-1 overflow-hidden">
                    <CatalogPanel/>
                    <CartPanel/>
                </div>
                <div className="flex flex-col flex-1 overflow-hidden md:hidden">
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {mobileTab === "catalog" ? <CatalogPanel/> : <CartPanel fullWidth/>}
                    </div>
                    <div className="shrink-0 border-t border-border bg-card flex">
                        <button onClick={() => setMobileTab("catalog")}
                                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${mobileTab === "catalog" ? "text-primary" : "text-muted-foreground"}`}>
                            <LayoutGrid className="w-5 h-5"/>
                            <span className="text-xs font-medium">Каталог</span>
                        </button>
                        <button onClick={() => setMobileTab("cart")}
                                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-colors ${mobileTab === "cart" ? "text-primary" : "text-muted-foreground"}`}>
                            <div className="relative">
                                <ListOrdered className="w-5 h-5"/>
                                {cartCount > 0 && (
                                    <span
                                        className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">{cartCount}</span>
                                )}
                                {missingCodes.length > 0 && <span
									className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-card"/>}
                            </div>
                            <span className="text-xs font-medium">Чек{total > 0 ? ` · ${fmt(total)}` : ""}</span>
                        </button>
                        <button onClick={() => setShowOfdSettings(true)}
                                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${auth.isConnected && auth.isTokenValid ? "text-primary" : "text-muted-foreground"}`}>
                            <div className="relative">
                                <Zap className="w-5 h-5"/>
                                {auth.isConnected && auth.isTokenValid && (
                                    <span
                                        className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card"/>
                                )}
                            </div>
                            <span className="text-xs font-medium">Ферма</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showProductModal && (
                <ProductModal
                    existingCategories={posStore.productCategories}
                    initial={editingProduct ?? undefined}
                    onSave={(p) => {
                        if (editingProduct) {
                            posStore.updateProduct(editingProduct.id, p);
                        } else {
                            posStore.addProduct(p);
                        }
                        setEditingProduct(null);
                    }}
                    onClose={() => {
                        setShowProductModal(false);
                        setEditingProduct(null);
                    }}
                />
            )}

            {scanningItem && (
                <MarkScanModal
                    item={posStore.cart.find(i => i.product.id === scanningItem.product.id) ?? scanningItem}
                    onSave={(codes) => posStore.setMarkCodes(scanningItem.product.id, codes)}
                    onClose={() => setScanningProductId(null)}
                />
            )}

            {showCloseModal && posStore.currentShift && (
                <ShiftCloseModal
                    onClose={() => setShowCloseModal(false)}
                    onConfirm={() => {
                        const snap = {...posStore.currentShift!};
                        setClosedShiftSnap(snap);
                        posStore.closeShift();
                        setShowCloseModal(false);
                    }}
                />
            )}

            {showOfdSettings && <OfdSettingsModal onClose={() => setShowOfdSettings(false)}/>}
            {showApiSettings && <ApiSettingsModal onClose={() => setShowApiSettings(false)}/>}
        </div>
    );
});
