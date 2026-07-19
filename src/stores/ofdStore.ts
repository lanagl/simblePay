// Removed — OFD.ru Integration v1.71 store replaced by Ferma® API v2.84
export class OfdStore {
  isConnected = false;
  isConnecting = false;
  connectionError: string | null = null;
  config = { authToken: "", inn: "", baseUrl: "" };
  configValid = false;
  kktList: never[] = [];
  receipts: never[] = [];
  zReports: never[] = [];
  selectedKktRnm: string | null = null;
  isLoadingReceipts = false;
  isLoadingZReports = false;
  receiptsError: string | null = null;
  zReportsError: string | null = null;
  get incomeReceipts() { return []; }
  get returnReceipts() { return []; }
  setConfig(_: unknown) {}
  async testConnection() {}
}
