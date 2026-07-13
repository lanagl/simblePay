import { createContext, useContext } from "react";
import { PosAuthStore } from "./posAuthStore";
import { PosStore } from "./posStore";
import { ReceiptStore } from "./receiptStore";
import { MarkingStore } from "./markingStore";
import { OfdStore } from "./ofdStore";
// AuthStore (Ferma) kept for backward compat but superseded by OfdStore
import { AuthStore } from "./authStore";

export class RootStore {
  posAuth: PosAuthStore;   // POS user auth (MySQL backend)
  posStore: PosStore;      // Cart, products, shift
  receiptStore: ReceiptStore; // Local receipt history (Ferma-side, legacy)
  markingStore: MarkingStore; // Marking code checks
  ofdStore: OfdStore;         // OFD.ru Integration v1.71 — KKT monitoring, receipts, Z-reports
  auth: AuthStore;             // Ferma auth (legacy, kept for receipt sending)

  constructor() {
    this.posAuth = new PosAuthStore();
    this.auth = new AuthStore();
    this.receiptStore = new ReceiptStore(this.auth);
    this.markingStore = new MarkingStore(this.auth);
    this.posStore = new PosStore(this.auth, this.receiptStore);
    this.ofdStore = new OfdStore();
  }
}

export const rootStore = new RootStore();
export const StoreContext = createContext<RootStore>(rootStore);

export function useStore(): RootStore {
  return useContext(StoreContext);
}
