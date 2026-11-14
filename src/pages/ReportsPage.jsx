import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ChartNoAxesCombined, ReceiptText, WalletCards } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { PeriodFilter } from "./FinancePage";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const paymentLabels = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer", ewallet: "E-wallet" };

export default function ReportsPage({ bridge }) {
    const [fromDate, setFromDate] = useState(monthStart);
    const [toDate, setToDate] = useState(today);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");

    const loadReport = useCallback(() => {
        if (!bridge) return;
        bridge.getReportData(fromDate, toDate, (result) => {
            setLoading(false);
            if (!result?.success) {
                setError(result?.error || "Laporan belum dapat dimuat.");
                return;
            }
            setError("");
            setReport(result);
        });
    }, [bridge, fromDate, toDate]);

    useEffect(() => { loadReport(); }, [loadReport]);

    const exportXlsx = () => {
        if (!report || exporting) return;
        setExporting(true);
        setError("");
        bridge.getReportExportData(fromDate, toDate, async (data) => {
            if (!data?.success) {
                setExporting(false);
                setError(data?.error || "Data ekspor belum dapat dimuat.");
                return;
            }

            try {
                const { default: ExcelJS } = await import("exceljs");
                const workbook = new ExcelJS.Workbook();
                workbook.creator = "NexusPOS";
                workbook.created = new Date();
                const summaryRows = [
                    ["Periode", `${fromDate} — ${toDate}`],
                    ["Total penjualan", summary?.revenue || 0],
                    ["Jumlah transaksi", summary?.transactionCount || 0],
                    ["Harga pokok penjualan", summary?.cost || 0],
                    ["Pajak / PPN", (data.sales || []).reduce((sum, sale) => sum + Number(sale.taxAmount || 0), 0)],
                    ["Laba kotor", summary?.grossProfit || 0],
                    ["Pengeluaran", summary?.expenses || 0],
                    ["Estimasi laba bersih", summary?.netProfit || 0],
                ];
                addWorksheet(workbook, "Ringkasan", ["Metrik", "Nilai"], summaryRows, [34, 26]);

                addWorksheet(workbook, "Transaksi", ["No. faktur", "Waktu", "Kasir", "Pelanggan", "Telepon", "Alamat", "Metode", "Subtotal", "Diskon", "Pajak %", "Pajak", "Total", "Diterima", "Kembalian", "Catatan"],
                    (data.sales || []).map((sale) => [sale.receiptNo, new Date(sale.createdAt).toLocaleString("id-ID"), sale.cashierName, sale.customerName, sale.customerPhone, sale.customerAddress, paymentLabels[sale.paymentMethod] || sale.paymentMethod, sale.subtotal, sale.discount, sale.taxRate, sale.taxAmount, sale.total, sale.amountReceived, sale.change, sale.customerNote]),
                    [24, 22, 22, 24, 18, 32, 20, 16, 16, 12, 16, 16, 16, 16, 34]);

                addWorksheet(workbook, "Item transaksi", ["No. struk", "Produk", "SKU", "Satuan", "Jumlah", "Harga modal", "Harga jual", "Penjualan bersih", "HPP", "Laba item"],
                    (data.items || []).map((item) => [item.receiptNo, item.productName, item.sku, item.unit, item.quantity, item.unitCost, item.unitPrice, item.netLineTotal, Number(item.quantity) * Number(item.unitCost), Number(item.netLineTotal) - Number(item.quantity) * Number(item.unitCost)]),
                    [24, 30, 18, 14, 12, 18, 18, 20, 18, 18]);

                addWorksheet(workbook, "Metode pembayaran", ["Metode", "Transaksi", "Total"],
                    (summary?.payments || []).map((payment) => [paymentLabels[payment.method] || payment.method, payment.count, payment.total]),
                    [24, 16, 22]);

                addWorksheet(workbook, "Produk terlaris", ["Produk", "Jumlah terjual", "Penjualan bersih", "Estimasi laba"],
                    (report.topProducts || []).map((product) => [product.name, product.quantity, product.revenue, product.profit]),
                    [32, 18, 22, 22]);

                addWorksheet(workbook, "Pengeluaran", ["Tanggal", "Kategori", "Keterangan", "Metode", "Nominal"],
                    (data.expenses || []).map((expense) => [expense.date, expense.category, expense.description, paymentLabels[expense.paymentMethod] || expense.paymentMethod, expense.amount]),
                    [16, 22, 34, 20, 20]);

                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `laporan-${fromDate}-${toDate}.xlsx`;
                anchor.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 30000);
            } catch (exportError) {
                setError(exportError?.message || "File Excel gagal dibuat.");
            } finally {
                setExporting(false);
            }
        });
    };

    const summary = report?.summary;
    const dailySales = report?.dailySales || [];
    const topProducts = report?.topProducts || [];
    const paymentMethods = summary?.payments || [];
    const maxDailyTotal = Math.max(1, ...dailySales.map((row) => Number(row.total) || 0));

    return (
        <div className="mx-auto max-w-[1400px] space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="text-[10px] font-bold tracking-[0.16em] text-[#849087]">ANALISIS USAHA</p><h1 className="mt-2 font-serif text-3xl font-normal tracking-[-0.04em] text-[#26372e] sm:text-[38px]">Laporan</h1><p className="mt-2 text-xs text-[#87928a]">Lihat performa penjualan, pembayaran, dan produk.</p></div>
                <Button variant="outline" onClick={exportXlsx} disabled={!report || exporting}><ArrowDownToLine size={14} />{exporting ? "Menyiapkan Excel..." : "Ekspor Excel"}</Button>
            </header>

            <PeriodFilter fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} setPeriod={(period) => { const current = today(); setToDate(current); setFromDate(period === "today" ? current : `${current.slice(0, 8)}01`); }} />
            {error && <p className="rounded-lg bg-[#fff4f2] p-3 text-xs text-[#a8443a]" role="alert">{error}</p>}
            {loading && !report ? <div className="grid min-h-48 place-items-center text-xs text-[#89938b]">Menyiapkan laporan...</div> : <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ReportMetric label="Total penjualan" value={currency.format(summary?.revenue || 0)} icon={WalletCards} />
                    <ReportMetric label="Jumlah transaksi" value={summary?.transactionCount || 0} icon={ReceiptText} />
                    <ReportMetric label="Rata-rata transaksi" value={currency.format(summary?.transactionCount ? summary.revenue / summary.transactionCount : 0)} icon={ChartNoAxesCombined} />
                    <ReportMetric label="Estimasi laba kotor" value={currency.format(summary?.grossProfit || 0)} icon={ChartNoAxesCombined} />
                </section>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <h2 className="text-xs font-semibold text-[#3e4d43]">Penjualan per hari</h2><p className="mt-1 text-[9px] text-[#929a94]">Total transaksi per tanggal pada periode terpilih.</p>
                        {dailySales.length === 0 ? <EmptyReport>Belum ada penjualan pada periode ini.</EmptyReport> : <div className="mt-5 max-h-[330px] space-y-3 overflow-y-auto pr-1">{dailySales.map((row) => <div key={row.date} className="grid grid-cols-[72px_minmax(0,1fr)_100px] items-center gap-3 text-[9px]"><span className="text-[#829087]">{row.date.slice(5)}</span><div className="h-2 overflow-hidden rounded-full bg-[#f0f3ef]"><div className="h-full rounded-full bg-[#7b9b7f]" style={{ width: `${Math.max(2, (Number(row.total) / maxDailyTotal) * 100)}%` }} /></div><span className="text-right font-medium text-[#58665c]">{currency.format(row.total)}</span></div>)}</div>}
                    </CardContent></Card>

                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <h2 className="text-xs font-semibold text-[#3e4d43]">Metode pembayaran</h2><p className="mt-1 text-[9px] text-[#929a94]">Rincian dari transaksi tersimpan.</p>
                        {paymentMethods.length === 0 ? <EmptyReport>Belum ada data pembayaran.</EmptyReport> : <div className="mt-5 space-y-3">{paymentMethods.map((payment) => <div key={payment.method} className="flex items-center justify-between gap-3 rounded-lg bg-[#fafbf9] px-3 py-2.5"><span><span className="block text-[10px] font-semibold text-[#4e5b52]">{paymentLabels[payment.method] || payment.method}</span><span className="mt-1 block text-[8px] text-[#9aa29c]">{payment.count} transaksi</span></span><span className="text-[10px] font-semibold text-[#5d7862]">{currency.format(payment.total)}</span></div>)}</div>}
                    </CardContent></Card>
                </section>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <h2 className="text-xs font-semibold text-[#3e4d43]">Produk terlaris</h2><p className="mt-1 text-[9px] text-[#929a94]">Diurutkan berdasarkan pendapatan.</p>
                        {topProducts.length === 0 ? <EmptyReport>Belum ada produk terjual pada periode ini.</EmptyReport> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-left"><thead className="text-[8px] uppercase tracking-wider text-[#9aa29c]"><tr><th className="border-b py-2">Produk</th><th className="border-b py-2 text-right">Qty</th><th className="border-b py-2 text-right">Penjualan</th><th className="border-b py-2 text-right">Laba</th></tr></thead><tbody className="divide-y divide-[#f0f2ef]">{topProducts.map((product) => <tr key={product.name} className="text-[9px]"><td className="py-3 font-medium text-[#4c5950]">{product.name}</td><td className="py-3 text-right text-[#7f8982]">{Number(product.quantity)}</td><td className="py-3 text-right text-[#59665d]">{currency.format(product.revenue)}</td><td className="py-3 text-right font-medium text-[#5d7862]">{currency.format(product.profit)}</td></tr>)}</tbody></table></div>}
                    </CardContent></Card>

                    <Card className="rounded-xl shadow-none"><CardContent className="p-5 sm:p-6">
                        <h2 className="text-xs font-semibold text-[#3e4d43]">Transaksi terbaru</h2><p className="mt-1 text-[9px] text-[#929a94]">Maksimal 20 transaksi dalam periode ini.</p>
                        {(report?.recentSales || []).length === 0 ? <EmptyReport>Belum ada transaksi.</EmptyReport> : <div className="mt-4 max-h-[300px] overflow-auto"><table className="w-full text-left"><thead className="sticky top-0 bg-white text-[8px] uppercase tracking-wider text-[#9aa29c]"><tr><th className="border-b py-2">Struk</th><th className="border-b py-2">Metode</th><th className="border-b py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-[#f0f2ef]">{report.recentSales.map((sale) => <tr key={sale.id} className="text-[9px]"><td className="py-3"><span className="font-medium text-[#4c5950]">{sale.receiptNo}</span><span className="mt-1 block text-[8px] text-[#9aa29c]">{new Date(sale.createdAt).toLocaleString("id-ID")}</span></td><td className="py-3 text-[#87928a]">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</td><td className="whitespace-nowrap py-3 text-right font-semibold text-[#536057]">{currency.format(sale.total)}</td></tr>)}</tbody></table></div>}
                    </CardContent></Card>
                </section>
            </>}
        </div>
    );
}

function addWorksheet(workbook, name, headers, rows, widths) {
    const worksheet = workbook.addWorksheet(name);
    worksheet.addRow(headers);
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.columns.forEach((column, index) => { column.width = widths[index] || 18; });
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = { from: "A1", to: `${columnName(headers.length)}1` };
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF315B49" } };
    header.alignment = { vertical: "middle" };
    header.height = 22;
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) row.alignment = { vertical: "middle" };
    });
}

function columnName(index) {
    let name = "";
    while (index > 0) {
        const remainder = (index - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        index = Math.floor((index - 1) / 26);
    }
    return name;
}

function ReportMetric({ label, value, icon: Icon }) {
    return <Card className="rounded-xl shadow-none"><CardContent className="p-4"><div className="flex justify-between"><span className="text-[9px] text-[#87928a]">{label}</span><span className="grid size-8 place-items-center rounded-lg bg-[#edf4ee] text-[#5b8064]"><Icon size={15} /></span></div><p className="mt-3 text-xl font-semibold tracking-tight text-[#344139]">{value}</p></CardContent></Card>;
}

function EmptyReport({ children }) {
    return <div className="mt-4 grid min-h-32 place-items-center rounded-lg border border-dashed border-[#e6eae4] bg-[#fbfcfa] px-4 text-center text-[10px] text-[#929a94]">{children}</div>;
}
