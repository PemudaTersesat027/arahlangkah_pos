import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import JsBarcode from "jsbarcode";
import {
    Barcode,
    Eye,
    ExternalLink,
    ImagePlus,
    LoaderCircle,
    PackageOpen,
    PackagePlus,
    Plus,
    Printer,
    Search,
    ShoppingCart,
    Trash2,
    X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const emptyProduct = {
    name: "",
    sku: "",
    barcode: "",
    category: "",
    unit: "pcs",
    purchasePrice: "0",
    salePrice: "",
    stock: "0",
    minStock: "0",
    imageData: "",
    imageAttribution: "",
    imageSourceUrl: "",
    imageLicense: "",
    imageLicenseUrl: "",
    notes: "",
};

const currency = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
});

export default function ProductsPage({ bridge, showProductImages, onNavigate }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [detailProduct, setDetailProduct] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [printMode, setPrintMode] = useState(null);
    const [printNow, setPrintNow] = useState(false);
    const [error, setError] = useState("");
    const [listError, setListError] = useState("");

    const loadProducts = useCallback(() => {
        if (!bridge) return;
        bridge.getProducts(showProductImages, (result) => {
            setLoading(false);
            if (!result?.success) {
                setListError(result?.error || "Daftar produk belum bisa dimuat.");
                return;
            }
            setListError("");
            setProducts(result.products || []);
        });
    }, [bridge, showProductImages]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        if (!printNow) return undefined;
        const style = document.createElement("style");
        style.textContent = "@media print { @page { margin: 10mm; } body { background: white !important; } body * { visibility: hidden !important; } #nexus-print-area, #nexus-print-area * { visibility: visible !important; } #nexus-print-area { display: block !important; position: fixed !important; inset: 0 !important; width: 100% !important; max-height: none !important; overflow: visible !important; padding: 8mm !important; background: white !important; } }";
        document.head.appendChild(style);
        const afterPrint = () => setPrintNow(false);
        window.addEventListener("afterprint", afterPrint, { once: true });
        const timer = window.setTimeout(() => window.print(), 300);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("afterprint", afterPrint);
            style.remove();
        };
    }, [printNow]);

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("id-ID");
        if (!term) return products;
        return products.filter((product) =>
            [product.name, product.sku, product.barcode, product.category]
                .some((value) => String(value || "").toLocaleLowerCase("id-ID").includes(term)),
        );
    }, [products, search]);

    const confirmDelete = () => {
        if (!bridge || !deleteTarget) return;
        setDeleting(true);
        setError("");
        bridge.deleteProduct(Number(deleteTarget.id), (result) => {
            setDeleting(false);
            if (!result?.success) {
                setError(result?.error || "Produk belum dapat dihapus.");
                return;
            }
            if (detailProduct?.id === deleteTarget.id) setDetailProduct(null);
            setDeleteTarget(null);
            loadProducts();
        });
    };

    const openDetail = useCallback((product) => setDetailProduct(product), []);
    const openDelete = useCallback((product) => setDeleteTarget(product), []);
    const productSaved = useCallback((product) => {
        setFormOpen(false);
        setDetailProduct(product);
        loadProducts();
    }, [loadProducts]);

    return (
        <div className="mx-auto max-w-[1440px] space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[#849087]">KATALOG USAHA</p>
                    <h1 className="mt-2 font-serif text-3xl font-normal tracking-[-0.04em] text-[#26372e] sm:text-[38px]">Produk & stok</h1>
                    <p className="mt-2 text-xs text-[#87928a]">Kelola daftar barang, harga, dan persediaan usaha.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => onNavigate("cashier")} className="min-h-10 gap-2"><ShoppingCart size={14} />Ke kasir</Button>
                    <Button variant="outline" disabled={products.length === 0} onClick={() => { setPrintMode({ type: "catalog", products }); setPrintNow(true); }} className="min-h-10 gap-2"><Printer size={14} />Print katalog</Button>
                    <Button onClick={() => { setError(""); setFormOpen(true); }} className="min-h-10 gap-2"><Plus size={15} />Tambah produk</Button>
                </div>
            </header>

            <section className="grid gap-3 sm:grid-cols-3" aria-label="Statistik produk">
                <ProductMetric label="Jumlah produk" value={products.length} icon={PackageOpen} />
                <ProductMetric label="Jenis kategori" value={new Set(products.map((product) => product.category).filter(Boolean)).size} icon={PackagePlus} />
                <ProductMetric label="Stok menipis" value={products.filter((product) => Number(product.stock) <= Number(product.minStock)).length} icon={PackageOpen} />
            </section>

            <Card className="rounded-xl shadow-none">
                <CardContent className="p-4 sm:p-6">
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-sm font-semibold text-[#354139]">Daftar produk</h2>
                            <p className="mt-1 text-[10px] text-[#98a19a]">{products.length} produk terdaftar</p>
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa49c]" />
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, SKU, barcode..." className="pl-9" aria-label="Cari produk" />
                        </div>
                    </div>

                    {listError && <p className="mb-4 rounded-lg bg-[#fff4f2] p-3 text-xs text-[#a8443a]" role="alert">{listError}</p>}
                    {loading ? (
                        <div className="grid min-h-52 place-items-center text-xs text-[#89938b]">Memuat produk...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-[#e6eae4] bg-[#fbfcfa] p-6 text-center">
                            <div>
                                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-[#f0f4ef] text-[#78917d]"><PackageOpen size={20} /></span>
                                <p className="mt-3 text-xs font-semibold text-[#59665d]">{search ? "Produk tidak ditemukan" : "Belum ada produk"}</p>
                                <p className="mt-1 text-[10px] text-[#9aa29c]">{search ? "Coba kata kunci lain." : "Tambahkan produk pertama untuk mulai mengisi katalog."}</p>
                                {!search && <Button className="mt-4" onClick={() => setFormOpen(true)}><Plus size={14} />Tambah produk</Button>}
                            </div>
                        </div>
                    ) : (
                        <ProductList products={filteredProducts} showImage={showProductImages} onDetail={openDetail} onDelete={openDelete} />
                    )}
                    <p className="mt-4 flex items-center gap-1.5 text-[9px] text-[#9aa29c]"><ImagePlus size={12} />Gambar produk {showProductImages ? "ditampilkan" : "disembunyikan"} sesuai preferensi Pengaturan.</p>
                </CardContent>
            </Card>

            {formOpen && <ProductFormDialog bridge={bridge} onClose={() => setFormOpen(false)} onSaved={productSaved} />}

            {detailProduct && createPortal(<ProductDetailDialog
                product={detailProduct}
                showImage={showProductImages}
                onClose={() => setDetailProduct(null)}
                onPrint={() => { setPrintMode({ type: "barcode", product: detailProduct }); setPrintNow(true); }}
                onDelete={() => setDeleteTarget(detailProduct)}
            />, document.body)}

            {deleteTarget && createPortal(<div className="fixed inset-0 z-[9999] grid place-items-center bg-[#1c2a22]/35 p-5 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}>
                <section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#fff3ef] text-[#a76555]"><Trash2 size={18} /></span>
                    <h2 id="delete-product-title" className="mt-4 text-sm font-semibold text-[#39473e]">Hapus produk?</h2>
                    <p className="mt-2 text-[10px] leading-5 text-[#89938b]"><strong>{deleteTarget.name}</strong> akan disembunyikan dari katalog dan kasir. Riwayat transaksi lama tetap dipertahankan.</p>
                    {error && <p className="mt-3 text-[10px] text-[#a8443a]" role="alert">{error}</p>}
                    <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Batal</Button><Button onClick={confirmDelete} disabled={deleting} className="bg-[#a8584d] hover:bg-[#91473d]">{deleting ? "Menghapus..." : "Hapus produk"}</Button></div>
                </section>
            </div>, document.body)}

            {printMode && <div id="nexus-print-area" className="hidden">
                {printMode.type === "barcode"
                    ? <BarcodeLabel product={printMode.product} />
                    : <CatalogPrint products={printMode.products} showImage={showProductImages} />}
            </div>}
        </div>
    );
}

function ProductMetric({ label, value, icon: Icon }) {
    return (
        <Card className="rounded-xl shadow-none"><CardContent className="flex items-center justify-between p-4">
            <div><p className="text-[10px] text-[#87928a]">{label}</p><p className="mt-1 text-lg font-semibold text-[#344139]">{value}</p></div>
            <span className="grid size-9 place-items-center rounded-lg bg-[#f1f5f0] text-[#6d8872]"><Icon size={17} /></span>
        </CardContent></Card>
    );
}

const ProductList = memo(function ProductList({ products, showImage, onDetail, onDelete }) {
    return <>
        <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[840px] text-left">
                <thead><tr className="border-y border-[#edf0eb] text-[9px] font-semibold uppercase tracking-wider text-[#98a19a]">
                    {showImage && <th className="w-14 py-3 pl-2">Gambar</th>}
                    <th className="py-3">Produk</th><th className="py-3">Kategori</th><th className="py-3">Harga jual</th><th className="py-3">Stok</th><th className="py-3">SKU</th><th className="w-28 py-3 text-right">Aksi</th>
                </tr></thead>
                <tbody>{products.map((product) => <ProductRow key={product.id} product={product} showImage={showImage} onDetail={() => onDetail(product)} onDelete={() => onDelete(product)} />)}</tbody>
            </table>
        </div>
        <div className="grid gap-2 md:hidden">
            {products.map((product) => <ProductMobileCard key={product.id} product={product} showImage={showImage} onDetail={() => onDetail(product)} onDelete={() => onDelete(product)} />)}
        </div>
    </>;
});

function ProductFormDialog({ bridge, onClose, onSaved }) {
    const [form, setForm] = useState(emptyProduct);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [imageDownloadError, setImageDownloadError] = useState("");
    const [downloadingImage, setDownloadingImage] = useState(false);

    const updateForm = (key, value) => {
        setForm((current) => {
            const next = { ...current, [key]: value };
            if (key === "imageData") {
                next.imageAttribution = "";
                next.imageSourceUrl = "";
                next.imageLicense = "";
                next.imageLicenseUrl = "";
            }
            return next;
        });
        setError("");
    };

    const importImageFromUrl = () => {
        const url = imageUrl.trim();
        if (!url || downloadingImage) return;
        setDownloadingImage(true);
        setImageDownloadError("");
        bridge.downloadImageFromUrl(url, (result) => {
            setDownloadingImage(false);
            if (!result?.success) {
                setImageDownloadError(result?.error || "Gambar tidak dapat diunduh.");
                return;
            }
            setForm((current) => ({
                ...current,
                imageData: result.imageData,
                imageAttribution: "",
                imageSourceUrl: url,
                imageLicense: "",
                imageLicenseUrl: "",
            }));
        });
    };

    const handleImage = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImageUrl("");
        setImageDownloadError("");
        if (!file.type.startsWith("image/")) {
            setError("Pilih file gambar yang valid.");
            event.target.value = "";
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError("Ukuran gambar maksimal 5 MB.");
            event.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => setError("Gambar tidak dapat dibaca.");
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => setError("Format gambar tidak dapat dibuka.");
            image.onload = () => {
                const maxDimension = 640;
                const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                const context = canvas.getContext("2d");
                if (!context) {
                    setError("Gambar tidak dapat diproses.");
                    return;
                }
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                updateForm("imageData", canvas.toDataURL("image/jpeg", 0.82));
            };
            image.src = String(reader.result || "");
        };
        reader.readAsDataURL(file);
    };

    const submitProduct = (event) => {
        event.preventDefault();
        if (!bridge || saving) return;
        setSaving(true);
        setError("");
        bridge.saveProduct(form, (result) => {
            setSaving(false);
            if (!result?.success) {
                setError(result?.error || "Produk tidak berhasil disimpan.");
                return;
            }
            onSaved({ ...form, id: result.id, sku: result.sku, barcode: result.barcode });
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c2a22]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
            <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#edf0eb] bg-white px-5 py-4 sm:px-7">
                    <div><p className="text-[9px] font-bold tracking-[0.15em] text-[#849087]">KATALOG USAHA</p><h2 id="product-dialog-title" className="mt-1 text-lg font-semibold text-[#344139]">Tambah produk</h2></div>
                    <Button variant="ghost" className="size-8 min-h-8 px-0" onClick={onClose} disabled={saving} aria-label="Tutup"><X size={17} /></Button>
                </div>
                <form className="space-y-5 px-5 py-5 sm:px-7" onSubmit={submitProduct}>
                    <ProductField label="Nama produk" required><Input autoFocus required maxLength={120} value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Contoh: Kopi susu" /></ProductField>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <label className="grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-[#cbd4cc] bg-[#f7f9f6] text-[#7e9283]">
                            {form.imageData ? <img className="size-full object-cover" src={form.imageData} alt="Pratinjau produk" /> : <span className="flex flex-col items-center gap-1"><ImagePlus size={20} /><small className="text-[9px]">Tambah gambar</small></span>}
                            <input className="sr-only" type="file" accept="image/*" onChange={handleImage} />
                        </label>
                        <div className="flex flex-col justify-center gap-1">
                            <p className="text-xs font-semibold text-[#4d5a51]">Gambar produk <span className="font-normal text-[#929a94]">(opsional)</span></p>
                            <p className="text-[10px] leading-4 text-[#929a94]">Unggah file atau tempel tautan langsung ke gambar.</p>
                            {form.imageData && <button type="button" onClick={() => updateForm("imageData", "")} className="mt-1 w-fit text-[10px] font-medium text-[#a25c50]">Hapus gambar</button>}
                        </div>
                    </div>
                    <div className="rounded-xl border border-[#e8ece7] bg-[#fbfcfa] p-3">
                        <Label htmlFor="product-image-url" className="mb-1.5 block">Tempel tautan gambar</Label>
                        <div className="flex gap-2">
                            <Input id="product-image-url" type="text" inputMode="url" value={imageUrl} onChange={(event) => { setImageUrl(event.target.value); setImageDownloadError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); importImageFromUrl(); } }} placeholder="https://contoh.com/foto-produk.jpg" className="h-9 min-w-0 text-[10px]" />
                            <Button type="button" variant="outline" onClick={importImageFromUrl} disabled={downloadingImage || !imageUrl.trim()} className="min-h-9 shrink-0 px-3 text-[9px]">
                                {downloadingImage ? <><LoaderCircle size={12} className="animate-spin" />Mengunduh</> : "Ambil gambar"}
                            </Button>
                        </div>
                        <p className="mt-1.5 text-[8px] leading-4 text-[#929a94]">Gunakan URL HTTPS langsung ke file JPEG, PNG, WebP, atau GIF (maks. 5 MB). Pastikan kamu berhak menggunakannya.</p>
                        {imageDownloadError && <p className="mt-2 text-[9px] leading-4 text-[#a8443a]" role="alert">{imageDownloadError}</p>}
                    </div>
                    {form.imageData && form.imageSourceUrl && <p className="flex flex-wrap items-center gap-x-1 text-[8px] leading-4 text-[#89938b]">Gambar disimpan lokal · <a href={form.imageSourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#52755b] underline">Sumber gambar <ExternalLink size={10} /></a></p>}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ProductField label="Kategori"><Input maxLength={60} value={form.category} onChange={(event) => updateForm("category", event.target.value)} placeholder="Contoh: Minuman" /></ProductField>
                        <ProductField label="Satuan"><Input maxLength={24} value={form.unit} onChange={(event) => updateForm("unit", event.target.value)} placeholder="pcs, kg, gelas..." /></ProductField>
                        <ProductField label="SKU"><Input maxLength={64} value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} placeholder="Otomatis jika dikosongkan" /></ProductField>
                        <ProductField label="Barcode"><Input maxLength={64} value={form.barcode} onChange={(event) => updateForm("barcode", event.target.value)} placeholder="EAN-13 otomatis jika kosong" /></ProductField>
                        <ProductField label="Harga modal"><Input type="number" min="0" step="1" value={form.purchasePrice} onChange={(event) => updateForm("purchasePrice", event.target.value)} /></ProductField>
                        <ProductField label="Harga jual" required><Input type="number" required min="0" step="1" value={form.salePrice} onChange={(event) => updateForm("salePrice", event.target.value)} placeholder="0" /></ProductField>
                        <ProductField label="Stok awal"><Input type="number" min="0" step="0.01" value={form.stock} onChange={(event) => updateForm("stock", event.target.value)} /></ProductField>
                        <ProductField label="Batas stok menipis"><Input type="number" min="0" step="0.01" value={form.minStock} onChange={(event) => updateForm("minStock", event.target.value)} /></ProductField>
                        <ProductField label="Catatan" className="sm:col-span-2"><textarea maxLength={500} rows={2} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Catatan tambahan (opsional)" className="w-full resize-y rounded-md border border-[#e5e9e5] px-3 py-2 text-xs text-[#2e3932] outline-none placeholder:text-[#aeb6b0] focus-visible:border-[#8ba995] focus-visible:ring-2 focus-visible:ring-[#8ba995]/20" /></ProductField>
                    </div>
                    {error && <p className="rounded-lg bg-[#fff4f2] p-3 text-[11px] leading-relaxed text-[#a8443a]" role="alert">{error}</p>}
                    <p className="text-[9px] text-[#929a94]">SKU dan barcode dibuat otomatis jika dibiarkan kosong.</p>
                    <div className="flex justify-end gap-2 border-t border-[#edf0eb] pt-4"><Button variant="outline" type="button" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan produk"}</Button></div>
                </form>
            </section>
        </div>
    );
}

function ProductRow({ product, showImage, onDetail, onDelete }) {
    const lowStock = Number(product.stock) <= Number(product.minStock);
    return (
        <tr className="border-b border-[#f0f2ef] text-[10px] last:border-0">
            {showImage && <td className="py-3 pl-2">{product.imageData ? <img className="size-9 rounded-lg border border-[#edf0eb] object-cover" src={product.imageData} alt={product.name} /> : <span className="grid size-9 place-items-center rounded-lg bg-[#f5f7f4] text-[#a3ada5]"><PackageOpen size={15} /></span>}</td>}
            <td className="py-3"><button type="button" onClick={onDetail} className="block max-w-full truncate text-left font-semibold text-[#455148] hover:text-[#315b49]" title="Lihat detail produk">{product.name}</button><span className="mt-1 block text-[9px] text-[#a0a8a1]">{product.barcode || "—"}</span></td>
            <td className="py-3 text-[#7f8982]">{product.category || "Tanpa kategori"}</td>
            <td className="py-3 font-medium text-[#4c5a50]">{currency.format(Number(product.salePrice) || 0)}</td>
            <td className="py-3"><span className={`rounded-md px-2 py-1 ${lowStock ? "bg-[#fff3eb] text-[#a66e43]" : "bg-[#eff5ef] text-[#5e8065]"}`}>{Number(product.stock)} {product.unit}</span></td>
            <td className="py-3 text-[#89938b]">{product.sku || "—"}</td>
            <td className="py-3"><div className="flex justify-end gap-1"><button type="button" onClick={onDetail} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[9px] font-medium text-[#52755b] hover:bg-[#f1f5f0]" title="Detail produk"><Eye size={12} />Detail</button><button type="button" onClick={onDelete} className="grid size-7 place-items-center rounded-md text-[#aa7166] hover:bg-[#fff3ef]" title="Hapus produk" aria-label={`Hapus ${product.name}`}><Trash2 size={13} /></button></div></td>
        </tr>
    );
}

function ProductMobileCard({ product, showImage, onDetail, onDelete }) {
    const lowStock = Number(product.stock) <= Number(product.minStock);
    return (
        <div className="flex items-center gap-3 rounded-lg border border-[#edf0eb] p-3">
            {showImage && (product.imageData
                ? <img className="size-12 shrink-0 rounded-lg object-cover" src={product.imageData} alt={product.name} />
                : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#f5f7f4] text-[#a3ada5]"><PackageOpen size={17} /></span>)}
            <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-[#455148]">{product.name}</p><p className="mt-1 truncate text-[9px] text-[#929a94]">{product.category || "Tanpa kategori"}{product.sku ? ` · ${product.sku}` : ""}</p></div>
            <div className="text-right"><p className="text-[10px] font-semibold text-[#4c5a50]">{currency.format(Number(product.salePrice) || 0)}</p><p className={`mt-1 text-[9px] ${lowStock ? "text-[#a66e43]" : "text-[#7a8c7d]"}`}>{Number(product.stock)} {product.unit}</p><div className="mt-2 flex justify-end gap-1"><button type="button" onClick={onDetail} className="rounded px-1.5 py-1 text-[8px] font-medium text-[#52755b] hover:bg-[#f1f5f0]">Detail</button><button type="button" onClick={onDelete} className="rounded px-1.5 py-1 text-[#aa7166] hover:bg-[#fff3ef]" aria-label={`Hapus ${product.name}`}><Trash2 size={12} /></button></div></div>
        </div>
    );
}

function ProductField({ label, required = false, className = "", children }) {
    return <div className={className}><Label className="mb-1.5 block">{label}{required && <span className="ml-1 text-[#ae6d5b]">*</span>}</Label>{children}</div>;
}

function ProductDetailDialog({ product, showImage, onClose, onPrint, onDelete }) {
    return (
        <div className="fixed inset-0 z-[9998] grid place-items-center bg-[#1c2a22]/35 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
                <div className="flex items-start justify-between border-b border-[#edf0eb] px-5 py-4 sm:px-6">
                    <div><p className="text-[9px] font-bold tracking-[0.15em] text-[#849087]">KATALOG USAHA</p><h2 id="product-detail-title" className="mt-1 text-base font-semibold text-[#344139]">Detail produk</h2></div>
                    <Button variant="ghost" className="size-8 min-h-8 px-0" onClick={onClose} aria-label="Tutup"><X size={16} /></Button>
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-[140px_minmax(0,1fr)] sm:p-6">
                    {showImage && <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-[#f3f6f2] text-[#a0aaa2]">{product.imageData ? <img className="size-full object-cover" src={product.imageData} alt={product.name} /> : <PackageOpen size={28} />}</div>}
                    <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-[#354139]">{product.name}</h3><p className="mt-1 text-xs font-semibold text-[#5c7d63]">{currency.format(Number(product.salePrice) || 0)}</p>
                        {(product.imageAttribution || product.imageLicense || product.imageSourceUrl) && <p className="mt-2 text-[9px] leading-4 text-[#89938b]">{product.imageAttribution}{product.imageLicense && <> · <a href={product.imageLicenseUrl} target="_blank" rel="noreferrer" className="font-medium text-[#52755b] underline">{product.imageLicense}</a></>}{product.imageSourceUrl && <> · <a href={product.imageSourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#52755b] underline">Sumber gambar <ExternalLink size={10} /></a></>}</p>}
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[9px]">
                            <DetailValue label="SKU" value={product.sku} /><DetailValue label="Barcode" value={product.barcode} />
                            <DetailValue label="Kategori" value={product.category} /><DetailValue label="Satuan" value={product.unit} />
                            <DetailValue label="Harga modal" value={currency.format(Number(product.purchasePrice) || 0)} /><DetailValue label="Stok" value={`${Number(product.stock)} ${product.unit}`} />
                            <DetailValue label="Batas stok menipis" value={`${Number(product.minStock)} ${product.unit}`} />
                        </dl>
                        {product.notes && <p className="mt-4 rounded-lg bg-[#f8faf7] p-3 text-[9px] leading-4 text-[#78847e]">{product.notes}</p>}
                    </div>
                </div>
                <div className="border-t border-[#edf0eb] p-5 sm:px-6">
                    <div className="mb-4 rounded-xl border border-[#edf0eb] bg-[#fcfdfa] p-4 text-center"><p className="mb-2 flex items-center justify-center gap-1.5 text-[8px] font-semibold uppercase tracking-wider text-[#99a29b]"><Barcode size={12} />Pratinjau barcode · Code 128</p><BarcodePreview value={product.barcode || product.sku} /></div>
                    <div className="flex flex-wrap justify-between gap-2"><Button variant="ghost" onClick={onDelete} className="text-[#a2695e]"><Trash2 size={13} />Hapus produk</Button><div className="flex gap-2"><Button variant="outline" onClick={onClose}>Tutup</Button><Button onClick={onPrint}><Printer size={14} />Print barcode</Button></div></div>
                </div>
            </section>
        </div>
    );
}

function DetailValue({ label, value }) {
    return <div className="min-w-0"><dt className="text-[#9aa29c]">{label}</dt><dd className="mt-1 truncate font-medium text-[#4e5b52]">{value || "—"}</dd></div>;
}

function BarcodePreview({ value }) {
    const svgRef = useRef(null);
    useEffect(() => {
        if (!svgRef.current || !value) return;
        try {
            JsBarcode(svgRef.current, String(value), { format: "CODE128", displayValue: true, height: 48, width: 1.6, margin: 4, fontSize: 11, lineColor: "#26332c" });
        } catch {
            svgRef.current.dataset.invalid = "true";
            svgRef.current.replaceChildren();
        }
    }, [value]);
    return value ? <svg ref={svgRef} className="mx-auto max-w-full" aria-label={`Barcode ${value}`} /> : <p className="text-[9px] text-[#a66e43]">SKU/barcode belum tersedia.</p>;
}

function BarcodeLabel({ product }) {
    return <div className="mx-auto w-[75mm] border border-dashed border-gray-300 px-3 py-2 text-center text-black">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <BarcodePreview value={product.barcode || product.sku} />
        <p className="mt-1 text-[10px]">{product.sku || ""}</p>
    </div>;
}

function CatalogPrint({ products, showImage }) {
    return <div className="text-black">
        <h1 className="mb-1 text-xl font-semibold">Katalog Barang</h1><p className="mb-4 text-xs">Dicetak {new Date().toLocaleString("id-ID")}</p>
        <table className="w-full border-collapse text-left text-[10px]"><thead><tr className="border-y border-gray-400">{showImage && <th className="p-2">Gambar</th>}<th className="p-2">Nama produk</th><th className="p-2">SKU</th><th className="p-2">Barcode</th><th className="p-2">Kategori</th><th className="p-2 text-right">Harga jual</th><th className="p-2 text-right">Stok</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-gray-200">{showImage && <td className="p-2">{product.imageData ? <img src={product.imageData} alt="" className="h-10 w-10 object-contain" /> : "—"}</td>}<td className="p-2 font-medium">{product.name}</td><td className="p-2">{product.sku || "—"}</td><td className="p-2">{product.barcode || "—"}</td><td className="p-2">{product.category || "—"}</td><td className="p-2 text-right">{currency.format(Number(product.salePrice) || 0)}</td><td className="p-2 text-right">{Number(product.stock)} {product.unit}</td></tr>)}</tbody></table>
    </div>;
}
