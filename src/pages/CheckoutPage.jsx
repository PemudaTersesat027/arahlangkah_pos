import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Banknote,
    Check,
    CreditCard,
    FileText,
    Landmark,
    Printer,
    QrCode,
    ReceiptText,
    Smartphone,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import ALPOSLogo from "../assets/alpos-logo.png";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const methods = [
    { id: "cash", label: "Tunai", icon: Banknote, note: "Hitung kembalian otomatis" },
    { id: "qris", label: "QRIS", icon: QrCode, note: "Konfirmasi pembayaran manual" },
    { id: "card", label: "Kartu debit/kredit", icon: CreditCard, note: "Konfirmasi mesin EDC manual" },
    { id: "transfer", label: "Transfer bank", icon: Landmark, note: "Konfirmasi mutasi manual" },
    { id: "ewallet", label: "E-wallet", icon: Smartphone, note: "Konfirmasi pembayaran manual" },
];
const methodNames = Object.fromEntries(methods.map((method) => [method.id, method.label]));

export default function CheckoutPage({ bridge, cart, user, business, onBack, onComplete, onNavigate }) {
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.salePrice) * item.quantity, 0), [cart]);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [amountReceived, setAmountReceived] = useState("");
    const [amountReceivedEdited, setAmountReceivedEdited] = useState(false);
    const [discount, setDiscount] = useState("0");
    const [taxRate, setTaxRate] = useState("0");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerNote, setCustomerNote] = useState("");
    const [confirmedNonCash, setConfirmedNonCash] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [receipt, setReceipt] = useState(null);
    const [printChoiceOpen, setPrintChoiceOpen] = useState(false);
    const [printFormat, setPrintFormat] = useState(null);

    useEffect(() => {
        if (!receipt || !printFormat) return undefined;
        const previousTitle = document.title;
        document.title = `ALPOS-${printFormat}-${receipt.receiptNo}`;
        const style = document.createElement("style");
        const invoicePage = printFormat === "invoice";
        style.textContent = `@media print { @page { size: ${invoicePage ? "A4" : "80mm auto"}; margin: ${invoicePage ? "12mm" : "2mm"}; } body { background: white !important; } body * { visibility: hidden !important; } #nexus-receipt-print-area, #nexus-receipt-print-area * { visibility: visible !important; } #nexus-receipt-print-area { display: block !important; position: fixed !important; inset: 0 !important; width: ${invoicePage ? "100%" : "76mm"} !important; max-width: ${invoicePage ? "100%" : "76mm"} !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; background: white !important; } }`;
        document.head.appendChild(style);
        const afterPrint = () => setPrintFormat(null);
        window.addEventListener("afterprint", afterPrint, { once: true });
        const timer = window.setTimeout(() => window.print(), 250);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("afterprint", afterPrint);
            document.title = previousTitle;
            style.remove();
        };
    }, [receipt, printFormat]);

    const discountAmount = Math.max(0, Number(discount) || 0);
    const taxRateValue = Math.min(100, Math.max(0, Number(taxRate) || 0));
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(taxableAmount * taxRateValue / 100);
    const total = taxableAmount + taxAmount;
    const change = Math.max(0, (Number(amountReceived) || 0) - total);
    const cashIsEnough = paymentMethod !== "cash" || (Number(amountReceived) || 0) >= total;

    useEffect(() => {
        if (!amountReceivedEdited) setAmountReceived(String(total));
    }, [amountReceivedEdited, total]);

    const openPrintChoice = () => setPrintChoiceOpen(true);
    const printReceipt = (format) => {
        setPrintChoiceOpen(false);
        setPrintFormat(format);
    };

    const submitTransaction = (event) => {
        event.preventDefault();
        if (!bridge || busy || cart.length === 0) return;
        if (paymentMethod === "cash" && !cashIsEnough) {
            setError("Nominal uang diterima kurang dari total pembayaran.");
            return;
        }
        if (paymentMethod !== "cash" && !confirmedNonCash) {
            setError("Konfirmasikan bahwa pembayaran non-tunai sudah diterima.");
            return;
        }

        setBusy(true);
        setError("");
        bridge.createTransaction({
            items: cart.map(({ product, quantity }) => ({ productId: Number(product.id), quantity: Number(quantity) })),
            paymentMethod,
            amountReceived: paymentMethod === "cash" ? Number(amountReceived) : total,
            discount: discountAmount,
            taxRate: taxRateValue,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerAddress: customerAddress.trim(),
            customerNote: customerNote.trim(),
            cashierId: Number(user?.id) || 0,
            cashierName: user?.fullName || "Kasir",
        }, (result) => {
            setBusy(false);
            if (!result?.success) {
                setError(result?.error || "Transaksi belum berhasil disimpan.");
                return;
            }
            setReceipt(result);
            onComplete();
            setPrintChoiceOpen(true);
        });
    };

    if (receipt) {
        return (
            <div className="mx-auto max-w-2xl">
                <Card className="overflow-hidden rounded-2xl shadow-none">
                    <div className="grid justify-items-center bg-[#edf4ee] px-6 py-8 text-center">
                        <span className="grid size-12 place-items-center rounded-full bg-white text-[#4f8060] shadow-sm"><Check size={22} /></span>
                        <p className="mt-4 text-[9px] font-bold tracking-[0.16em] text-[#6e8a74]">TRANSAKSI TERSIMPAN</p>
                        <h1 className="mt-1 font-serif text-2xl font-normal text-[#304438]">Pembayaran berhasil</h1>
                        <p className="mt-1 text-[10px] text-[#7e9081]">Nomor struk · {receipt.receiptNo}</p>
                    </div>
                    <CardContent className="p-5 sm:p-7">
                        <div className="space-y-3 border-b border-dashed border-[#dfe5de] pb-4">
                            {(receipt.items || []).map((item) => <div key={item.productId} className="flex justify-between gap-3 text-[10px]">
                                <span className="min-w-0 truncate text-[#657269]">{item.name} <span className="text-[#9aa29c]">× {item.quantity} {item.unit}</span></span>
                                <span className="shrink-0 font-medium text-[#4a584e]">{currency.format(item.lineTotal)}</span>
                            </div>)}
                        </div>
                        <div className="mt-4 space-y-2 text-[10px]">
                            <ReceiptLine label="Subtotal" value={currency.format(receipt.subtotal)} />
                            <ReceiptLine label="Diskon" value={currency.format(receipt.discount)} />
                            {Number(receipt.taxAmount) > 0 && <ReceiptLine label={`Pajak / PPN (${receipt.taxRate}%)`} value={currency.format(receipt.taxAmount)} />}
                            <ReceiptLine label={`Pembayaran · ${methodNames[receipt.paymentMethod] || receipt.paymentMethod}`} value={currency.format(receipt.total)} />
                            {receipt.paymentMethod === "cash" && <ReceiptLine label="Uang diterima" value={currency.format(receipt.amountReceived)} />}
                            {receipt.paymentMethod === "cash" && <ReceiptLine label="Kembalian" value={currency.format(receipt.change)} strong />}
                            <ReceiptLine label="Total" value={currency.format(receipt.total)} strong />
                        </div>
                        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
                            <Button variant="outline" onClick={() => onNavigate("dashboard")}>Ke ringkasan</Button>
                            <Button variant="outline" onClick={openPrintChoice}><Printer size={14} />Cetak ulang</Button>
                            <Button onClick={onBack}><ReceiptText size={14} />Transaksi baru</Button>
                        </div>
                    </CardContent>
                </Card>
                <div id="nexus-receipt-print-area" className="hidden">
                    {printFormat === "invoice"
                        ? <InvoicePaper business={business} user={user} receipt={receipt} />
                        : <ReceiptPaper business={business} user={user} receipt={receipt} />}
                </div>
                {printChoiceOpen && <PrintChoiceDialog onChoose={printReceipt} onSkip={() => setPrintChoiceOpen(false)} />}
            </div>
        );
    }

    if (cart.length === 0) {
        return <div className="mx-auto max-w-xl"><Card><CardContent className="p-7 text-center"><ReceiptText size={22} className="mx-auto text-[#809285]" /><h1 className="mt-3 text-sm font-semibold text-[#405047]">Keranjang kosong</h1><p className="mt-1 text-[10px] text-[#89938b]">Pilih barang di halaman kasir sebelum checkout.</p><Button className="mt-4" onClick={onBack}><ArrowLeft size={14} />Kembali ke kasir</Button></CardContent></Card></div>;
    }

    return (
        <div className="mx-auto max-w-[1150px] space-y-5">
            <header className="flex items-center gap-3">
                <Button variant="outline" className="size-9 min-h-9 px-0" onClick={onBack} aria-label="Kembali ke kasir"><ArrowLeft size={15} /></Button>
                <div><p className="text-[9px] font-bold tracking-[0.15em] text-[#849087]">LANGKAH TERAKHIR</p><h1 className="mt-1 font-serif text-3xl font-normal text-[#26372e]">Checkout</h1></div>
            </header>

            <form onSubmit={submitTransaction} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
                <div className="space-y-5">
                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <div className="mb-4"><h2 className="text-xs font-semibold text-[#3e4d43]">Informasi faktur <span className="font-normal text-[#929a94]">(opsional)</span></h2><p className="mt-1 text-[9px] text-[#929a94]">Isi jika pelanggan meminta faktur A4.</p></div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div><Label htmlFor="customer-name" className="mb-1.5 block text-[9px]">Nama pelanggan</Label><Input id="customer-name" maxLength={120} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nama pelanggan" /></div>
                            <div><Label htmlFor="customer-phone" className="mb-1.5 block text-[9px]">Nomor telepon</Label><Input id="customer-phone" type="tel" maxLength={40} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="08xx xxxx xxxx" /></div>
                            <div className="sm:col-span-2"><Label htmlFor="customer-address" className="mb-1.5 block text-[9px]">Alamat</Label><Input id="customer-address" maxLength={240} value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Alamat pelanggan" /></div>
                            <div className="sm:col-span-2"><Label htmlFor="invoice-note" className="mb-1.5 block text-[9px]">Catatan faktur</Label><Input id="invoice-note" maxLength={240} value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder="Contoh: barang dikirim ke lokasi proyek" /></div>
                        </div>
                    </CardContent></Card>

                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <div className="mb-4"><h2 className="text-xs font-semibold text-[#3e4d43]">Pilih metode pembayaran</h2><p className="mt-1 text-[9px] text-[#929a94]">Pilih cara pelanggan membayar transaksi ini.</p></div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {methods.map(({ id, label, icon: Icon, note }) => <button key={id} type="button" onClick={() => { setPaymentMethod(id); setConfirmedNonCash(false); setError(""); }} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${paymentMethod === id ? "border-[#91ad96] bg-[#f4f8f3] ring-1 ring-[#91ad96]/25" : "border-[#e8ece7] hover:bg-[#fafbf9]"}`}>
                                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${paymentMethod === id ? "bg-white text-[#52755b]" : "bg-[#f5f7f4] text-[#89958c]"}`}><Icon size={17} /></span>
                                <span className="min-w-0"><span className="block text-[10px] font-semibold text-[#435047]">{label}</span><span className="mt-1 block text-[8px] text-[#929a94]">{note}</span></span>
                                <span className={`ml-auto grid size-4 shrink-0 place-items-center rounded-full border ${paymentMethod === id ? "border-[#52755b] bg-[#52755b] text-white" : "border-[#d5ddd5]"}`}>{paymentMethod === id && <Check size={10} />}</span>
                            </button>)}
                        </div>

                        {paymentMethod === "cash" ? (
                            <div className="mt-5 rounded-xl bg-[#f8faf7] p-4">
                                <Label htmlFor="cash-received" className="mb-2 block">Nominal uang diterima</Label>
                                <div className="flex gap-2"><Input id="cash-received" autoFocus type="number" min={total} step="1" value={amountReceived} onChange={(event) => { setAmountReceived(event.target.value); setAmountReceivedEdited(true); }} className="h-11" /><Button type="button" variant="outline" className="h-11 shrink-0" onClick={() => { setAmountReceived(String(total)); setAmountReceivedEdited(true); }}>Uang pas</Button></div>
                                <div className="mt-3 flex items-center justify-between text-[10px]"><span className="text-[#87928a]">Kembalian</span><strong className="text-sm font-semibold text-[#4f7959]">{currency.format(change)}</strong></div>
                            </div>
                        ) : (
                            <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl bg-[#f8faf7] p-4">
                                <input type="checkbox" checked={confirmedNonCash} onChange={(event) => { setConfirmedNonCash(event.target.checked); setError(""); }} className="mt-0.5 accent-[#315b49]" />
                                <span><span className="block text-[10px] font-semibold text-[#506056]">Pembayaran sudah diterima</span><span className="mt-1 block text-[9px] leading-4 text-[#8b968e]">Konfirmasi manual setelah memeriksa pembayaran di aplikasi/perangkat terkait. ALpos belum terhubung ke payment gateway.</span></span>
                            </label>
                        )}
                    </CardContent></Card>

                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xs font-semibold text-[#3e4d43]">Rincian belanja</h2><p className="mt-1 text-[9px] text-[#929a94]">{cart.reduce((sum, item) => sum + item.quantity, 0)} item</p></div><Button variant="ghost" className="min-h-8 px-2 text-[9px]" onClick={onBack}><ArrowLeft size={12} />Ubah pesanan</Button></div>
                        <div className="divide-y divide-[#f0f2ef]">{cart.map(({ product, quantity }) => <div key={product.id} className="flex justify-between gap-3 py-2.5 text-[10px]"><span className="min-w-0 truncate text-[#66736a]">{product.name} <span className="text-[#9aa29c]">× {quantity}</span></span><span className="shrink-0 font-medium text-[#4a584e]">{currency.format(Number(product.salePrice) * quantity)}</span></div>)}</div>
                    </CardContent></Card>
                </div>

                <aside className="lg:sticky lg:top-5">
                    <Card className="overflow-hidden rounded-xl shadow-none"><CardContent className="p-5">
                        <h2 className="text-xs font-semibold text-[#3e4d43]">Total pembayaran</h2>
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#e8ece7] px-3"><span className="text-[10px] text-[#8d9890]">Diskon</span><Input aria-label="Diskon transaksi" type="number" min="0" max={subtotal} step="1" value={discount} onChange={(event) => { setDiscount(event.target.value); setError(""); }} className="h-9 border-0 px-1 text-right shadow-none focus-visible:ring-0" /></div>
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#e8ece7] px-3"><Label htmlFor="tax-rate" className="shrink-0 text-[10px] text-[#8d9890]">Pajak / PPN %</Label><Input id="tax-rate" aria-label="Tarif pajak persen" type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(event) => { setTaxRate(event.target.value); setError(""); }} className="h-9 border-0 px-1 text-right shadow-none focus-visible:ring-0" /></div>
                        <div className="mt-4 space-y-2.5 text-[10px]"><ReceiptLine label="Subtotal" value={currency.format(subtotal)} /><ReceiptLine label="Diskon" value={`− ${currency.format(discountAmount)}`} /><ReceiptLine label={`Pajak / PPN (${taxRateValue}%)`} value={currency.format(taxAmount)} /></div>
                        <div className="my-4 border-t border-dashed border-[#dfe5de]" />
                        <div className="flex items-end justify-between"><span className="text-[10px] font-semibold text-[#58655c]">Total</span><span className="text-2xl font-semibold tracking-tight text-[#304438]">{currency.format(total)}</span></div>
                        {error && <p className="mt-4 rounded-lg bg-[#fff4f2] p-3 text-[9px] leading-4 text-[#a8443a]" role="alert">{error}</p>}
                        <Button type="submit" disabled={busy || (paymentMethod !== "cash" && !confirmedNonCash) || !cashIsEnough} className="mt-5 min-h-11 w-full justify-between px-4">{busy ? "Menyimpan transaksi..." : "Konfirmasi pembayaran"}<Check size={15} /></Button>
                        <p className="mt-2 text-center text-[8px] leading-4 text-[#9aa29c]">Stok akan dikurangi setelah transaksi berhasil disimpan.</p>
                    </CardContent></Card>
                </aside>
            </form>
        </div>
    );
}

function ReceiptLine({ label, value, strong = false }) {
    return <div className={`flex justify-between gap-3 ${strong ? "font-semibold text-[#405047]" : "text-[#87928a]"}`}><span>{label}</span><span className="text-right">{value}</span></div>;
}

function PrintChoiceDialog({ onChoose, onSkip }) {
    return (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-[#1c2a22]/40 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onSkip(); }}>
            <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="print-choice-title">
                <p className="text-[9px] font-bold tracking-[0.15em] text-[#849087]">TRANSAKSI TERSIMPAN</p>
                <h2 id="print-choice-title" className="mt-2 font-serif text-2xl font-normal text-[#304438]">Mau cetak bukti transaksi?</h2>
                <p className="mt-2 text-[10px] leading-5 text-[#89938b]">Pilih ukuran kertas. Dialog printer akan terbuka setelah format dipilih.</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Button onClick={() => onChoose("receipt")} className="min-h-11 justify-start bg-[#315b49] px-3 text-[10px]"><ReceiptText size={15} />Struk 80 mm</Button>
                    <Button onClick={() => onChoose("invoice")} variant="outline" className="min-h-11 justify-start px-3 text-[10px]"><FileText size={15} />Faktur A4</Button>
                </div>
                <Button onClick={onSkip} variant="ghost" className="mt-3 min-h-9 w-full text-[10px]">Lewati, jangan cetak</Button>
            </section>
        </div>
    );
}

function ReceiptPaper({ business, user, receipt }) {
    const createdAt = new Date(receipt.createdAt).toLocaleString("id-ID");
    return (
        <article className="mx-auto text-black" style={{ width: "76mm", fontFamily: "monospace", fontSize: "9pt", lineHeight: 1.35 }}>
            <header className="text-center">
                <img src={business?.logoData || ALPOSLogo} alt="Logo" className="mx-auto mb-1 max-h-[18mm] max-w-[42mm] object-contain" />
                <h1 className="m-0 text-[12pt] font-bold">{business?.name || "ALpos"}</h1>
                {business?.address && <p className="m-0 mt-1 text-[8pt]">{business.address}</p>}
                {business?.phone && <p className="m-0 text-[8pt]">{business.phone}</p>}
                <p className="m-0 mt-2 border-y border-dashed border-black py-1 text-[8pt]">STRUK PEMBELIAN</p>
            </header>

            <div className="mt-2 space-y-0.5 text-[8pt]">
                <ReceiptPrintLine label="No" value={receipt.receiptNo} />
                <ReceiptPrintLine label="Waktu" value={createdAt} />
                <ReceiptPrintLine label="Kasir" value={user?.fullName || "Kasir"} />
                <ReceiptPrintLine label="Bayar" value={methodNames[receipt.paymentMethod] || receipt.paymentMethod} />
                {receipt.customerName && <ReceiptPrintLine label="Pelanggan" value={receipt.customerName} />}
            </div>

            <div className="my-2 border-t border-dashed border-black" />
            <div className="space-y-2">
                {(receipt.items || []).map((item, index) => <div key={`${item.productId}-${index}`} className="text-[8pt]">
                    <p className="m-0 break-words">{item.name}</p>
                    <ReceiptPrintLine label={`${item.quantity} ${item.unit} x ${currency.format(item.unitPrice)}`} value={currency.format(item.lineTotal)} />
                </div>)}
            </div>

            <div className="my-2 border-t border-dashed border-black" />
            <div className="space-y-0.5 text-[8pt]">
                <ReceiptPrintLine label="Subtotal" value={currency.format(receipt.subtotal)} />
                {Number(receipt.discount) > 0 && <ReceiptPrintLine label="Diskon" value={`-${currency.format(receipt.discount)}`} />}
                {Number(receipt.taxAmount) > 0 && <ReceiptPrintLine label={`Pajak ${receipt.taxRate}%`} value={currency.format(receipt.taxAmount)} />}
                <ReceiptPrintLine label="TOTAL" value={currency.format(receipt.total)} strong />
                {receipt.paymentMethod === "cash" && <>
                    <ReceiptPrintLine label="Tunai" value={currency.format(receipt.amountReceived)} />
                    <ReceiptPrintLine label="Kembali" value={currency.format(receipt.change)} strong />
                </>}
            </div>

            <footer className="mt-4 border-t border-dashed border-black pt-2 text-center text-[8pt]">
                <p className="m-0">Terima kasih telah berbelanja</p>
                <p className="m-0 mt-1">Simpan struk ini sebagai bukti transaksi.</p>
            </footer>
        </article>
    );
}

function InvoicePaper({ business, user, receipt }) {
    const createdAt = new Date(receipt.createdAt).toLocaleString("id-ID");
    return (
        <article className="mx-auto min-h-[270mm] w-full bg-white text-[#1d2721]" style={{ fontFamily: "Arial, sans-serif", fontSize: "10pt", lineHeight: 1.4 }}>
            <header className="flex items-start justify-between gap-8 border-b-2 border-[#315b49] pb-5">
                <div className="flex min-w-0 items-start gap-4">
                    <img src={business?.logoData || ALPOSLogo} alt="Logo usaha" className="h-[28mm] w-[38mm] shrink-0 object-contain" />
                    <div className="pt-1">
                        <h1 className="text-xl font-bold text-[#254a39]">{business?.name || "ALpos"}</h1>
                        {business?.address && <p className="mt-1 max-w-[105mm] whitespace-pre-wrap text-[9pt] text-[#4c5950]">{business.address}</p>}
                        {business?.phone && <p className="text-[9pt] text-[#4c5950]">Tel. {business.phone}</p>}
                        {business?.email && <p className="text-[9pt] text-[#4c5950]">{business.email}</p>}
                    </div>
                </div>
                <h2 className="shrink-0 pt-2 text-3xl font-bold tracking-[0.2em]">FAKTUR</h2>
            </header>

            <section className="mt-6 grid grid-cols-2 gap-8 text-[9pt]">
                <div>
                    <p className="mb-2 font-bold uppercase tracking-wide text-[#315b49]">Ditagihkan kepada</p>
                    <p className="font-semibold">{receipt.customerName || "Pelanggan umum"}</p>
                    {receipt.customerPhone && <p>Tel. {receipt.customerPhone}</p>}
                    {receipt.customerAddress && <p className="whitespace-pre-wrap">{receipt.customerAddress}</p>}
                </div>
                <div className="grid grid-cols-[30mm_1fr] content-start gap-y-1">
                    <strong>No. Faktur</strong><span>{receipt.receiptNo}</span>
                    <strong>Tanggal</strong><span>{createdAt}</span>
                    <strong>Kasir</strong><span>{user?.fullName || "Kasir"}</span>
                    <strong>Pembayaran</strong><span>{methodNames[receipt.paymentMethod] || receipt.paymentMethod}</span>
                </div>
            </section>

            <table className="mt-7 w-full border-collapse text-left text-[9pt]">
                <thead><tr className="border-y border-[#39443d] bg-[#f2f5f1]">
                    <th className="w-[9mm] px-2 py-2">No</th><th className="px-2 py-2">Nama barang / kode</th><th className="w-[18mm] px-2 py-2 text-right">Qty</th><th className="w-[20mm] px-2 py-2">Satuan</th><th className="w-[32mm] px-2 py-2 text-right">Harga</th><th className="w-[35mm] px-2 py-2 text-right">Subtotal</th>
                </tr></thead>
                <tbody>{(receipt.items || []).map((item, index) => <tr key={`${item.productId}-${index}`} className="border-b border-[#d9ded9] align-top">
                    <td className="px-2 py-2">{index + 1}</td>
                    <td className="px-2 py-2"><span className="block font-medium">{item.name}</span>{item.sku && <span className="mt-0.5 block text-[8pt] text-[#758078]">SKU: {item.sku}</span>}</td>
                    <td className="px-2 py-2 text-right">{item.quantity}</td>
                    <td className="px-2 py-2">{item.unit || "pcs"}</td>
                    <td className="px-2 py-2 text-right">{currency.format(item.unitPrice)}</td>
                    <td className="px-2 py-2 text-right">{currency.format(item.lineTotal)}</td>
                </tr>)}</tbody>
            </table>

            <section className="mt-5 flex justify-between gap-8">
                <div className="max-w-[100mm] text-[9pt]">
                    {receipt.customerNote && <><p className="font-bold">Catatan</p><p className="mt-1 whitespace-pre-wrap">{receipt.customerNote}</p></>}
                    <p className="mt-4 text-[8pt] text-[#758078]">Mohon periksa barang dan jumlah sebelum meninggalkan toko.</p>
                </div>
                <div className="w-[75mm] space-y-2 text-[9pt]">
                    <ReceiptLine label="Subtotal" value={currency.format(receipt.subtotal)} />
                    {Number(receipt.discount) > 0 && <ReceiptLine label="Diskon" value={`− ${currency.format(receipt.discount)}`} />}
                    {Number(receipt.taxAmount) > 0 && <ReceiptLine label={`Pajak / PPN (${receipt.taxRate}%)`} value={currency.format(receipt.taxAmount)} />}
                    <div className="border-t-2 border-[#39443d] pt-2"><ReceiptLine label="Grand Total" value={currency.format(receipt.total)} strong /></div>
                    {receipt.paymentMethod === "cash" && <>
                        <ReceiptLine label="Uang diterima" value={currency.format(receipt.amountReceived)} />
                        <ReceiptLine label="Kembalian" value={currency.format(receipt.change)} strong />
                    </>}
                </div>
            </section>

            <footer className="mt-12 grid grid-cols-2 gap-16 text-center text-[9pt]">
                <div><p>Penerima / Pembeli</p><div className="mx-auto mt-16 w-[55mm] border-t border-[#39443d]" /><p className="mt-2">{receipt.customerName || ""}</p></div>
                <div><p>{business?.name || "ALpos"}</p><div className="mx-auto mt-16 w-[55mm] border-t border-[#39443d]" /><p className="mt-2">{user?.fullName || "Kasir"}</p></div>
            </footer>
        </article>
    );
}

function ReceiptPrintLine({ label, value, strong = false }) {
    return <div className={`flex justify-between gap-2 ${strong ? "font-bold" : ""}`}><span className="min-w-0 break-words">{label}</span><span className="shrink-0 text-right">{value}</span></div>;
}
