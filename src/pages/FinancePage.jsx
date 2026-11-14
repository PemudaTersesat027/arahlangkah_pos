import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, WalletCards } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const paymentLabels = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer", ewallet: "E-wallet" };
const emptyExpense = { category: "Operasional", description: "", amount: "", paymentMethod: "cash", date: today() };

export default function FinancePage({ bridge }) {
    const [fromDate, setFromDate] = useState(monthStart);
    const [toDate, setToDate] = useState(today);
    const [summary, setSummary] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseForm, setExpenseForm] = useState(emptyExpense);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadFinance = useCallback(() => {
        if (!bridge) return;
        bridge.getFinanceSummary(fromDate, toDate, (result) => {
            setLoading(false);
            if (!result?.success) {
                setError(result?.error || "Ringkasan keuangan belum dapat dimuat.");
                return;
            }
            setError("");
            setSummary(result);
        });
        bridge.getExpenses(fromDate, toDate, (result) => {
            if (result?.success) setExpenses(result.expenses || []);
        });
    }, [bridge, fromDate, toDate]);

    useEffect(() => { loadFinance(); }, [loadFinance]);

    const setPeriod = (period) => {
        const date = today();
        setToDate(date);
        setFromDate(period === "today" ? date : `${date.slice(0, 8)}01`);
    };

    const updateExpense = (key, value) => setExpenseForm((current) => ({ ...current, [key]: value }));

    const submitExpense = (event) => {
        event.preventDefault();
        if (!bridge || saving) return;
        setSaving(true);
        setError("");
        bridge.addExpense(expenseForm, (result) => {
            setSaving(false);
            if (!result?.success) {
                setError(result?.error || "Pengeluaran belum berhasil disimpan.");
                return;
            }
            setExpenseForm({ ...emptyExpense, date: today() });
            setShowExpenseForm(false);
            loadFinance();
        });
    };

    return (
        <div className="mx-auto max-w-[1400px] space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="text-[10px] font-bold tracking-[0.16em] text-[#849087]">ARUS KAS USAHA</p><h1 className="mt-2 font-serif text-3xl font-normal tracking-[-0.04em] text-[#26372e] sm:text-[38px]">Keuangan</h1><p className="mt-2 text-xs text-[#87928a]">Pantau pemasukan, pengeluaran, dan estimasi laba.</p></div>
                <Button onClick={() => { setError(""); setShowExpenseForm((open) => !open); }}><Plus size={14} />{showExpenseForm ? "Tutup form" : "Catat pengeluaran"}</Button>
            </header>

            <PeriodFilter fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} setPeriod={setPeriod} />
            {error && <p className="rounded-lg bg-[#fff4f2] p-3 text-xs text-[#a8443a]" role="alert">{error}</p>}

            {showExpenseForm && <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                <div className="mb-4"><h2 className="text-xs font-semibold text-[#3e4d43]">Pengeluaran baru</h2><p className="mt-1 text-[9px] text-[#929a94]">Catat biaya usaha untuk menghitung laba bersih.</p></div>
                <form onSubmit={submitExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <FinanceField label="Kategori"><Input required maxLength={60} value={expenseForm.category} onChange={(event) => updateExpense("category", event.target.value)} placeholder="Operasional" /></FinanceField>
                    <FinanceField label="Keterangan"><Input maxLength={160} value={expenseForm.description} onChange={(event) => updateExpense("description", event.target.value)} placeholder="Contoh: listrik" /></FinanceField>
                    <FinanceField label="Nominal"><Input required type="number" min="1" step="1" value={expenseForm.amount} onChange={(event) => updateExpense("amount", event.target.value)} placeholder="0" /></FinanceField>
                    <FinanceField label="Tanggal"><Input required type="date" value={expenseForm.date} onChange={(event) => updateExpense("date", event.target.value)} /></FinanceField>
                    <FinanceField label="Metode bayar"><select value={expenseForm.paymentMethod} onChange={(event) => updateExpense("paymentMethod", event.target.value)} className="h-10 w-full rounded-md border border-[#e5e9e5] bg-white px-3 text-xs text-[#435047] outline-none focus:border-[#8ba995]">{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></FinanceField>
                    <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-5"><Button variant="outline" type="button" onClick={() => setShowExpenseForm(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan pengeluaran"}</Button></div>
                </form>
            </CardContent></Card>}

            {loading && !summary ? <div className="grid min-h-48 place-items-center text-xs text-[#89938b]">Memuat ringkasan...</div> : <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <FinanceMetric label="Pemasukan penjualan" value={currency.format(summary?.revenue || 0)} note={`${summary?.transactionCount || 0} transaksi`} icon={ArrowUpRight} tone="green" />
                    <FinanceMetric label="Harga pokok" value={currency.format(summary?.cost || 0)} note="Modal barang terjual" icon={WalletCards} tone="blue" />
                    <FinanceMetric label="Pengeluaran usaha" value={currency.format(summary?.expenses || 0)} note="Biaya yang dicatat" icon={ArrowDownRight} tone="amber" />
                    <FinanceMetric label="Estimasi laba bersih" value={currency.format(summary?.netProfit || 0)} note="Laba kotor − pengeluaran" icon={WalletCards} tone="violet" />
                </section>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <h2 className="text-xs font-semibold text-[#3e4d43]">Pengeluaran tercatat</h2><p className="mt-1 text-[9px] text-[#929a94]">{expenses.length} catatan pada periode ini</p>
                        {expenses.length === 0 ? <EmptyFinance message="Belum ada pengeluaran pada periode ini." /> : <div className="mt-4 max-h-[430px] overflow-auto"><table className="w-full text-left"><thead className="sticky top-0 bg-white text-[8px] uppercase tracking-wider text-[#9aa29c]"><tr><th className="border-b py-2">Tanggal</th><th className="border-b py-2">Kategori / keterangan</th><th className="border-b py-2">Metode</th><th className="border-b py-2 text-right">Nominal</th></tr></thead><tbody className="divide-y divide-[#f0f2ef]">{expenses.map((expense) => <tr key={expense.id} className="text-[9px]"><td className="whitespace-nowrap py-3 text-[#87928a]">{expense.date}</td><td className="py-3"><span className="block font-semibold text-[#4c5950]">{expense.category}</span><span className="mt-0.5 block text-[#9aa29c]">{expense.description || "—"}</span></td><td className="py-3 text-[#87928a]">{paymentLabels[expense.paymentMethod] || expense.paymentMethod}</td><td className="whitespace-nowrap py-3 text-right font-semibold text-[#58665c]">{currency.format(expense.amount)}</td></tr>)}</tbody></table></div>}
                    </CardContent></Card>

                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <h2 className="text-xs font-semibold text-[#3e4d43]">Ringkasan arus kas</h2><p className="mt-1 text-[9px] text-[#929a94]">Periode yang dipilih</p>
                        <div className="mt-5 space-y-4"><FinanceLine label="Penjualan" value={currency.format(summary?.revenue || 0)} positive /><FinanceLine label="Pengeluaran" value={`− ${currency.format(summary?.expenses || 0)}`} /><div className="border-t border-dashed border-[#dfe5de] pt-4"><FinanceLine label="Laba bersih estimasi" value={currency.format(summary?.netProfit || 0)} strong /></div></div>
                        <p className="mt-5 rounded-lg bg-[#f7f8f5] p-3 text-[9px] leading-4 text-[#89938b]">Laba dihitung dari harga jual dikurangi harga modal saat transaksi, lalu dikurangi pengeluaran tercatat.</p>
                    </CardContent></Card>
                </section>
            </>}
        </div>
    );
}

export function PeriodFilter({ fromDate, toDate, setFromDate, setToDate, setPeriod }) {
    return <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[#e7eae4] bg-white p-3">
        <button type="button" onClick={() => setPeriod("today")} className="h-9 rounded-md bg-[#f3f6f2] px-3 text-[9px] font-medium text-[#607568] hover:bg-[#eaf0e9]">Hari ini</button>
        <button type="button" onClick={() => setPeriod("month")} className="h-9 rounded-md bg-[#f3f6f2] px-3 text-[9px] font-medium text-[#607568] hover:bg-[#eaf0e9]">Bulan ini</button>
        <div><Label className="mb-1 block text-[8px]">Dari</Label><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-9 w-36 text-[9px]" /></div>
        <div><Label className="mb-1 block text-[8px]">Sampai</Label><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-9 w-36 text-[9px]" /></div>
    </div>;
}

function FinanceMetric({ label, value, note, icon: Icon, tone }) {
    const colors = { green: "bg-[#edf4ee] text-[#5b8064]", blue: "bg-[#eef3f7] text-[#68839a]", amber: "bg-[#f8f3e9] text-[#a18451]", violet: "bg-[#f3f0f7] text-[#81729b]" };
    return <Card className="rounded-xl shadow-none"><CardContent className="p-4"><div className="flex items-start justify-between"><p className="text-[9px] text-[#87928a]">{label}</p><span className={`grid size-8 place-items-center rounded-lg ${colors[tone]}`}><Icon size={15} /></span></div><p className="mt-3 text-xl font-semibold tracking-tight text-[#344139]">{value}</p><p className="mt-1 text-[8px] text-[#a0a8a1]">{note}</p></CardContent></Card>;
}

function FinanceLine({ label, value, strong = false, positive = false }) {
    return <div className={`flex justify-between text-[10px] ${strong ? "font-semibold text-[#405047]" : "text-[#87928a]"}`}><span className="flex items-center gap-1.5">{positive && <ArrowUpRight size={13} className="text-[#5b8064]" />}{label}</span><span>{value}</span></div>;
}

function EmptyFinance({ message }) {
    return <div className="mt-4 grid min-h-40 place-items-center rounded-lg border border-dashed border-[#e6eae4] bg-[#fbfcfa] px-4 text-center text-[10px] text-[#929a94]">{message}</div>;
}

function FinanceField({ label, children }) {
    return <div><Label className="mb-1.5 block text-[9px]">{label}</Label>{children}</div>;
}
