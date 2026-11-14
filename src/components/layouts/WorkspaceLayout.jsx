import {
    BadgeCheck,
    ChartNoAxesCombined,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Package,
    ShoppingCart,
    Settings2,
    WalletCards,
    UserRound,
} from "lucide-react";
import { Button } from "../ui/button";
import { BrandLockup, BusinessAvatar } from "../brand";

const navigation = [
    { page: "dashboard", label: "Ringkasan", icon: LayoutDashboard, enabled: true },
    { page: "cashier", label: "Kasir", icon: ShoppingCart, enabled: true },
    { page: "products", label: "Produk & stok", icon: Package, enabled: true },
    { page: "finance", label: "Keuangan", icon: WalletCards, enabled: true },
    { page: "reports", label: "Laporan", icon: ChartNoAxesCombined, enabled: true },
    { page: "settings", label: "Pengaturan", icon: Settings2, enabled: true },
];

export function WorkspaceLayout({ business, user, page, onNavigate, onLogout, children }) {
    const pageTitle = page === "checkout" ? "Checkout" : navigation.find((item) => item.page === page)?.label || "Ringkasan";
    const cashierMode = page === "cashier";

    return (
        <main className={`flex bg-[#f6f7f3] text-[#26332c] ${cashierMode ? "h-screen overflow-hidden" : "min-h-screen"}`}>
            <aside className={`hidden w-[248px] shrink-0 flex-col border-r border-[#e8ebe5] bg-white px-4 py-5 md:flex ${cashierMode ? "h-screen overflow-hidden" : "min-h-screen"}`}>
                <div className="px-2"><BrandLockup /></div>
                <div className="mt-8 flex items-center gap-3 rounded-xl border border-[#edf0eb] bg-[#fbfcfa] p-3">
                    <BusinessAvatar business={business} className="size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#344139]">{business?.name || "Usaha Anda"}</p>
                        <p className="mt-1 text-[10px] text-[#929a94]">Ruang usaha</p>
                    </div>
                    <ChevronDown size={14} className="shrink-0 text-[#98a19a]" />
                </div>

                <p className="mb-2 mt-8 px-3 text-[9px] font-bold tracking-[0.15em] text-[#a0a8a1]">MENU UTAMA</p>
                <nav className="grid gap-1" aria-label="Navigasi utama">
                    {navigation.map(({ page: targetPage, label, icon: Icon, enabled }) => {
                        const active = page === targetPage;
                        return (
                        <button
                            key={label}
                            type="button"
                            disabled={!enabled}
                            onClick={() => enabled && onNavigate(targetPage)}
                            title={enabled ? label : `${label} — segera hadir`}
                            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-left text-xs transition ${active ? "bg-[#edf3ee] font-semibold text-[#315b49]" : enabled ? "text-[#6f7b72] hover:bg-[#f7f9f6]" : "cursor-not-allowed text-[#9ca49e]"}`}
                        >
                            <Icon size={16} strokeWidth={1.8} />
                            <span className="flex-1">{label}</span>
                            {!enabled && <span className="text-[8px] font-medium tracking-wide text-[#aeb6b0]">SEGERA</span>}
                        </button>
                        );
                    })}
                </nav>

                <div className="mt-auto rounded-xl bg-[#f5f7f3] p-3">
                    <div className="flex items-center gap-2 text-[10px] font-medium text-[#5d7162]"><span className="size-2 rounded-full bg-[#70a37c]" />Tersimpan di perangkat</div>
                    <p className="mt-2 pl-4 text-[9px] leading-4 text-[#929a94]">Data usaha tersedia tanpa koneksi internet.</p>
                </div>
            </aside>

            <section className={`flex min-w-0 flex-1 flex-col ${cashierMode ? "h-screen min-h-0 overflow-hidden" : "min-h-screen"}`}>
                <header className="flex min-h-[64px] shrink-0 items-center justify-between border-b border-[#e8ebe5] bg-white px-5 sm:px-8">
                    <div className="md:hidden"><BrandLockup /></div>
                    <div className="hidden md:block">
                        <p className="text-sm font-semibold text-[#344139]">{pageTitle}</p>
                        <p className="mt-1 text-[10px] text-[#929a94]">Gambaran singkat ruang usaha Anda</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#7d8980]"><span className="size-2 rounded-full bg-[#70a37c]" />Lokal · siap digunakan</div>
                </header>

                <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#e8ebe5] bg-white px-4 py-2 md:hidden" aria-label="Navigasi utama">
                    {navigation.filter(({ enabled }) => enabled).map(({ page: targetPage, label, icon: Icon }) => (
                        <button key={label} type="button" onClick={() => onNavigate(targetPage)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${page === targetPage ? "bg-[#edf3ee] text-[#315b49]" : "text-[#7b877e]"}`}>
                            <Icon size={14} />{label}
                        </button>
                    ))}
                </nav>

                <div className={cashierMode ? "min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-5" : "flex-1 px-5 py-7 sm:px-8 sm:py-9"}>{children}</div>

                <footer className={`mt-auto flex min-h-[58px] shrink-0 items-center justify-between gap-4 border-t border-[#e6eae4] bg-white px-5 sm:px-8 ${cashierMode ? "min-h-[50px]" : ""}`}>
                    <div className="flex items-center gap-2 text-[10px] text-[#87928a]"><BadgeCheck size={15} className="text-[#6c9877]" /><span>Database lokal aktif</span><span className="hidden text-[#d0d6d0] sm:inline">·</span><span className="hidden sm:inline">Semua data tersimpan di perangkat ini</span></div>
                    <StatusUser user={user} onLogout={onLogout} />
                </footer>
            </section>
        </main>
    );
}

function StatusUser({ user, onLogout }) {
    return (
        <div className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-[#edf3ee] text-[#315b49]" aria-hidden="true"><UserRound size={15} /></span>
            <span className="hidden min-w-0 sm:block">
                <span className="block max-w-36 truncate text-[10px] font-semibold text-[#435047]">{user?.fullName || "Pengguna"}</span>
                <span className="mt-0.5 block text-[9px] text-[#98a19a]">Pemilik</span>
            </span>
            <Button variant="ghost" className="size-8 min-h-8 px-0 text-[#849087]" onClick={onLogout} aria-label="Keluar" title="Keluar">
                <LogOut size={15} />
            </Button>
        </div>
    );
}
