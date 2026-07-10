import { createContext, useContext } from "react";
import { AuthStore } from "./authStore";
import { ReceiptStore } from "./receiptStore";
import { MarkingStore } from "./markingStore";
import { PosStore } from "./posStore";
import { PosAuthStore } from "./posAuthStore";

export class RootStore {
  posAuth: PosAuthStore;   // POS user authentication (MySQL backend)
  auth: AuthStore;          // OFD Ferma® authentication
  receiptStore: ReceiptStore;
  markingStore: MarkingStore;
  posStore: PosStore;

  constructor() {
    this.posAuth = new PosAuthStore();
    this.auth = new AuthStore();
    this.receiptStore = new ReceiptStore(this.auth);
    this.markingStore = new MarkingStore(this.auth);
    this.posStore = new PosStore(this.auth, this.receiptStore);
  }
}

export const rootStore = new RootStore();
export const StoreContext = createContext<RootStore>(rootStore);

export function useStore(): RootStore {
  return useContext(StoreContext);
}
