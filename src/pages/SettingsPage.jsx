import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Bluetooth,
    Building2,
    Check,
    Copy,
    Image,
    LoaderCircle,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    ShieldCheck,
    Store,
    Wifi,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { BusinessAvatar } from "../components/brand";

export default function SettingsPage({ bridge, business, showProductImages, scannerMode, onSettingsChanged, onScannerModeChanged, onNavigate }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [scannerInfo, setScannerInfo] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!bridge) return;
        bridge.getScannerInfo((result) => {
            if (result?.success) setScannerInfo(result);
        });
    }, [bridge]);

    const toggleProductImages = () => {
        if (saving || !bridge) return;
        const nextValue = !showProductImages;
        setSaving(true);
        setError("");
        bridge.saveSettings({ showProductImages: nextValue, scannerMode }, (result) => {
            setSaving(false);
            if (!result?.success) {
                setError(result?.error || "Pengaturan belum berhasil disimpan.");
                return;
            }
            onSettingsChanged(nextValue);
        });
    };

    const selectScannerMode = (nextMode) => {
        if (saving || nextMode === scannerMode || !bridge) return;
        setSaving(true);
        setError("");
        bridge.saveSettings({ showProductImages, scannerMode: nextMode }, (result) => {
            setSaving(false);
            if (!result?.success) {
                setError(result?.error || "Mode scanner belum berhasil disimpan.");
                return;
            }
            onScannerModeChanged(nextMode);
            bridge.getScannerInfo((info) => {
                if (info?.success) setScannerInfo(info);
            });
        });
    };

    const rotatePairingToken = () => {
        if (!bridge || saving) return;
        setSaving(true);
        bridge.rotateScannerToken((result) => {
            setSaving(false);
            if (!result?.success) {
                setError(result?.error || "Kode pairing belum dapat diperbarui.");
                return;
            }
            setScannerInfo(result);
        });
    };

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setError("Clipboard tidak tersedia. Salin teks secara manual.");
        }
    };

    return (
        <div className="mx-auto max-w-[1100px] space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[#849087]">PREFERENSI APLIKASI</p>
                    <h1 className="mt-2 font-serif text-3xl font-normal tracking-[-0.04em] text-[#26372e] sm:text-[38px]">Pengaturan</h1>
                    <p className="mt-2 text-xs text-[#87928a]">Atur tampilan katalog dan lihat identitas usaha.</p>
                </div>
                <Button variant="outline" onClick={() => onNavigate("dashboard")}><ArrowLeft size={14} />Kembali ke ringkasan</Button>
            </header>

            <section>
                <p className="mb-3 text-[9px] font-bold tracking-[0.15em] text-[#9aa29c]">SCANNER BARCODE</p>
                <Card className="rounded-xl shadow-none">
                    <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xs font-semibold text-[#3e4d43]">Pilih koneksi scanner</h2>
                                <p className="mt-1 max-w-xl text-[10px] leading-5 text-[#89938b]">Mode ini menentukan cara scanner mengirim barcode ke halaman kasir.</p>
                            </div>
                            {saving && <LoaderCircle size={16} className="animate-spin text-[#66806d]" />}
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <button type="button" disabled={saving} onClick={() => selectScannerMode("hid")} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${scannerMode === "hid" ? "border-[#9db5a0] bg-[#f3f7f2]" : "border-[#e8ece7] hover:bg-[#fafbf9]"}`}>
                                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${scannerMode === "hid" ? "bg-white text-[#52755b]" : "bg-[#f5f7f4] text-[#8c978f]"}`}><Bluetooth size={17} /></span>
                                <span><strong className="block text-[11px] font-semibold text-[#435047]">Bluetooth / USB HID</strong><small className="mt-1 block text-[9px] leading-4 text-[#89938b]">Scanner bertindak seperti keyboard dan mengirim barcode diakhiri Enter.</small></span>
                            </button>
                            <button type="button" disabled={saving} onClick={() => selectScannerMode("wifi")} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${scannerMode === "wifi" ? "border-[#9db5a0] bg-[#f3f7f2]" : "border-[#e8ece7] hover:bg-[#fafbf9]"}`}>
                                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${scannerMode === "wifi" ? "bg-white text-[#52755b]" : "bg-[#f5f7f4] text-[#8c978f]"}`}><Wifi size={17} /></span>
                                <span><strong className="block text-[11px] font-semibold text-[#435047]">Wi-Fi · aplikasi mobile</strong><small className="mt-1 block text-[9px] leading-4 text-[#89938b]">Aplikasi scanner mengirim barcode melalui jaringan lokal yang sama.</small></span>
                            </button>
                        </div>

                        {scannerMode === "hid" ? (
                            <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f7f8f5] p-3 text-[9px] leading-4 text-[#7f8b82]">
                                <Bluetooth size={14} className="mt-0.5 shrink-0 text-[#66806d]" />
                                <span>Pasangkan scanner Bluetooth ke Windows terlebih dahulu. Di kasir, aktifkan tombol Scanner agar kolom barcode tetap fokus. Mode HID tidak melaporkan status koneksi ke POS.</span>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-xl border border-[#e8ece7] bg-[#fbfcfa] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div><p className="text-[10px] font-semibold text-[#536057]">Pairing aplikasi mobile</p><p className="mt-1 text-[9px] text-[#929a94]">Pastikan HP dan komputer berada di jaringan Wi-Fi yang sama.</p></div>
                                    <span className={`inline-flex items-center gap-1.5 text-[9px] font-medium ${scannerInfo?.listening ? "text-[#5c8064]" : "text-[#a8794d]"}`}><span className={`size-1.5 rounded-full ${scannerInfo?.listening ? "bg-[#78a27e]" : "bg-[#d1a16d]"}`} />{scannerInfo?.listening ? "Server aktif" : "Server tidak aktif"}</span>
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {(scannerInfo?.addresses || []).map((address) => <CopyField key={address} label="Alamat server" value={`http://${address}:${scannerInfo?.port || 8765}/api/scan`} onCopy={copyText} copied={copied} />)}
                                    {(!scannerInfo?.addresses || scannerInfo.addresses.length === 0) && <p className="rounded-lg bg-white p-3 text-[9px] text-[#a8794d]">Alamat Wi-Fi belum terdeteksi. Hubungkan komputer ke jaringan lokal terlebih dahulu.</p>}
                                    <CopyField label="Token pairing" value={scannerInfo?.token || "Memuat token..."} onCopy={copyText} copied={copied} />
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[9px] text-[#929a94]">Token diperlukan pada header <code className="rounded bg-white px-1 py-0.5">Authorization: Bearer …</code></p>
                                    <Button variant="outline" className="min-h-8 px-2.5 text-[9px]" onClick={rotatePairingToken} disabled={saving}><RefreshCw size={12} />Buat token baru</Button>
                                </div>
                                <details className="mt-3 text-[9px] text-[#87928a]">
                                    <summary className="cursor-pointer font-medium text-[#657269]">Format request untuk aplikasi mobile</summary>
                                    <pre className="mt-2 overflow-x-auto rounded-lg bg-[#26332c] p-3 text-[8px] leading-4 text-[#e4eee4]">{`POST /api/scan\nContent-Type: application/json\nAuthorization: Bearer ${scannerInfo?.token || "<token>"}\n\n{"barcode":"8991234567890"}`}</pre>
                                </details>
                                {copied && <p className="mt-2 text-[9px] text-[#5c8064]" role="status">Tersalin.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section>
                <p className="mb-3 text-[9px] font-bold tracking-[0.15em] text-[#9aa29c]">TAMPILAN</p>
                <Card className="rounded-xl shadow-none">
                    <CardContent className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                        <div className="flex items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f5f0] text-[#66806d]"><Image size={18} /></span>
                            <div>
                                <h2 className="text-xs font-semibold text-[#3e4d43]">Tampilkan gambar produk</h2>
                                <p className="mt-1 max-w-xl text-[10px] leading-5 text-[#89938b]">Jika aktif, gambar produk akan terlihat di katalog. Jika dimatikan, gambar tetap tersimpan tetapi disembunyikan dari tampilan.</p>
                                <p className="mt-2 text-[9px] text-[#a0a8a1]">Pengaturan ini berlaku untuk katalog dan tampilan kasir.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={showProductImages}
                            aria-label="Tampilkan gambar produk"
                            disabled={saving}
                            onClick={toggleProductImages}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ba995] focus-visible:ring-offset-2 disabled:opacity-60 ${showProductImages ? "bg-[#315b49]" : "bg-[#d6ddd6]"}`}
                        >
                            <span className={`inline-flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${showProductImages ? "translate-x-[22px]" : "translate-x-0.5"}`}>
                                {showProductImages && <Check size={11} className="text-[#315b49]" />}
                            </span>
                        </button>
                    </CardContent>
                </Card>
                {error && <p className="mt-2 text-[10px] text-[#a8443a]" role="alert">{error}</p>}
                <p className="mt-2 text-[9px] text-[#a0a8a1]">{saving ? "Menyimpan pengaturan..." : "Pengaturan disimpan otomatis ke database lokal."}</p>
            </section>

            <section>
                <p className="mb-3 text-[9px] font-bold tracking-[0.15em] text-[#9aa29c]">IDENTITAS USAHA</p>
                <Card className="rounded-xl shadow-none">
                    <CardContent className="p-5 sm:p-6">
                        <div className="flex items-center gap-3 border-b border-[#edf0eb] pb-5">
                            <BusinessAvatar business={business} className="size-12 rounded-xl" />
                            <div><h2 className="text-sm font-semibold text-[#3e4d43]">{business?.name || "Usaha Anda"}</h2><p className="mt-1 text-[10px] text-[#929a94]">Informasi dari pengaturan awal</p></div>
                        </div>
                        <div className="grid gap-4 pt-5 sm:grid-cols-2">
                            <BusinessDetail icon={Building2} label="Nama pemilik" value={business?.ownerName} />
                            <BusinessDetail icon={MapPin} label="Alamat" value={business?.address} />
                            <BusinessDetail icon={Phone} label="Nomor telepon" value={business?.phone} />
                            <BusinessDetail icon={Mail} label="Email usaha" value={business?.email} />
                        </div>
                    </CardContent>
                </Card>
            </section>

            <div className="flex items-start gap-2 rounded-lg border border-[#e8ede7] bg-white p-4 text-[10px] leading-5 text-[#849087]">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#6c9877]" />
                <span><strong className="font-semibold text-[#657269]">Penyimpanan lokal.</strong> Pengaturan dan data usaha disimpan di perangkat ini.</span>
                <Store size={14} className="ml-auto mt-0.5 shrink-0 text-[#a3ada5]" />
            </div>
        </div>
    );
}

function BusinessDetail({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-2.5">
            <Icon size={15} className="mt-0.5 shrink-0 text-[#91a095]" />
            <div><p className="text-[9px] text-[#9aa29c]">{label}</p><p className="mt-1 text-[11px] text-[#4e5b52]">{value || "Belum diisi"}</p></div>
        </div>
    );
}

function CopyField({ label, value, onCopy, copied }) {
    return (
        <div className="min-w-0 rounded-lg border border-[#edf0eb] bg-white px-3 py-2">
            <p className="text-[8px] text-[#9aa29c]">{label}</p>
            <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-[9px] text-[#536057]">{value}</code>
                <button type="button" onClick={() => onCopy(value)} className="grid size-6 shrink-0 place-items-center rounded text-[#819183] hover:bg-[#f3f6f2]" aria-label={`Salin ${label}`} title={copied ? "Tersalin" : `Salin ${label}`}><Copy size={12} /></button>
            </div>
        </div>
    );
}
