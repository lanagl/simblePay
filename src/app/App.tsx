import { useState, useCallback, useRef, useEffect } from "react";
import {
  ShoppingCart, X, Plus, Minus, CreditCard, Banknote, Trash2, Search,
  ChevronRight, CheckCircle2, Receipt, Tag, PackagePlus, ChevronDown,
  LayoutGrid, ListOrdered, ScanLine, ShieldCheck, AlertTriangle, Info,
  CheckCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  emoji: string;
  barcode: string;
  isMarked: boolean;
}

interface CartItem extends Product {
  qty: number;
  markCodes: string[]; // one code per unit
}

type PaymentMethod = "cash" | "card";
type AppView = "pos" | "payment" | "receipt";
type MobileTab = "catalog" | "cart";

// ─── Data ────────────────────────────────────────────────────────────────────

const PRESET_CATEGORIES = ["Напитки", "Выпечка", "Молочные", "Снеки", "Табак"];
const PRESET_EMOJIS = ["🥤","💧","🍊","⚡","☕","🥐","🥖","🫓","🥛","🍶","🧀","🫙","🥔","🍫","🥜","🚬","🔥","🍕","🍔","🌮","🍱","🥗","🍰","🍩","🍬","🧃","🍺","🫖","🧴","🪥","📦","🛒"];

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

const TAX_RATE = 0.20;

const fmt = (n: number) =>
  n.toLocaleString("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2 });

const nowStr = () =>
  new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Generates a plausible-looking DataMatrix mark code
const genDemoCode = (barcode: string) => {
  const rnd = Math.random().toString(36).slice(2, 12).toUpperCase();
  return `010${barcode}21${rnd}`;
};

let nextId = INITIAL_PRODUCTS.length + 1;

// ─── NumPad ───────────────────────────────────────────────────────────────────

function NumPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const keys = ["7","8","9","4","5","6","1","2","3","00","0","⌫"];
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

// ─── Mark Code Scanner Modal ──────────────────────────────────────────────────

interface MarkScanModalProps {
  item: CartItem;
  onSave: (codes: string[]) => void;
  onClose: () => void;
}

function MarkScanModal({ item, onSave, onClose }: MarkScanModalProps) {
  const [codes, setCodes] = useState<string[]>([...item.markCodes]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // How many codes are still needed
  const needed = item.qty - codes.length;

  const addCode = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    if (code.length < 10) { setError("Код слишком короткий"); return; }
    if (codes.includes(code)) { setError("Этот код уже добавлен"); return; }
    if (codes.length >= item.qty) { setError("Все коды уже отсканированы"); return; }
    setCodes(c => [...c, code]);
    setInput("");
    setError("");
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addCode(input);
  };

  const simulateScan = () => {
    const code = genDemoCode(item.barcode);
    addCode(code);
  };

  const removeCode = (i: number) => setCodes(c => c.filter((_, idx) => idx !== i));

  const allDone = codes.length >= item.qty;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-card border border-border sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-foreground text-sm leading-none">Коды маркировки</h2>
              <p className="text-muted-foreground text-xs mt-0.5">{item.emoji} {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Progress */}
          <div className={`rounded-xl p-3 flex items-center gap-3 ${allDone ? "bg-primary/10 border border-primary/20" : "bg-accent/10 border border-accent/20"}`}>
            {allDone
              ? <CheckCheck className="w-5 h-5 text-primary shrink-0" />
              : <AlertTriangle className="w-5 h-5 text-accent shrink-0" />}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${allDone ? "text-primary" : "text-accent"}`}>
                {allDone ? "Все коды отсканированы" : `Осталось отсканировать: ${needed} из ${item.qty}`}
              </p>
              <div className="flex gap-1 mt-1.5">
                {Array.from({ length: item.qty }).map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full ${i < codes.length ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Input */}
          {!allDone && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wide block">
                Сканируйте или введите код DataMatrix
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(""); }}
                  onKeyDown={handleKey}
                  placeholder="010xxxxxxxxxxxxxxx21xxxxxxxxxx"
                  className={`flex-1 h-11 bg-secondary border rounded-xl px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors
                    ${error ? "border-destructive" : "border-border focus:border-primary/60"}`}
                />
                <button onClick={() => addCode(input)}
                  disabled={!input.trim()}
                  className="h-11 px-4 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-30">
                  Добавить
                </button>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <button onClick={simulateScan}
                className="w-full h-10 bg-secondary border border-dashed border-primary/40 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                <ScanLine className="w-4 h-4" />
                Симулировать сканирование
              </button>
            </div>
          )}

          {/* Scanned codes list */}
          {codes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Отсканированные коды</p>
              {codes.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1 text-xs font-mono text-foreground truncate">{c}</span>
                  <button onClick={() => removeCode(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="flex gap-2 bg-muted rounded-xl p-3">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Код маркировки — уникальный DataMatrix на упаковке каждого товара. Требуется для передачи в систему «Честный знак».
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-12 bg-secondary border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors">
            Отмена
          </button>
          <button
            onClick={() => { onSave(codes); onClose(); }}
            className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <CheckCheck className="w-4 h-4" />
            Сохранить {codes.length > 0 && `(${codes.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Product Modal ────────────────────────────────────────────────────────

interface AddProductModalProps {
  existingCategories: string[];
  onAdd: (p: Omit<Product, "id">) => void;
  onClose: () => void;
}

function AddProductModal({ existingCategories, onAdd, onClose }: AddProductModalProps) {
  const allCats = Array.from(new Set([...PRESET_CATEGORIES, ...existingCategories]));
  const [name, setName] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [category, setCategory] = useState(allCats[0]);
  const [customCat, setCustomCat] = useState("");
  const [useCustomCat, setUseCustomCat] = useState(false);
  const [emoji, setEmoji] = useState("📦");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [isMarked, setIsMarked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Введите название";
    const p = parseFloat(priceStr.replace(",", "."));
    if (!priceStr || isNaN(p) || p <= 0) e.price = "Введите корректную цену";
    if (useCustomCat && !customCat.trim()) e.category = "Введите категорию";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onAdd({
      name: name.trim(),
      price: Math.round(parseFloat(priceStr.replace(",", ".")) * 100) / 100,
      category: useCustomCat ? customCat.trim() : category,
      emoji,
      barcode: barcode.trim() || String(Date.now()),
      isMarked,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-card border border-border sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Добавить товар</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Emoji */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Иконка</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowEmojiPicker(v => !v)}
                className="w-14 h-14 bg-secondary border border-border rounded-xl text-3xl flex items-center justify-center hover:border-primary/50 transition-colors">
                {emoji}
              </button>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <span>Нажмите для выбора</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            {showEmojiPicker && (
              <div className="mt-2 bg-secondary border border-border rounded-xl p-3 grid grid-cols-8 gap-1">
                {PRESET_EMOJIS.map(e => (
                  <button key={e} onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                    className={`w-9 h-9 text-xl rounded-lg flex items-center justify-center transition-colors
                      ${emoji === e ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted"}`}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Название *</label>
            <input value={name}
              onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: "" })); }}
              placeholder="Например: Молоко Простоквашино 1л"
              className={`w-full h-11 bg-secondary border rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors
                ${errors.name ? "border-destructive" : "border-border focus:border-primary/60"}`} />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Price */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Цена, ₽ *</label>
            <input value={priceStr}
              onChange={e => { setPriceStr(e.target.value); setErrors(v => ({ ...v, price: "" })); }}
              inputMode="decimal" placeholder="0.00"
              className={`w-full h-11 bg-secondary border rounded-xl px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors
                ${errors.price ? "border-destructive" : "border-border focus:border-primary/60"}`} />
            {errors.price && <p className="text-destructive text-xs mt-1">{errors.price}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Категория *</label>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setUseCustomCat(false)}
                className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors
                  ${!useCustomCat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground border border-border hover:text-foreground"}`}>
                Выбрать
              </button>
              <button onClick={() => setUseCustomCat(true)}
                className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors
                  ${useCustomCat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground border border-border hover:text-foreground"}`}>
                Новая
              </button>
            </div>
            {!useCustomCat ? (
              <div className="grid grid-cols-3 gap-2">
                {allCats.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`h-9 rounded-lg text-sm font-medium transition-colors truncate px-2
                      ${category === c ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border hover:text-foreground"}`}>
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input value={customCat}
                  onChange={e => { setCustomCat(e.target.value); setErrors(v => ({ ...v, category: "" })); }}
                  placeholder="Название категории"
                  className={`w-full h-11 bg-secondary border rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors
                    ${errors.category ? "border-destructive" : "border-border focus:border-primary/60"}`} />
                {errors.category && <p className="text-destructive text-xs mt-1">{errors.category}</p>}
              </>
            )}
          </div>

          {/* Barcode */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Штрихкод <span className="normal-case">(необязательно)</span></label>
            <input value={barcode} onChange={e => setBarcode(e.target.value)} inputMode="numeric"
              placeholder="Введите или отсканируйте"
              className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors" />
          </div>

          {/* Marking toggle */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Маркировка</label>
            <button onClick={() => setIsMarked(v => !v)}
              className={`w-full h-12 rounded-xl border font-semibold text-sm flex items-center gap-3 px-4 transition-all
                ${isMarked ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
              <ShieldCheck className="w-5 h-5" />
              <div className="flex-1 text-left">
                <span>{isMarked ? "Товар подлежит маркировке" : "Маркировка не требуется"}</span>
                {isMarked && <p className="text-xs font-normal text-primary/70">При продаже нужно сканировать DataMatrix</p>}
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${isMarked ? "bg-primary" : "bg-border"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isMarked ? "left-5" : "left-1"}`} />
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
            <Plus className="w-4 h-4" />Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function App() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<AppView>("pos");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("0");
  const [receiptData, setReceiptData] = useState<{
    items: CartItem[]; total: number; cash: number; change: number; method: PaymentMethod; time: string;
  } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>("catalog");
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanningItem, setScanningItem] = useState<CartItem | null>(null);

  const allCategories = ["Все", ...Array.from(new Set(products.map(p => p.category)))];

  // Cart logic
  const addToCart = useCallback((p: Product) => {
    setCart(c => {
      const ex = c.find(i => i.id === p.id);
      return ex
        ? c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
        : [...c, { ...p, qty: 1, markCodes: [] }];
    });
  }, []);

  const updateQty = useCallback((id: number, delta: number) => {
    setCart(c => c.flatMap(i => {
      if (i.id !== id) return [i];
      const newQty = i.qty + delta;
      if (newQty <= 0) return [];
      // trim codes if reducing qty
      return [{ ...i, qty: newQty, markCodes: i.markCodes.slice(0, newQty) }];
    }));
  }, []);

  const removeItem = useCallback((id: number) => setCart(c => c.filter(i => i.id !== id)), []);
  const clearCart = () => { setCart([]); setDiscount(0); };

  const saveMarkCodes = (id: number, codes: string[]) => {
    setCart(c => c.map(i => i.id === id ? { ...i, markCodes: codes } : i));
  };

  const handleAddProduct = (p: Omit<Product, "id">) => {
    setProducts(prev => [...prev, { ...p, id: nextId++ }]);
    if (category !== "Все" && category !== p.category) setCategory(p.category);
  };

  // Totals
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(subtotal * discount / 100);
  const taxable = subtotal - discountAmt;
  const tax = Math.round(taxable * TAX_RATE);
  const total = taxable;
  const cashNum = parseInt(cashInput) || 0;
  const change = cashNum - total;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Check if all marked items have codes
  const missingCodes = cart.filter(i => i.isMarked && i.markCodes.length < i.qty);
  const canPay = cart.length > 0 && missingCodes.length === 0;

  const filtered = products.filter(p =>
    (category === "Все" || p.category === category) &&
    (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search))
  );

  const handlePay = () => {
    if (!canPay) return;
    if (payMethod === "cash" && cashNum < total) return;
    setReceiptData({ items: [...cart], total, cash: cashNum, change: payMethod === "cash" ? change : 0, method: payMethod, time: nowStr() });
    setView("receipt");
    clearCart();
    setCashInput("0");
  };

  // ── Receipt ───────────────────────────────────────────────────────────────
  if (view === "receipt" && receiptData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="bg-primary/10 border-b border-border p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground">Оплата прошла</h2>
              <p className="text-muted-foreground text-sm mt-1">{receiptData.time}</p>
            </div>
            <div className="p-5 space-y-2">
              {receiptData.items.map(i => (
                <div key={i.id}>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground flex items-center gap-1.5">
                      {i.isMarked && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                      {i.name} <span className="text-muted-foreground">×{i.qty}</span>
                    </span>
                    <span className="font-mono font-semibold text-foreground">{fmt(i.price * i.qty)}</span>
                  </div>
                  {i.isMarked && i.markCodes.map((c, idx) => (
                    <p key={idx} className="text-xs font-mono text-muted-foreground pl-5 mt-0.5 truncate">↳ {c}</p>
                  ))}
                </div>
              ))}
            </div>
            <div className="border-t border-border mx-5" />
            <div className="p-5 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>НДС 20%</span>
                <span className="font-mono">{fmt(Math.round(receiptData.total * TAX_RATE / (1 + TAX_RATE)))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>ИТОГО</span>
                <span className="font-mono text-primary">{fmt(receiptData.total)}</span>
              </div>
              {receiptData.method === "cash" && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Наличные</span><span className="font-mono">{fmt(receiptData.cash)}</span>
                  </div>
                  <div className="flex justify-between text-accent font-semibold">
                    <span>Сдача</span><span className="font-mono">{fmt(receiptData.change)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-muted-foreground text-xs pt-1">
                <span>Способ оплаты</span>
                <span>{receiptData.method === "cash" ? "Наличные" : "Карта"}</span>
              </div>
            </div>
            <div className="p-5 pt-0">
              <button onClick={() => { setView("pos"); setMobileTab("catalog"); }}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
                Новый чек
              </button>
            </div>
          </div>
          <p className="text-center text-muted-foreground text-xs mt-4 font-mono">
            ООО «РОМАШКА» • ИНН 7701234567 • ФН 9999078900012345
          </p>
        </div>
      </div>
    );
  }

  // ── Payment ───────────────────────────────────────────────────────────────
  if (view === "payment") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Оплата заказа</h2>
            <button onClick={() => setView("pos")} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
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
                  className={`flex items-center justify-center gap-2 h-14 rounded-xl border font-semibold transition-all
                    ${payMethod === m ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-foreground border-border hover:border-primary/50"}`}>
                  {m === "cash" ? <Banknote className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  {m === "cash" ? "Наличные" : "Карта"}
                </button>
              ))}
            </div>
            {payMethod === "cash" && (
              <div className="space-y-3">
                <div className="bg-secondary border border-border rounded-xl px-4 py-3 flex items-baseline justify-between">
                  <span className="text-muted-foreground text-sm">Принято</span>
                  <span className="font-mono text-2xl font-bold text-foreground">{fmt(parseInt(cashInput) || 0)}</span>
                </div>
                <NumPad value={cashInput} onChange={setCashInput} />
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map(a => (
                    <button key={a} onClick={() => setCashInput(String(a))}
                      className="h-9 bg-secondary hover:bg-muted border border-border rounded-lg text-sm font-mono font-semibold text-foreground transition-colors">
                      {a}
                    </button>
                  ))}
                </div>
                {cashNum >= total && (
                  <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 flex justify-between">
                    <span className="text-accent font-medium">Сдача</span>
                    <span className="font-mono text-xl font-bold text-accent">{fmt(change)}</span>
                  </div>
                )}
              </div>
            )}
            {payMethod === "card" && (
              <div className="bg-secondary/50 border border-border rounded-xl p-6 text-center">
                <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">Приложите или вставьте карту</p>
                <p className="text-muted-foreground text-sm mt-1">Ожидание терминала...</p>
              </div>
            )}
            <button onClick={handlePay}
              disabled={payMethod === "cash" && cashNum < total}
              className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
              {payMethod === "cash"
                ? cashNum >= total ? `Принять — ${fmt(total)}` : `Не хватает ${fmt(total - cashNum)}`
                : `Оплата картой — ${fmt(total)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Catalog panel ─────────────────────────────────────────────────────────
  const CatalogPanel = () => (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск или штрихкод..."
              className="w-full h-10 bg-secondary border border-border rounded-xl pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors" />
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="h-10 px-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0">
            <PackagePlus className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Товар</span>
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {allCategories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`shrink-0 px-4 h-8 rounded-lg text-sm font-medium transition-all
                ${category === c ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(p => {
            const inCart = cart.find(i => i.id === p.id);
            return (
              <button key={p.id} onClick={() => addToCart(p)}
                className={`relative text-left bg-card border rounded-xl p-3 transition-all hover:scale-[1.02] active:scale-[0.98]
                  ${inCart ? "border-primary/40 bg-primary/5" : "border-border hover:border-border/60"}`}>
                {/* Marking badge */}
                {p.isMarked && (
                  <span className="absolute top-2 left-2 flex items-center gap-0.5 bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                    <ShieldCheck className="w-2.5 h-2.5" />М
                  </span>
                )}
                {inCart && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {inCart.qty}
                  </span>
                )}
                <div className="text-3xl mb-2 mt-1">{p.emoji}</div>
                <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{p.name}</p>
                <p className="text-primary font-mono font-bold text-sm mt-2">{fmt(p.price)}</p>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mb-3 opacity-30" />
            <p>Товар не найден</p>
            <button onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 h-9 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Добавить новый
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Cart panel ────────────────────────────────────────────────────────────
  const CartPanel = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <div className={`flex flex-col ${fullWidth ? "flex-1" : "w-80 xl:w-96 shrink-0 border-l border-border"} bg-card`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-foreground text-sm">Чек</span>
          {cartCount > 0 && (
            <span className="bg-primary/20 text-primary text-xs font-mono font-bold px-2 py-0.5 rounded-full">{cartCount}</span>
          )}
        </div>
        {cart.length > 0 && (
          <button onClick={clearCart} className="text-muted-foreground hover:text-destructive transition-colors p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Missing codes warning */}
      {missingCodes.length > 0 && (
        <div className="mx-3 mt-3 bg-accent/10 border border-accent/30 rounded-xl px-3 py-2.5 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-accent text-xs font-semibold">Требуются коды маркировки</p>
            <p className="text-accent/80 text-xs mt-0.5">
              {missingCodes.map(i => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Добавьте товары из каталога</p>
          </div>
        ) : (
          cart.map(item => {
            const codesOk = !item.isMarked || item.markCodes.length >= item.qty;
            const codesPartial = item.isMarked && item.markCodes.length > 0 && item.markCodes.length < item.qty;
            return (
              <div key={item.id} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border transition-colors
                ${!codesOk ? "bg-accent/5 border-accent/20" : "bg-secondary border-transparent"}`}>
                <span className="text-xl shrink-0 mt-0.5">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    {item.isMarked && (
                      <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${codesOk ? "text-primary" : "text-accent"}`} />
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{fmt(item.price)} × {item.qty}</p>
                  {/* Mark codes status */}
                  {item.isMarked && (
                    <button onClick={() => setScanningItem(item)}
                      className={`mt-1.5 flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors
                        ${codesOk
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-accent/15 text-accent hover:bg-accent/25"}`}>
                      <ScanLine className="w-3 h-3" />
                      {codesOk
                        ? `${item.markCodes.length}/${item.qty} кодов ✓`
                        : codesPartial
                          ? `${item.markCodes.length}/${item.qty} — добавить`
                          : "Сканировать коды"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className="text-sm font-mono font-bold text-foreground">{fmt(item.price * item.qty)}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-muted hover:bg-border flex items-center justify-center transition-colors">
                      <Minus className="w-3 h-3 text-foreground" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold text-foreground">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-md bg-muted hover:bg-border flex items-center justify-center transition-colors">
                      <Plus className="w-3 h-3 text-foreground" />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="w-6 h-6 rounded-md bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors ml-0.5">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Discount */}
      {cart.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex gap-1.5">
            {[0, 5, 10, 15].map(d => (
              <button key={d} onClick={() => setDiscount(d)}
                className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1
                  ${discount === d ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground border border-border hover:border-accent/50"}`}>
                {d === 0 ? "—" : <><Tag className="w-2.5 h-2.5" />{d}%</>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-border px-4 py-4 space-y-2">
        {cart.length > 0 && (
          <>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Товаров</span><span className="font-mono">{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-accent">
                <span>Скидка {discount}%</span><span className="font-mono">− {fmt(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>НДС 20%</span><span className="font-mono">{fmt(tax)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-foreground font-bold">ИТОГО</span>
          <span className="text-2xl font-mono font-bold text-primary">{fmt(total)}</span>
        </div>
        <button
          onClick={() => canPay && setView("payment")}
          disabled={!canPay}
          className="w-full h-12 mt-1 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {missingCodes.length > 0
            ? <><AlertTriangle className="w-4 h-4" />Нужны коды маркировки</>
            : <>Оплатить <ChevronRight className="w-5 h-5" /></>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-foreground font-bold text-sm leading-none">КассаPRO</p>
            <p className="text-muted-foreground text-xs mt-0.5 font-mono hidden sm:block">
              Смена №412 • Кассир: Иванова А.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden xs:block">
            <p className="text-muted-foreground text-xs">Выручка</p>
            <p className="text-accent font-mono font-bold text-sm">87 340 ₽</p>
          </div>
          <div className="w-px h-7 bg-border hidden xs:block" />
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Чеков</p>
            <p className="text-foreground font-mono font-bold text-sm">47</p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <CatalogPanel />
          <CartPanel />
        </div>
        {/* Mobile */}
        <div className="flex flex-col flex-1 overflow-hidden md:hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            {mobileTab === "catalog" ? <CatalogPanel /> : <CartPanel fullWidth />}
          </div>
          <div className="shrink-0 border-t border-border bg-card flex">
            <button onClick={() => setMobileTab("catalog")}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors
                ${mobileTab === "catalog" ? "text-primary" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-5 h-5" />
              <span className="text-xs font-medium">Каталог</span>
            </button>
            <button onClick={() => setMobileTab("cart")}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-colors
                ${mobileTab === "cart" ? "text-primary" : "text-muted-foreground"}`}>
              <div className="relative">
                <ListOrdered className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
                {missingCodes.length > 0 && (
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-card" />
                )}
              </div>
              <span className="text-xs font-medium">Чек {total > 0 ? `· ${fmt(total)}` : ""}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add product modal */}
      {showAddModal && (
        <AddProductModal
          existingCategories={products.map(p => p.category)}
          onAdd={handleAddProduct}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Mark scan modal */}
      {scanningItem && (
        <MarkScanModal
          item={cart.find(i => i.id === scanningItem.id) ?? scanningItem}
          onSave={(codes) => saveMarkCodes(scanningItem.id, codes)}
          onClose={() => setScanningItem(null)}
        />
      )}
    </div>
  );
}
