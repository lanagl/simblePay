import {makeAutoObservable, runInAction} from "mobx";
import type {AuthStore} from "./authStore";
import type {ReceiptStore} from "./receiptStore";
import type {PaymentSumType, ReceiptRequest, VatType} from "../api/fermaApi";
import wfmApi, {WfmCategory, WfmProduct} from "../api/wfmApi";
import {PosAuthStore} from "./posAuthStore.ts";

export interface Product {
    id: number;
    name: string;
    price: number;
    emoji: string;
    category?: number;
    barcode: string;
    isMarked: boolean;
}

export interface CartItem {
    product: Product;
    qty: number;
    markCodes: string[];
}

export type PaymentMethod = "cash" | "card" | "mixed";
export type ShiftState = "closed" | "open" | "closing";

export interface Shift {
    number: number;
    cashier: string;
    openTime: string;
    openCash: number;
    receiptCount: number;
    totalCash: number;
    totalCard: number;
}

export interface CompletedReceipt {
    id: string;
    items: CartItem[];
    total: number;
    paymentMethod: PaymentMethod;
    cashPaid: number;
    cardPaid: number;
    change: number;
    time: string;
    fermaReceiptId?: string;
}

function generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function nowStr(): string {
    return new Date().toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function mapWfmProduct(p: WfmProduct): Product {
    return {
        id: p.id,
        name: p.name,
        price: p.price,
        emoji: p.emoji ?? "📦",
        category: p.category,
        barcode: p.barcode ?? "",
        isMarked: p.is_marked ?? false,
    };
}

export class PosStore {
    private auth: AuthStore;
    private receiptSvc: ReceiptStore;
    private posAuth: PosAuthStore;

    products: Product[] = [];
    categories: WfmCategory[] = [];
    isLoadingProducts = false;
    productsFromApi = false;
    productsError: string | null = null;

    cart: CartItem[] = [];
    shiftState: ShiftState = "closed";
    currentShift: Shift | null = null;
    shiftNumber = 411;
    completedReceipts: CompletedReceipt[] = [];
    isSendingToOfd = false;
    lastOfdError: string | null = null;

    constructor(auth: AuthStore, receiptSvc: ReceiptStore, posAuth: PosAuthStore) {
        this.auth = auth;
        this.receiptSvc = receiptSvc;
        this.posAuth = posAuth;
        makeAutoObservable(this);
    }

    // — Catalog —

    get productCategories(): WfmCategory[] {
        if (this.categories.length > 0) {
            // Merge API categories with product categories, maintaining API order
            const apiNames = this.categories.map(c => c);
            return [...apiNames];
        }
        return [];
    }

    async loadProducts(): Promise<void> {
        const {token} = this.posAuth;
        runInAction(() => {
            this.isLoadingProducts = true;
            this.productsError = null;
        });
        try {
            const [wfmProducts, wfmCategories] = await Promise.all([
                wfmApi.getProducts(token ?? ""),
                wfmApi.getCategories(token ?? ""),
            ]);
            runInAction(() => {
                if (wfmProducts.length > 0) {
                    this.products = wfmProducts.map(mapWfmProduct);
                    this.productsFromApi = true;
                }
                if (wfmCategories.length > 0) {
                    this.categories = wfmCategories.map(c => c);
                }
                this.isLoadingProducts = false;
            });
        } catch {
            runInAction(() => {
                this.productsError = "Не удалось загрузить товары с сервера, используются демо-данные";
                this.productsFromApi = false;
                this.isLoadingProducts = false;
            });
        }
    }

    async addProduct(p: Omit<Product, "id">): void {
        const {token} = this.posAuth;
        try {
            //await wfmApi.setProducts(token ?? "", p);
            runInAction(() => {
                const id = Math.max(0, ...this.products.map((pr) => pr.id)) + 1;
                this.products.push({...p, id});
            });
        } catch {
            runInAction(() => {
                this.productsError = "Не удалось сохранить товар";
            });
        }

    }

    updateProduct(id: number, patch: Partial<Omit<Product, "id">>): void {
        runInAction(() => {
            const idx = this.products.findIndex((p) => p.id === id);
            if (idx >= 0) this.products[idx] = {...this.products[idx], ...patch};
        });
    }

    deleteProduct(id: number): void {
        runInAction(() => {
            this.products = this.products.filter((p) => p.id !== id);
            this.cart = this.cart.filter((i) => i.product.id !== id);
        });
    }

    // — Cart —

    get cartTotal(): number {
        return this.cart.reduce((s, i) => s + i.product.price * i.qty, 0);
    }

    get cartItemCount(): number {
        return this.cart.reduce((s, i) => s + i.qty, 0);
    }

    get missingMarkCodes(): CartItem[] {
        return this.cart.filter((i) => i.product.isMarked && i.markCodes.length < i.qty);
    }

    get canPay(): boolean {
        return this.cart.length > 0 && this.missingMarkCodes.length === 0;
    }

    addToCart(product: Product) {
        const existing = this.cart.find((i) => i.product.id === product.id);
        if (existing) {
            existing.qty += 1;
        } else {
            this.cart.push({product, qty: 1, markCodes: []});
        }
    }

    removeFromCart(productId: number) {
        const idx = this.cart.findIndex((i) => i.product.id === productId);
        if (idx >= 0) this.cart.splice(idx, 1);
    }

    changeQty(productId: number, delta: number) {
        const item = this.cart.find((i) => i.product.id === productId);
        if (!item) return;
        const newQty = item.qty + delta;
        if (newQty <= 0) {
            this.removeFromCart(productId);
        } else {
            item.qty = newQty;
            if (item.markCodes.length > newQty) item.markCodes = item.markCodes.slice(0, newQty);
        }
    }

    setMarkCodes(productId: number, codes: string[]) {
        const item = this.cart.find((i) => i.product.id === productId);
        if (item) item.markCodes = codes;
    }

    clearCart() {
        this.cart = [];
    }

    // — Shift —

    openShift(cashier: string, openingCash: number) {
        this.shiftNumber += 1;
        this.currentShift = {
            number: this.shiftNumber,
            cashier,
            openTime: nowStr(),
            openCash: openingCash,
            receiptCount: 0,
            totalCash: 0,
            totalCard: 0,
        };
        this.completedReceipts = [];
        this.shiftState = "open";
    }

    closeShift() {
        this.shiftState = "closing";
    }

    startNewShift() {
        this.currentShift = null;
        this.shiftState = "closed";
    }

    // — Payment —

    get shiftRevenue(): number {
        return this.completedReceipts.reduce((s, r) => s + r.total, 0);
    }

    async processPayment(
        method: PaymentMethod,
        cashPaid: number,
        cardPaid: number,
        customerEmail?: string
    ): Promise<CompletedReceipt | null> {
        if (!this.currentShift || !this.canPay) return null;

        const total = this.cartTotal;
        const change = method === "cash" ? cashPaid - total : 0;
        const receiptId = generateId();

        const receipt: CompletedReceipt = {
            id: receiptId,
            items: this.cart.map((i) => ({...i, markCodes: [...i.markCodes]})),
            total,
            paymentMethod: method,
            cashPaid,
            cardPaid,
            change,
            time: nowStr(),
        };

        runInAction(() => {
            this.isSendingToOfd = true;
            this.lastOfdError = null;
        });

        try {
            const fermaReq = this.buildFermaRequest(receipt, customerEmail);
            const sent = await this.receiptSvc.sendReceipt(fermaReq);
            runInAction(() => {
                if (sent) {
                    receipt.fermaReceiptId = sent.receiptId;
                } else {
                    this.lastOfdError = this.receiptSvc.error ?? "Ошибка ОФД";
                }
            });
        } catch {
            runInAction(() => {
                this.lastOfdError = "Не удалось отправить чек в ОФД";
            });
        }

        runInAction(() => {
            this.isSendingToOfd = false;
            this.completedReceipts.push(receipt);
            this.currentShift!.receiptCount += 1;
            if (method === "cash" || method === "mixed") this.currentShift!.totalCash += cashPaid;
            if (method === "card" || method === "mixed") this.currentShift!.totalCard += cardPaid;
            this.cart = [];
        });

        return receipt;
    }

    private buildFermaRequest(receipt: CompletedReceipt, customerEmail?: string): ReceiptRequest {
        const shift = this.currentShift!;

        const items = receipt.items.flatMap((ci) => {
            const base = {
                Label: ci.product.name,
                Price: ci.product.price,
                Quantity: ci.qty,
                Amount: ci.product.price * ci.qty,
                Vat: "VatNo" as VatType,
                Measure: "PIECE" as const,
                PaymentMethod: 4,
            };

            if (ci.product.isMarked && ci.markCodes.length > 0) {
                return ci.markCodes.map((code) => ({
                    ...base,
                    Quantity: 1,
                    Amount: ci.product.price,
                    MarkingCodeData: {
                        Type: "UNKNOWN_PRODUCT_CODE" as const,
                        Code: code,
                        PlannedStatus: "PIECE_PRODUCT_INCOME" as const,
                    },
                }));
            }
            return [base];
        });

        const paymentItems: Array<{ PaymentType: PaymentSumType; Sum: number }> = [];
        if (receipt.paymentMethod === "cash") {
            paymentItems.push({PaymentType: 0, Sum: receipt.total});
        } else if (receipt.paymentMethod === "card") {
            paymentItems.push({PaymentType: 1, Sum: receipt.total});
        } else {
            if (receipt.cashPaid > 0) paymentItems.push({PaymentType: 0, Sum: receipt.cashPaid});
            if (receipt.cardPaid > 0) paymentItems.push({PaymentType: 1, Sum: receipt.cardPaid});
        }

        return {
            Inn: this.auth.inn,
            Type: "Income",
            InvoiceId: receipt.id,
            CustomerReceipt: {
                TaxationSystem: this.auth.taxationSystem ?? "Common",
                Email: customerEmail,
                Items: items,
                PaymentItems: paymentItems,
            },
            Cashier: {Name: this.auth.cashierName || shift.cashier},
        };
    }
}
