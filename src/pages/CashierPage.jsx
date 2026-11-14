import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Barcode,
    Banknote,
    CircleAlert,
    Minus,
    PackageOpen,
    Plus,
    ScanLine,
    Search,
    ShoppingCart,
    Trash2,
    X,
    Wifi,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const currency = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
});

export default function CashierPage({ bridge, showProductImages, scannerMode, cart, onCartChange, onCheckout, onNavigate }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [category, setCategory] = useState("Semua");
    const [scannerActive, setScannerActive] = useState(false);
    const [lookupMessage, setLookupMessage] = useState("");
    const scannerRef = useRef(null);

    useEffect(() => {
        if (!bridge) return;
        bridge.getProducts(showProductImages, (result) => {
            setLoading(false);
            if (!result?.success) {
                setError(result?.error || "Katalog produk belum dapat dimuat.");
                return;
            }
            setProducts(result.products || []);
        });
    }, [bridge, showProductImages]);

    useEffect(() => () => {
        bridge?.setScannerActive(false, () => {});
    }, [bridge]);

    const categories = useMemo(
        () => ["Semua", ...new Set(products.map((product) => product.category).filter(Boolean))],
        [products],
    );

    const visibleProducts = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("id-ID");
        return products.filter((product) => {
            const matchesCategory = category === "Semua" || product.category === category;
            const matchesSearch = !term || [product.name, product.sku, product.barcode]
                .some((value) => String(value || "").toLocaleLowerCase("id-ID").includes(term));
            return matchesCategory && matchesSearch;
        });
    }, [products, search, category]);

    const searchResults = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("id-ID");
        if (!term) return [];
        return products.filter((product) => [product.name, product.sku, product.barcode]
            .some((value) => String(value || "").toLocaleLowerCase("id-ID").includes(term)))
            .slice(0, 8);
    }, [products, search]);

    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + Number(item.product.salePrice) * item.quantity, 0);

    const addProduct = useCallback((product) => {
        setLookupMessage("");
        onCartChange((current) => {
            const existing = current.find((item) => item.product.id === product.id);
            if (existing) {
                return current.map((item) => item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item);
            }
            return [...current, { product, quantity: 1 }];
        });
    }, [onCartChange]);

    const scanOrLookup = (event) => {
        if (event.key === "Escape") {
            setSearchOpen(false);
            return;
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (scannerMode === "hid" && !scannerActive) {
            setSearchOpen(true);
            setLookupMessage("Aktifkan scanner atau pilih barang dari hasil pencarian.");
            return;
        }
        const code = search.trim().toLocaleLowerCase("id-ID");
        if (!code) return;
        const match = products.find((product) =>
            [product.barcode, product.sku, product.name]
                .some((value) => String(value || "").trim().toLocaleLowerCase("id-ID") === code),
        ) || (searchResults.length === 1 ? searchResults[0] : null);
        if (match) {
            addProduct(match);
            setSearch("");
            setSearchOpen(false);
            scannerRef.current?.focus();
        } else {
            setLookupMessage(`Produk dengan kode “${search.trim()}” tidak ditemukan.`);
            setSearchOpen(true);
        }
    };

    const chooseProduct = (product) => {
        addProduct(product);
        setSearch("");
        setSearchOpen(false);
        scannerRef.current?.focus();
    };

    const changeQuantity = (productId, amount) => {
        onCartChange((current) => current
            .map((item) => item.product.id === productId
                ? { ...item, quantity: item.quantity + amount }
                : item)
            .filter((item) => item.quantity > 0));
    };

    const removeProduct = (productId) => {
        onCartChange((current) => current.filter((item) => item.product.id !== productId));
    };

    const toggleScanner = () => {
        const next = !scannerActive;
        bridge.setScannerActive(next, (result) => {
            if (!result?.success) {
                setLookupMessage(result?.error || "Scanner tidak dapat diaktifkan.");
                return;
            }
            setScannerActive(next);
            setLookupMessage("");
            if (next && scannerMode === "hid") {
                setSearchOpen(false);
                scannerRef.current?.focus();
            } else if (!next && scannerMode === "hid") {
                scannerRef.current?.blur();
            }
        });
    };

    useEffect(() => {
        if (!bridge?.barcodeScanned || scannerMode !== "wifi" || !scannerActive) return undefined;
        const handleBarcode = (barcode) => {
            const code = String(barcode || "").trim().toLocaleLowerCase("id-ID");
            const product = products.find((item) =>
                [item.barcode, item.sku].some((value) => String(value || "").trim().toLocaleLowerCase("id-ID") === code),
            );
            if (product) {
                addProduct(product);
                scannerRef.current?.focus();
            } else {
                setLookupMessage(`Barcode “${barcode}” tidak ditemukan di katalog.`);
            }
        };
        bridge.barcodeScanned.connect(handleBarcode);
        return () => bridge.barcodeScanned.disconnect(handleBarcode);
    }, [bridge, products, scannerMode, scannerActive, addProduct]);

    return (
        <div className="mx-auto flex h-full min-h-0 max-w-[1600px] flex-col gap-3 overflow-hidden">
            <header className="flex shrink-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3ee] text-[#52755b]"><ShoppingCart size={17} /></span>
                    <div><p className="text-[10px] font-bold tracking-[0.14em] text-[#849087]">POINT OF SALE</p><h1 className="mt-0.5 text-sm font-semibold text-[#344139]">Transaksi baru</h1></div>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[#e6ebe5] bg-white px-3 py-2 text-[9px] text-[#758078]">
                    <span className="size-2 rounded-full bg-[#78a27e]" /><span className="hidden sm:inline">Kasir siap</span>
                    <span className="mx-0.5 h-3 w-px bg-[#e3e8e2]" />{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}
                </div>
            </header>

            {error && <p className="shrink-0 rounded-lg bg-[#fff4f2] p-2.5 text-[10px] text-[#a8443a]" role="alert">{error}</p>}

            <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(190px,0.8fr)] gap-3 xl:grid-cols-[minmax(0,1fr)_390px] xl:grid-rows-1 2xl:grid-cols-[minmax(0,1fr)_420px]">
                <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[#e7eae4] bg-white shadow-sm">
                    <div className="relative z-20 shrink-0 border-b border-[#edf0eb] p-3 sm:p-4">
                        <div className="flex items-end gap-2 sm:items-center">
                            <div className="min-w-0 flex-1">
                                <label htmlFor="cashier-search" className="mb-1.5 block text-[9px] font-semibold text-[#536057]">Cari barang / scan barcode</label>
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96a198]" />
                                    <Input
                                        ref={scannerRef}
                                        id="cashier-search"
                                        autoFocus
                                        value={search}
                                        onFocus={() => { if (search.trim()) setSearchOpen(true); }}
                                        onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); setLookupMessage(""); }}
                                        onKeyDown={scanOrLookup}
                                        onBlur={() => setSearchOpen(false)}
                                        placeholder="Ketik nama, SKU, atau scan barcode..."
                                        className="h-10 pl-9 pr-9 text-[10px]"
                                        autoComplete="off"
                                    />
                                    {search && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearch(""); setLookupMessage(""); scannerRef.current?.focus(); }} className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-[#9aa29c] hover:bg-[#f2f5f1]" aria-label="Hapus pencarian"><X size={13} /></button>}

                                    {searchOpen && search.trim() && <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-lg border border-[#e3e9e2] bg-white p-1.5 shadow-xl">
                                        {searchResults.length > 0 ? searchResults.map((product) => <button key={product.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseProduct(product)} className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition hover:bg-[#f5f8f4]">
                                            {showProductImages && <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-[#f1f5f0] text-[#98a49a]">{product.imageData ? <img src={product.imageData} alt="" className="size-full object-cover" /> : <PackageOpen size={14} />}</span>}
                                            <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-[#435047]">{product.name}</span><span className="mt-0.5 block truncate text-[9px] text-[#97a098]">{product.sku || product.barcode || product.category || "Produk"}</span></span>
                                            <span className="shrink-0 text-[10px] font-semibold text-[#587960]">{currency.format(Number(product.salePrice) || 0)}</span>
                                            <Plus size={14} className="shrink-0 text-[#78917d]" />
                                        </button>) : <p className="px-3 py-4 text-center text-[10px] text-[#929a94]">Barang tidak ditemukan.</p>}
                                    </div>}
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1 pt-4">
                                <Button variant={scannerActive ? "default" : "outline"} onClick={toggleScanner} className={`min-h-10 gap-1.5 px-2.5 text-[9px] ${scannerActive ? "bg-[#315b49]" : ""}`}>
                                    <ScanLine size={14} />{scannerActive ? "Scanner aktif" : "Aktifkan scanner"}
                                </Button>
                                <span className="hidden items-center gap-1 text-[8px] text-[#929a94] sm:flex">{scannerMode === "wifi" ? <><Wifi size={11} />Wi-Fi mobile</> : <><Barcode size={11} />Bluetooth / USB</>}</span>
                            </div>
                        </div>
                        {lookupMessage && <p className="mt-2 flex items-center gap-1.5 text-[9px] text-[#a66e43]" role="status"><CircleAlert size={12} />{lookupMessage}</p>}
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#edf0eb] px-3 py-2 sm:px-4">
                        <div className="flex min-w-0 gap-1 overflow-x-auto">
                            {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-md px-2.5 py-1.5 text-[9px] font-medium transition ${category === item ? "bg-[#edf3ee] text-[#315b49]" : "text-[#829087] hover:bg-[#f6f8f5]"}`}>{item}</button>)}
                        </div>
                        <span className="shrink-0 text-[9px] text-[#9aa29c]">{loading ? "…" : `${visibleProducts.length} barang`}</span>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
                        {loading ? <div className="grid h-full min-h-40 place-items-center text-[10px] text-[#89938b]">Memuat barang...</div> : products.length === 0 ? (
                            <div className="grid h-full min-h-40 place-items-center p-5 text-center">
                                <div><span className="mx-auto grid size-10 place-items-center rounded-xl bg-[#f0f4ef] text-[#78917d]"><PackageOpen size={18} /></span><p className="mt-2 text-[10px] font-semibold text-[#59665d]">Belum ada barang</p><p className="mt-1 text-[9px] text-[#9aa29c]">Tambahkan produk agar bisa mulai transaksi.</p><Button className="mt-3 min-h-8 text-[9px]" onClick={() => onNavigate("products")}><Plus size={12} />Tambah produk</Button></div>
                            </div>
                        ) : visibleProducts.length === 0 ? (
                            <div className="grid h-full min-h-40 place-items-center text-[10px] text-[#929a94]">Tidak ada barang dalam kategori ini.</div>
                        ) : (
                            <table className="w-full table-fixed text-left">
                                <thead className="sticky top-0 z-10 bg-[#fbfcfa] text-[8px] font-semibold uppercase tracking-wider text-[#9aa29c] shadow-[0_1px_0_#edf0eb]">
                                    <tr>
                                        {showProductImages && <th className="w-[54px] px-3 py-2.5 font-semibold">Foto</th>}
                                        <th className="px-3 py-2.5 font-semibold">Nama barang</th>
                                        <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">Kategori</th>
                                        <th className="w-[106px] px-3 py-2.5 text-right font-semibold">Harga</th>
                                        <th className="hidden w-[82px] px-3 py-2.5 text-center font-semibold sm:table-cell">Stok</th>
                                        <th className="w-[54px] px-2 py-2.5 text-center font-semibold">Tambah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f2ef]">
                                    {visibleProducts.map((product) => <ProductRow key={product.id} product={product} showImage={showProductImages} onAdd={() => addProduct(product)} />)}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e7eae4] bg-white shadow-sm">
                    <div className="flex shrink-0 items-center justify-between border-b border-[#edf0eb] px-3 py-3 sm:px-4">
                        <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[#edf3ee] text-[#52755b]"><ShoppingCart size={15} /></span><div><h2 className="text-[10px] font-semibold text-[#3d4b42]">Daftar belanja</h2><p className="mt-0.5 text-[8px] text-[#99a29b]">{itemCount} item</p></div></div>
                        {cart.length > 0 && <Button variant="ghost" className="min-h-7 gap-1 px-2 text-[8px] text-[#a2695e] hover:bg-[#fff5f3]" onClick={() => onCartChange([])}><Trash2 size={12} />Kosongkan</Button>}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4">
                        {cart.length === 0 ? <div className="grid h-full min-h-28 place-items-center text-center"><div><span className="mx-auto grid size-9 place-items-center rounded-full bg-[#f6f8f5] text-[#a0aaa2]"><ShoppingCart size={15} /></span><p className="mt-2 text-[9px] font-medium text-[#6f7b72]">Belum ada barang dipilih</p><p className="mt-1 text-[8px] text-[#a0a8a1]">Klik tombol + pada daftar barang.</p></div></div> : cart.map(({ product, quantity }) => <CartRow key={product.id} product={product} quantity={quantity} showImage={showProductImages} onDecrease={() => changeQuantity(product.id, -1)} onIncrease={() => changeQuantity(product.id, 1)} onRemove={() => removeProduct(product.id)} />)}
                    </div>

                    <div className="shrink-0 border-t border-[#edf0eb] bg-[#fcfdfa] p-3 sm:p-4">
                        <div className="space-y-1.5 text-[9px]">
                            <div className="flex justify-between text-[#859087]"><span>Subtotal</span><span>{currency.format(subtotal)}</span></div>
                            <div className="flex justify-between text-[#859087]"><span>Diskon</span><span>{currency.format(0)}</span></div>
                        </div>
                        <div className="my-2.5 border-t border-dashed border-[#dfe5de]" />
                        <div className="flex items-end justify-between"><span className="text-[9px] font-semibold text-[#58655c]">Total</span><span className="text-lg font-semibold tracking-tight text-[#304438]">{currency.format(subtotal)}</span></div>
                        <Button disabled={cart.length === 0} onClick={onCheckout} className="mt-3 min-h-10 w-full justify-between bg-[#315b49] px-3 text-[10px]">
                            <span className="inline-flex items-center gap-2"><Banknote size={15} />Bayar</span><span>{currency.format(subtotal)}</span>
                        </Button>
                        <p className="mt-1.5 text-center text-[8px] leading-3 text-[#9aa29c]">Lanjutkan ke checkout untuk memilih metode pembayaran.</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function ProductRow({ product, showImage, onAdd }) {
    const stock = Number(product.stock) || 0;
    const lowStock = stock <= Number(product.minStock || 0);

    return (
        <tr className="group text-[9px] transition hover:bg-[#fbfcfa]">
            {showImage && <td className="px-3 py-2">{product.imageData ? <img className="size-8 rounded-md object-cover" src={product.imageData} alt={product.name} /> : <span className="grid size-8 place-items-center rounded-md bg-[#f5f7f4] text-[#a3ada5]"><PackageOpen size={13} /></span>}</td>}
            <td className="min-w-0 px-3 py-2"><span className="block truncate font-semibold text-[#455148]">{product.name}</span><span className="mt-0.5 block truncate text-[8px] text-[#a0a8a1]">{product.sku || product.barcode || "Tanpa kode"}</span></td>
            <td className="hidden truncate px-3 py-2 text-[#89938b] sm:table-cell">{product.category || "Umum"}</td>
            <td className="px-3 py-2 text-right font-semibold text-[#4c5a50]">{currency.format(Number(product.salePrice) || 0)}</td>
            <td className={`hidden px-3 py-2 text-center sm:table-cell ${lowStock ? "text-[#a66e43]" : "text-[#87948a]"}`}>{stock} {product.unit}</td>
            <td className="px-2 py-2 text-center"><button type="button" onClick={onAdd} className="mx-auto grid size-7 place-items-center rounded-md bg-[#eff5ef] text-[#5b7c62] transition hover:bg-[#e1eee2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ba995]" aria-label={`Tambah ${product.name} ke keranjang`}><Plus size={14} /></button></td>
        </tr>
    );
}

function CartRow({ product, quantity, showImage, onDecrease, onIncrease, onRemove }) {
    return (
        <div className="flex items-center gap-2 border-b border-[#f0f2ef] py-2.5 last:border-0">
            {showImage && <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-[#f4f7f3] text-[#a0aaa2]">{product.imageData ? <img className="size-full object-cover" src={product.imageData} alt="" /> : <PackageOpen size={13} />}</span>}
            <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-semibold text-[#4c5950]">{product.name}</p><p className="mt-0.5 text-[8px] text-[#8c978f]">{currency.format(Number(product.salePrice) || 0)} / {product.unit}</p></div>
            <div className="flex items-center rounded-md border border-[#e7ebe5] bg-white">
                <button type="button" onClick={onDecrease} aria-label={`Kurangi ${product.name}`} className="grid size-6 place-items-center text-[#78857b] hover:bg-[#f5f7f4]"><Minus size={10} /></button>
                <span className="w-5 text-center text-[9px] font-semibold text-[#4e5c52]">{quantity}</span>
                <button type="button" onClick={onIncrease} aria-label={`Tambah ${product.name}`} className="grid size-6 place-items-center text-[#55765e] hover:bg-[#f1f5f0]"><Plus size={10} /></button>
            </div>
            <span className="w-[66px] text-right text-[9px] font-semibold text-[#46544a]">{currency.format(Number(product.salePrice) * quantity)}</span>
            <button type="button" onClick={onRemove} aria-label={`Hapus ${product.name}`} className="grid size-5 place-items-center text-[#a2aaa3] hover:text-[#a95d51]"><X size={12} /></button>
        </div>
    );
}
