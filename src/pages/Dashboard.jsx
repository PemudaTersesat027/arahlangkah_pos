import { useEffect, useState } from "react";
import {
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    ChartNoAxesCombined,
    CircleDollarSign,
    Clock3,
    PackagePlus,
    Package,
    ReceiptText,
    ShoppingCart,
    Wallet,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const paymentLabels = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer", ewallet: "E-wallet" };

function localDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function Dashboard({ bridge, business, user, onNavigate }) {
    const now = new Date();
    const todayIso = localDate(now);
    const weekStartDate = new Date(now);
    weekStartDate.setDate(weekStartDate.getDate() - 6);
    const weekStartIso = localDate(weekStartDate);
    const [summary, setSummary] = useState(null);
    const [report, setReport] = useState(null);
    const [dataError, setDataError] = useState("");
    const backendReady = typeof bridge?.getFinanceSummary === "function"
        && typeof bridge?.getReportData === "function";
    const hour = now.getHours();
    const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";
    const firstName = user?.fullName?.trim().split(/\s+/)[0] || "Pemilik";
    const today = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(now);

    useEffect(() => {
        if (!backendReady) return;
        setDataError("");
        bridge.getFinanceSummary(todayIso, todayIso, (result) => {
            if (result?.success) setSummary(result);
            else setDataError(result?.error || "Ringkasan keuangan belum dapat dimuat.");
        });
        bridge.getReportData(weekStartIso, todayIso, (result) => {
            if (result?.success) setReport(result);
            else setDataError(result?.error || "Data laporan belum dapat dimuat.");
        });
    }, [bridge, backendReady, todayIso, weekStartIso]);

    const stats = [
        { label: "Penjualan hari ini", value: currency.format(summary?.revenue || 0), note: summary?.transactionCount ? "Total penjualan tercatat" : "Belum ada penjualan", icon: CircleDollarSign, tone: "green" },
        { label: "Transaksi", value: String(summary?.transactionCount || 0), note: "Transaksi hari ini", icon: ReceiptText, tone: "blue" },
        { label: "Pengeluaran", value: currency.format(summary?.expenses || 0), note: "Pengeluaran hari ini", icon: Wallet, tone: "amber" },
        { label: "Estimasi laba bersih", value: currency.format(summary?.netProfit || 0), note: "Laba kotor dikurangi biaya", icon: ChartNoAxesCombined, tone: "violet" },
    ];
    const dailySales = report?.dailySales || [];
    const maxDailyTotal = Math.max(1, ...dailySales.map((row) => Number(row.total) || 0));

    return (
        <div className="mx-auto max-w-[1440px] space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[#849087]">RINGKASAN USAHA</p>
                    <h1 className="mt-2 font-serif text-3xl font-normal tracking-[-0.04em] text-[#26372e] sm:text-[38px]">
                        {greeting}, {firstName}.
                    </h1>
                    <p className="mt-2 text-xs text-[#87928a]">Ini ringkasan aktivitas {business?.name || "usaha Anda"}.</p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#e7ebe5] bg-white px-3 py-2.5 text-[11px] font-medium text-[#627067] shadow-sm">
                    <CalendarDays size={15} className="text-[#6f8d77]" />
                    <span className="capitalize">{today}</span>
                </div>
            </header>

            {!backendReady && <div className="rounded-lg border border-[#eeddbd] bg-[#fffaf0] px-4 py-3 text-[10px] leading-5 text-[#8a6b39]" role="alert">
                Backend aplikasi yang sedang berjalan masih versi lama. Tutup NexusPOS, lalu jalankan `build_nexuspos_v2/Debug/QtReactApp.exe` agar dashboard dan transaksi tersambung.
            </div>}
            {dataError && <div className="rounded-lg border border-[#eeddbd] bg-[#fffaf0] px-4 py-3 text-[10px] leading-5 text-[#8a6b39]" role="alert">{dataError}</div>}

            <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Ringkasan hari ini">
                {stats.map(({ label, value, note, icon: Icon, tone }) => (
                    <StatCard key={label} label={label} value={value} note={note} icon={Icon} tone={tone} />
                ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
                <Card className="overflow-hidden rounded-xl shadow-none">
                    <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-[#354139]">Performa penjualan</h2>
                                <p className="mt-1 text-[10px] text-[#98a19a]">Tren penjualan selama 7 hari terakhir</p>
                            </div>
                            <span className="rounded-md bg-[#f3f6f2] px-2.5 py-1.5 text-[9px] font-semibold text-[#66806d]">7 hari terakhir</span>
                        </div>

                        <div className="relative mt-5 h-[205px] overflow-hidden">
                            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                                {[0, 1, 2, 3].map((index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <span className="w-10 text-right text-[9px] text-[#a3aaa4]">{index === 0 ? "Tertinggi" : ""}</span>
                                        <span className="h-px flex-1 border-t border-dashed border-[#e8ece7]" />
                                    </div>
                                ))}
                            </div>
                            {dailySales.length > 0 ? <div className="absolute inset-y-2 left-[56px] right-1 flex items-end justify-around gap-2 pb-5">
                                {dailySales.slice(-7).map((row) => <div key={row.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${row.date}: ${currency.format(row.total)}`}>
                                    <span className="w-full max-w-9 rounded-t-md bg-[#86a68a] transition hover:bg-[#63876a]" style={{ height: `${Math.max(5, (Number(row.total) / maxDailyTotal) * 85)}%` }} />
                                    <span className="text-[8px] text-[#a3aaa4]">{new Date(`${row.date}T12:00:00`).toLocaleDateString("id-ID", { weekday: "short" })}</span>
                                </div>)}
                            </div> : <div className="absolute inset-0 left-[54px] grid place-items-center">
                                <div className="rounded-lg border border-[#edf0eb] bg-white/95 px-4 py-3 text-center shadow-sm">
                                    <ChartNoAxesCombined size={18} className="mx-auto text-[#91a393]" />
                                    <p className="mt-2 text-[10px] font-semibold text-[#627067]">Belum ada data penjualan</p>
                                    <p className="mt-1 text-[9px] text-[#9aa29c]">Grafik akan terisi setelah transaksi pertama.</p>
                                </div>
                            </div>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl shadow-none">
                    <CardContent className="p-5 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-[#354139]">Sekilas hari ini</h2>
                                <p className="mt-1 text-[10px] text-[#98a19a]">Pergerakan kas usaha</p>
                            </div>
                            <span className="grid size-9 place-items-center rounded-lg bg-[#f1f5f0] text-[#66806d]"><Wallet size={17} /></span>
                        </div>
                        <div className="mt-5 divide-y divide-[#eef0ed]">
                            <SummaryRow icon={ArrowUpRight} label="Uang masuk" value={currency.format(summary?.revenue || 0)} tone="text-[#578067]" />
                            <SummaryRow icon={ArrowDownRight} label="Uang keluar" value={currency.format(summary?.expenses || 0)} tone="text-[#ad7862]" />
                            <SummaryRow icon={CircleDollarSign} label="Selisih hari ini" value={currency.format(summary?.netProfit || 0)} tone="text-[#4e6f58]" />
                        </div>
                        <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#f7f8f5] p-3 text-[9px] leading-4 text-[#89938b]">
                            <Clock3 size={13} className="mt-0.5 shrink-0" />
                            Ringkasan keuangan diperbarui saat transaksi dan pengeluaran dicatat.
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
                <Card className="rounded-xl shadow-none">
                    <CardContent className="p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-[#354139]">Transaksi terbaru</h2>
                                <p className="mt-1 text-[10px] text-[#98a19a]">Aktivitas penjualan terkini</p>
                            </div>
                            <Button variant="ghost" onClick={() => onNavigate("reports")} className="min-h-8 gap-1 px-2 text-[10px]">Lihat laporan<ArrowRight size={13} /></Button>
                        </div>
                        {(report?.recentSales || []).length > 0 ? <div className="mt-4 divide-y divide-[#f0f2ef]">{report.recentSales.slice(0, 4).map((sale) => <div key={sale.id} className="flex items-center justify-between gap-3 py-2.5 text-[9px]"><span className="min-w-0"><span className="block truncate font-medium text-[#4c5950]">{sale.receiptNo}</span><span className="mt-1 block text-[#9aa29c]">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span></span><span className="shrink-0 font-semibold text-[#536057]">{currency.format(sale.total)}</span></div>)}</div> : <div className="mt-5 flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-[#e6eae4] bg-[#fbfcfa] px-4 text-center"><span className="grid size-9 place-items-center rounded-full bg-[#f0f4ef] text-[#78917d]"><ReceiptText size={17} /></span><p className="mt-2 text-[10px] font-semibold text-[#59665d]">Belum ada transaksi</p><p className="mt-1 text-[9px] text-[#9aa29c]">Transaksi yang tercatat akan muncul di sini.</p></div>}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-[#dce7dd] bg-[#f4f7f2] shadow-none">
                    <CardContent className="relative p-5 sm:p-6">
                        <span className="absolute -right-7 -top-8 size-28 rounded-full border border-[#dce7dd]" />
                        <span className="absolute -right-1 top-5 size-12 rounded-full bg-[#e6eee5]" />
                        <div className="relative">
                            <span className="grid size-9 place-items-center rounded-lg bg-white text-[#5c7b63] shadow-sm"><PackagePlus size={17} /></span>
                            <p className="mt-5 text-[9px] font-bold tracking-[0.15em] text-[#819183]">AKSES CEPAT</p>
                            <h2 className="mt-2 max-w-[220px] font-serif text-[23px] font-normal leading-tight text-[#34483a]">Mau mulai dari mana?</h2>
                            <p className="mt-2 text-[10px] leading-5 text-[#7d8d80]">Buka kasir untuk transaksi atau siapkan katalog produk.</p>
                            <div className="mt-5 grid gap-2">
                                <Button onClick={() => onNavigate("cashier")} className="min-h-10 justify-between bg-[#315b49] text-[10px] hover:bg-[#254a39]">
                                    <span className="inline-flex items-center gap-2"><ShoppingCart size={14} />Buka halaman kasir</span><ArrowRight size={14} />
                                </Button>
                                <Button onClick={() => onNavigate("products")} variant="outline" className="min-h-10 justify-between border-[#dfe7dd] bg-white/70 text-[10px]">
                                    <span className="inline-flex items-center gap-2"><Package size={14} />Lihat halaman produk</span><ArrowRight size={14} />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function StatCard({ label, value, note, icon: Icon, tone }) {
    const tones = {
        green: "bg-[#edf4ee] text-[#5b8064]",
        blue: "bg-[#eef3f7] text-[#68839a]",
        amber: "bg-[#f8f3e9] text-[#a18451]",
        violet: "bg-[#f3f0f7] text-[#81729b]",
    };

    return (
        <Card className="rounded-xl shadow-none">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-medium text-[#87928a]">{label}</p>
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon size={16} /></span>
                </div>
                <p className="mt-3 text-[25px] font-semibold tracking-[-0.04em] text-[#344139]">{value}</p>
                <p className="mt-1 text-[9px] text-[#a0a8a1]">{note}</p>
            </CardContent>
        </Card>
    );
}

function SummaryRow({ icon: Icon, label, value, tone }) {
    return (
        <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="flex items-center gap-2 text-[10px] text-[#7f8982]"><Icon size={14} className={tone} />{label}</span>
            <span className="text-[11px] font-semibold text-[#4a564e]">{value}</span>
        </div>
    );
}
