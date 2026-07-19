import {createContext, useContext} from "react";
import {PosAuthStore} from "./posAuthStore";
import {PosStore} from "./posStore";
import {ReceiptStore} from "./receiptStore";
import {MarkingStore} from "./markingStore";
import {AuthStore} from "./authStore";

export class RootStore {
    posAuth: PosAuthStore;   // POS user auth
    posStore: PosStore;      // Cart, products (WFM), shift
    receiptStore: ReceiptStore;
    markingStore: MarkingStore;
    auth: AuthStore;         // Ferma® API v2.84 credentials

    constructor() {
        this.posAuth = new PosAuthStore();
        this.auth = new AuthStore();
        this.receiptStore = new ReceiptStore(this.auth);
        this.markingStore = new MarkingStore(this.auth);
        this.posStore = new PosStore(this.auth, this.receiptStore, this.posAuth);
    }
}

export const rootStore = new RootStore();
export const StoreContext = createContext<RootStore>(rootStore);

export function useStore(): RootStore {
    return useContext(StoreContext);
}
