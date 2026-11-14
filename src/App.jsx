import { useEffect, useState } from "react";
import {
    ArrowRight,
    AtSign,
    Building2,
    Check,
    ImagePlus,
    LockKeyhole,
    Mail,
    MapPin,
    Phone,
    Store,
    UserRound,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { BrandMark, BusinessAvatar } from "./components/brand";
import { AuthLayout } from "./components/layouts/AuthLayout";
import { WorkspaceLayout } from "./components/layouts/WorkspaceLayout";
import Dashboard from "./pages/Dashboard";
import CashierPage from "./pages/CashierPage";
import ProductsPage from "./pages/ProductsPage";
import SettingsPage from "./pages/SettingsPage";
import CheckoutPage from "./pages/CheckoutPage";
import FinancePage from "./pages/FinancePage";
import ReportsPage from "./pages/ReportsPage";
import { createTauriBridge } from "./lib/tauri-bridge";

const emptyForm = {
    businessName: "",
    logoData: "",
    address: "",
    phone: "",
    email: "",
    ownerName: "",
    username: "",
    userId: "",
    password: "",
};

export default function App() {
    const [bridge] = useState(() => createTauriBridge());
    const [screen, setScreen] = useState("initializing");
    const [business, setBusiness] = useState(null);
    const [user, setUser] = useState(null);
    const [workspacePage, setWorkspacePage] = useState("dashboard");
    const [showProductImages, setShowProductImages] = useState(true);
    const [scannerMode, setScannerMode] = useState("hid");
    const [saleCart, setSaleCart] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [identifier, setIdentifier] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        bridge.initialize((result) => {
            if (cancelled) return;
            if (!result?.success) {
                setError(result?.error || "Database tidak dapat dibuka.");
                setScreen("error");
                return;
            }
            setBusiness(result.business || null);
            bridge.getSettings((settingsResult) => {
                if (cancelled) return;
                if (!settingsResult?.success) {
                    setError(settingsResult?.error || "Pengaturan aplikasi tidak dapat dimuat.");
                    setScreen("error");
                    return;
                }
                setShowProductImages(settingsResult.settings?.showProductImages ?? true);
                setScannerMode(settingsResult.settings?.scannerMode || "hid");
                setScreen(result.needsSetup ? "setup" : "login");
            });
        });

        return () => {
            cancelled = true;
        };
    }, [bridge]);

    const updateForm = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        setError("");
    };

    const handleLogo = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Pilih file gambar untuk logo usaha.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("Ukuran logo maksimal 2 MB.");
            event.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => updateForm("logoData", String(reader.result || ""));
        reader.onerror = () => setError("Logo tidak dapat dibaca. Coba pilih file lain.");
        reader.readAsDataURL(file);
    };

    const submitSetup = (event) => {
        event.preventDefault();
        if (!bridge || busy) return;
        setBusy(true);
        setError("");

        bridge.saveBusiness(form, (result) => {
            setBusy(false);
            if (!result?.success) {
                setError(result?.error || "Data usaha belum dapat disimpan.");
                return;
            }
            setBusiness({
                name: form.businessName,
                logoData: form.logoData,
                address: form.address,
                phone: form.phone,
                email: form.email,
                ownerName: form.ownerName,
            });
            setIdentifier(form.username);
            setNotice("Usaha berhasil disiapkan. Silakan masuk dengan akun pemilik.");
            setScreen("login");
        });
    };

    const submitLogin = (event) => {
        event.preventDefault();
        if (!bridge || busy) return;
        setBusy(true);
        setError("");
        setNotice("");

        bridge.login(identifier, loginPassword, (result) => {
            setBusy(false);
            if (!result?.success) {
                setError(result?.error || "Login gagal. Periksa kembali data akun.");
                return;
            }
            setUser(result.user);
            setLoginPassword("");
            setWorkspacePage("dashboard");
            setSaleCart([]);
            setScreen("dashboard");
        });
    };

    if (screen === "initializing") {
        return (
            <main className="grid min-h-screen place-content-center justify-items-center gap-4 bg-[#f5f6f1] text-xs text-[#758078]">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#345b49] text-white"><Store size={21} /></span>
                Menyiapkan ruang usaha...
            </main>
        );
    }

    if (screen === "error") {
        return (
            <main className="grid min-h-screen place-items-center bg-[#f5f6f1] p-6">
                <Card className="w-full max-w-md">
                    <CardContent className="p-9">
                        <BrandMark />
                        <p className="mt-6 text-[10px] font-bold tracking-[0.17em] text-[#78847c]">ALPOS</p>
                        <h1 className="mt-2 font-serif text-3xl font-normal text-[#27342e]">Belum bisa dimulai</h1>
                        <p className="mt-3 text-sm leading-6 text-[#7a847d]">{error}</p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    if (screen === "dashboard") {
        return (
            <WorkspaceLayout
                business={business}
                user={user}
                page={workspacePage}
                onNavigate={setWorkspacePage}
                onLogout={() => { setUser(null); setScreen("login"); }}
            >
                {workspacePage === "products"
                    ? <ProductsPage bridge={bridge} showProductImages={showProductImages} onNavigate={setWorkspacePage} />
                    : workspacePage === "cashier"
                        ? <CashierPage bridge={bridge} showProductImages={showProductImages} scannerMode={scannerMode} cart={saleCart} onCartChange={setSaleCart} onCheckout={() => setWorkspacePage("checkout")} onNavigate={setWorkspacePage} />
                        : workspacePage === "checkout"
                            ? <CheckoutPage bridge={bridge} cart={saleCart} user={user} business={business} onBack={() => setWorkspacePage("cashier")} onComplete={() => setSaleCart([])} onNavigate={setWorkspacePage} />
                            : workspacePage === "finance"
                                ? <FinancePage bridge={bridge} />
                                : workspacePage === "reports"
                                    ? <ReportsPage bridge={bridge} />
                        : workspacePage === "settings"
                            ? <SettingsPage bridge={bridge} business={business} showProductImages={showProductImages} scannerMode={scannerMode} onSettingsChanged={setShowProductImages} onScannerModeChanged={setScannerMode} onNavigate={setWorkspacePage} />
                            : <Dashboard bridge={bridge} business={business} user={user} onNavigate={setWorkspacePage} />}
            </WorkspaceLayout>
        );
    }

    const isSetup = screen === "setup";

    return (
        <AuthLayout mode={isSetup ? "setup" : "login"} business={business}>
            {isSetup ? (
                    <div className="mx-auto my-auto w-full max-w-[650px] py-8">
                        <FormHeading eyebrow="LANGKAH PERTAMA" title={<>Kenalan dengan<br />usaha Anda.</>} description="Isi beberapa detail dasar. Bisa disesuaikan lagi nanti." />
                        <form onSubmit={submitSetup} className="mt-8">
                            <SectionTitle number="01" title="Identitas usaha" detail="Informasi yang tampil di ruang kerja Anda" />
                            <div className="mb-5 ml-0 flex flex-wrap items-center gap-3 sm:ml-10">
                                <div className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-[#cbd4cc] bg-[#f7f9f6] text-[#7e9283]">
                                    {form.logoData ? <img className="size-full object-contain" src={form.logoData} alt="Pratinjau logo usaha" /> : <ImagePlus size={20} />}
                                </div>
                                <div className="min-w-32 flex-1">
                                    <p className="text-[11px] font-semibold text-[#455148]">Logo usaha <span className="ml-1 text-[8px] tracking-wider text-[#9ba49d]">OPSIONAL</span></p>
                                    <p className="mt-1 text-[10px] text-[#9aa19c]">PNG atau JPG, maksimal 2 MB</p>
                                </div>
                                <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-[#e3e8e2] px-3 text-[10px] font-semibold text-[#52685a] transition hover:bg-[#f7faf7]">
                                    Pilih file
                                    <input className="sr-only" type="file" accept="image/*" onChange={handleLogo} />
                                </label>
                            </div>
                            <div className="grid gap-4 sm:ml-10 sm:grid-cols-2">
                                <Field id="businessName" label="Nama usaha" icon={Building2} wide>
                                    <Input id="businessName" autoFocus required maxLength={120} value={form.businessName} onChange={(e) => updateForm("businessName", e.target.value)} placeholder="Contoh: Kedai Pagi" />
                                </Field>
                                <Field id="address" label="Alamat" icon={MapPin} wide>
                                    <Input id="address" value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Jalan, kota, atau area usaha" />
                                </Field>
                                <Field id="phone" label="Nomor telepon" icon={Phone}>
                                    <Input id="phone" type="tel" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="08xx xxxx xxxx" />
                                </Field>
                                <Field id="email" label="Email usaha" icon={Mail}>
                                    <Input id="email" type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="nama@usaha.id" />
                                </Field>
                            </div>

                            <SectionTitle className="mt-7" number="02" title="Akun pemilik" detail="Gunakan salah satu ID ini untuk masuk" />
                            <div className="grid gap-4 sm:ml-10 sm:grid-cols-2">
                                <Field id="ownerName" label="Nama pemilik" icon={UserRound} wide>
                                    <Input id="ownerName" required maxLength={120} value={form.ownerName} onChange={(e) => updateForm("ownerName", e.target.value)} placeholder="Nama lengkap" />
                                </Field>
                                <Field id="username" label="Username" icon={AtSign}>
                                    <Input id="username" required autoComplete="username" maxLength={64} value={form.username} onChange={(e) => updateForm("username", e.target.value)} placeholder="username" />
                                </Field>
                                <Field id="userId" label="ID pengguna" icon={UserRound}>
                                    <Input id="userId" required maxLength={64} value={form.userId} onChange={(e) => updateForm("userId", e.target.value)} placeholder="ID untuk login" />
                                </Field>
                                <Field id="password" label="Password" icon={LockKeyhole} wide>
                                    <Input id="password" required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Minimal 8 karakter" />
                                </Field>
                            </div>

                            {error && <p className="ml-0 mt-4 text-[11px] leading-relaxed text-[#a8443a] sm:ml-10" role="alert">{error}</p>}
                            <div className="mt-6 flex flex-col justify-between gap-4 sm:ml-10 sm:flex-row sm:items-center">
                                <span className="max-w-[205px] text-[9px] leading-relaxed text-[#969e98]">Data usaha disimpan secara lokal di perangkat ini.</span>
                                <Button type="submit" disabled={busy} className="min-h-11 shrink-0">{busy ? "Menyimpan..." : "Simpan & lanjutkan"}<ArrowRight size={16} /></Button>
                            </div>
                        </form>
                    </div>
            ) : (
                    <div className="mx-auto my-auto w-full max-w-[410px] py-10">
                        <BusinessAvatar business={business} className="mb-7" />
                        <FormHeading eyebrow={business?.name || "ALpos"} title={<>Senang melihat<br />Anda kembali.</>} description="Masuk untuk melanjutkan mengelola usaha." />
                        <form onSubmit={submitLogin} className="mt-8 grid gap-5">
                            <Field id="identifier" label="Username atau ID pengguna" icon={AtSign}>
                                <Input id="identifier" autoFocus required autoComplete="username" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError(""); }} placeholder="Masukkan username atau ID" />
                            </Field>
                            <Field id="loginPassword" label="Password" icon={LockKeyhole}>
                                <Input id="loginPassword" required type="password" autoComplete="current-password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setError(""); }} placeholder="Masukkan password" />
                            </Field>
                            {error && <p className="text-[11px] leading-relaxed text-[#a8443a]" role="alert">{error}</p>}
                            {notice && <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[#447458]" role="status"><Check size={15} className="mt-0.5 shrink-0" />{notice}</p>}
                            <Button type="submit" disabled={busy} className="mt-1 min-h-12 w-full justify-between">{busy ? "Memeriksa..." : "Masuk ke ruang usaha"}<ArrowRight size={16} /></Button>
                        </form>
                        <div className="mt-7 flex items-center gap-2 text-[10px] text-[#9aa29c]"><span className="size-[7px] rounded-full bg-[#81a18a] ring-[3px] ring-[#eef4ef]" />Data tersimpan di perangkat ini</div>
                    </div>
            )}
        </AuthLayout>
    );
}

function FormHeading({ eyebrow, title, description }) {
    return (
        <header>
            <p className="text-[10px] font-bold tracking-[0.17em] text-[#78847c]">{eyebrow}</p>
            <h2 className="mt-3 font-serif text-[36px] font-normal leading-[1.08] tracking-[-0.045em] text-[#27342e] sm:text-[43px]">{title}</h2>
            <p className="mt-3 text-[13px] leading-6 text-[#7b8580]">{description}</p>
        </header>
    );
}

function SectionTitle({ number, title, detail, className = "" }) {
    return (
        <div className={`mb-4 flex items-center gap-[13px] ${className}`}>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#edf2ed] text-[10px] font-bold text-[#547260]">{number}</span>
            <div><strong className="block text-xs font-semibold text-[#354139]">{title}</strong><small className="mt-[3px] block text-[10px] text-[#929a94]">{detail}</small></div>
        </div>
    );
}

function Field({ id, label, icon: Icon, wide = false, children }) {
    return (
        <div className={wide ? "sm:col-span-2" : ""}>
            <Label htmlFor={id} className="mb-[7px] ml-px block">{label}</Label>
            <div className="flex min-h-10 items-center gap-[9px] rounded-lg border border-[#e5e9e5] px-[11px] text-[#9aa49c] shadow-sm transition focus-within:border-[#8ba995] focus-within:ring-2 focus-within:ring-[#8ba995]/20">
                <Icon size={16} strokeWidth={1.8} className="shrink-0" />
                {children}
            </div>
        </div>
    );
}
