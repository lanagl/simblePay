import { makeAutoObservable, runInAction } from "mobx";
import type { AuthStore } from "./authStore";
import type { ReceiptStore } from "./receiptStore";
import type { ReceiptRequest, VatType } from "../api/fermaApi";
import posApi, { ApiProduct } from "../api/posApi";

export interface Product {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category: string;
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

const INITIAL_PRODUCTS: Product[] = [
  { id: 1,  name: "Кока-Кола 0.5л",       price: 89,  category: "Напитки",  emoji: "🥤", barcode: "4607134302541", isMarked: false },
  { id: 2,  name: "Вода Bon Aqua",         price: 55,  category: "Напитки",  emoji: "💧", barcode: "4670005030012", isMarked: false },
  { id: 3,  name: "Сок Добрый апельсин",   price: 72,  category: "Напитки",  emoji: "🍊", barcode: "4660046312408", isMarked: false },
  { id: 4,  name: "Энергетик Red Bull",    price: 175, category: "Напитки",  emoji: "⚡", barcode: "9002490100070", isMarked: false },
  { id: 5,  name: "Кофе Nescafé 3в1",     price: 42,  category: "Напитки",  emoji: "☕", barcode: "7613036960748", isMarked: false },
  { id: 6,  name: "Булочка с маком",       price: 38,  category: "Выпечка",  emoji: "🥐", barcode: "4601767122349", isMarked: false },
  { id: 7,  name: "Круассан масляный",     price: 65,  category: "Выпечка",  emoji: "🥖", barcode: "4607134302558", isMarked: false },
  { id: 8,  name: "Пирожок с капустой",    price: 45,  category: "Выпечка",  emoji: "🫓", barcode: "4670001210236", isMarked: false },
  { id: 9,  name: "Молоко Простоквашино",  price: 89,  category: "Молочные", emoji: "🥛", barcode: "4607014220152", isMarked: true  },
  { id: 10, name: "Кефир 1%",             price: 65,  category: "Молочные", emoji: "🍶", barcode: "4670003251023", isMarked: true  },
  { id: 11, name: "Сыр Российский 200г",  price: 185, category: "Молочные", emoji: "🧀", barcode: "4607014220169", isMarked: true  },
  { id: 12, name: "Йогурт Активиа",       price: 79,  category: "Молочные", emoji: "🫙", barcode: "7622210721044", isMarked: true  },
  { id: 13, name: "Чипсы Lay's 150г",     price: 115, category: "Снеки",    emoji: "🥔", barcode: "5900259064416", isMarked: false },
  { id: 14, name: "Шоколад Milka 90г",    price: 142, category: "Снеки",    emoji: "🍫", barcode: "7622210721051", isMarked: false },
  { id: 15, name: "Орешки к пиву",        price: 58,  category: "Снеки",    emoji: "🥜", barcode: "4670005040110", isMarked: false },
  { id: 16, name: "Сигареты Winston",     price: 245, category: "Табак",    emoji: "🚬", barcode: "5000169041613", isMarked: true  },
  { id: 17, name: "Сигареты Marlboro",    price: 260, category: "Табак",    emoji: "🚬", barcode: "5000169041620", isMarked: true  },
  { id: 18, name: "Зажигалка BIC",        price: 89,  category: "Снеки",    emoji: "🔥", barcode: "3501170512040", isMarked: false },
];

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

export class PosStore {
  private auth: AuthStore;
  private receiptSvc: ReceiptStore;

  products: Product[] = INITIAL_PRODUCTS;
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

  constructor(auth: AuthStore, receiptSvc: ReceiptStore) {
    this.auth = auth;
    this.receiptSvc = receiptSvc;
    makeAutoObservable(this);
  }

  // — Catalog (API) —

  get categories(): string[] {
    return Array.from(new Set(this.products.map((p) => p.category)));
  }

  private fromApi(p: ApiProduct): Product {
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      emoji: p.emoji,
      category: p.category,
      barcode: p.barcode,
      isMarked: p.is_marked,
    };
  }

  private toApi(p: Omit<Product, "id">): Omit<ApiProduct, "id"> {
    return {
      name: p.name,
      price: p.price,
      emoji: p.emoji,
      category: p.category,
      barcode: p.barcode,
      is_marked: p.isMarked,
    };
  }

  async loadProducts(token: string): Promise<void> {
    runInAction(() => {
      this.isLoadingProducts = true;
      this.productsError = null;
    });
    try {
      const apiProducts = await posApi.getProducts(token);
      runInAction(() => {
        this.products = apiProducts.map((p) => this.fromApi(p));
        this.productsFromApi = true;
        this.isLoadingProducts = false;
      });
    } catch {
      runInAction(() => {
        this.productsError = "Не удалось загрузить товары из БД, используются локальные данные";
        this.productsFromApi = false;
        this.isLoadingProducts = false;
      });
    }
  }

  async addProduct(p: Omit<Product, "id">, token?: string | null): Promise<void> {
    if (token) {
      try {
        const created = await posApi.createProduct(token, this.toApi(p));
        runInAction(() => { this.products.push(this.fromApi(created)); });
        return;
      } catch { /* fall through to local */ }
    }
    // Offline fallback
    runInAction(() => {
      const id = Math.max(0, ...this.products.map((p) => p.id)) + 1;
      this.products.push({ ...p, id });
    });
  }

  async updateProduct(id: number, patch: Partial<Omit<Product, "id">>, token?: string | null): Promise<void> {
    if (token) {
      try {
        const apiPatch: Partial<Omit<ApiProduct, "id">> = {};
        if (patch.name !== undefined) apiPatch.name = patch.name;
        if (patch.price !== undefined) apiPatch.price = patch.price;
        if (patch.emoji !== undefined) apiPatch.emoji = patch.emoji;
        if (patch.category !== undefined) apiPatch.category = patch.category;
        if (patch.barcode !== undefined) apiPatch.barcode = patch.barcode;
        if (patch.isMarked !== undefined) apiPatch.is_marked = patch.isMarked;
        const updated = await posApi.updateProduct(token, id, apiPatch);
        runInAction(() => {
          const idx = this.products.findIndex((p) => p.id === id);
          if (idx >= 0) this.products[idx] = this.fromApi(updated);
        });
        return;
      } catch { /* fall through to local */ }
    }
    runInAction(() => {
      const idx = this.products.findIndex((p) => p.id === id);
      if (idx >= 0) this.products[idx] = { ...this.products[idx], ...patch };
    });
  }

  async deleteProduct(id: number, token?: string | null): Promise<void> {
    if (token) {
      try {
        await posApi.deleteProduct(token, id);
      } catch { /* fall through to local */ }
    }
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
      this.cart.push({ product, qty: 1, markCodes: [] });
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
      if (item.markCodes.length > newQty) {
        item.markCodes = item.markCodes.slice(0, newQty);
      }
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
      items: this.cart.map((i) => ({ ...i, markCodes: [...i.markCodes] })),
      total,
      paymentMethod: method,
      cashPaid,
      cardPaid,
      change,
      time: nowStr(),
    };

    // Try to send to OFD Ferma
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
      if (method === "cash" || method === "mixed") {
        this.currentShift!.totalCash += cashPaid;
      }
      if (method === "card" || method === "mixed") {
        this.currentShift!.totalCard += cardPaid;
      }
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
        Vat: "Vat20" as VatType,
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

    const paymentItems: Array<{ PaymentType: number; Sum: number }> = [];
    if (receipt.paymentMethod === "cash") {
      paymentItems.push({ PaymentType: 0, Sum: receipt.total });
    } else if (receipt.paymentMethod === "card") {
      paymentItems.push({ PaymentType: 1, Sum: receipt.total });
    } else {
      if (receipt.cashPaid > 0) paymentItems.push({ PaymentType: 0, Sum: receipt.cashPaid });
      if (receipt.cardPaid > 0) paymentItems.push({ PaymentType: 1, Sum: receipt.cardPaid });
    }

    return {
      Inn: this.auth.inn,
      Type: "Income",
      InvoiceId: receipt.id,
      CustomerReceipt: {
        TaxationSystem: "Common",
        Email: customerEmail,
        Items: items,
        PaymentItems: paymentItems,
      },
      Cashier: { Name: shift.cashier },
    };
  }
}
