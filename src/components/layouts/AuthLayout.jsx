import { BrandLockup } from "../brand";

export function AuthLayout({ business, mode, children }) {
    const isSetup = mode === "setup";

    return (
        <main className="min-h-screen bg-[#f7f7f3] text-[#202b27] md:grid md:grid-cols-[minmax(300px,0.82fr)_minmax(500px,1.18fr)]">
            <aside className="relative flex min-h-[280px] flex-col overflow-hidden bg-[#edf0e9] px-6 py-6 sm:px-10 md:min-h-screen md:px-12 md:py-10 xl:px-[4.5rem]">
                <BrandLockup />
                <div className="relative z-10 my-auto max-w-md py-9 md:py-16">
                    <p className="text-[10px] font-bold tracking-[0.17em] text-[#78847c]">RUANG USAHA, LEBIH TERTATA</p>
                    <h1 className="mt-6 font-serif text-[44px] font-normal leading-[0.98] tracking-[-0.055em] text-[#263a30] sm:text-6xl xl:text-[68px]">
                        {isSetup ? <>Mulai dari<br />usaha Anda.</> : <>Semua usaha<br />punya cerita.</>}
                    </h1>
                    <p className="mt-5 max-w-sm text-sm leading-7 text-[#68746d]">
                        {isSetup
                            ? "Siapkan identitas usaha dan akun pemilik. Setelah ini, Anda bisa mulai membangun operasional di satu tempat."
                            : "Masuk ke ruang kerja yang membantu urusan transaksi dan keuangan terasa lebih jelas."}
                    </p>
                </div>
                <div className="relative hidden min-h-36 items-end justify-between md:flex">
                    <div className="pointer-events-none absolute -bottom-64 -left-8 size-64 rounded-full border border-[#40644e]/10 after:absolute after:-inset-10 after:rounded-full after:border after:border-[#40644e]/10" />
                    {business?.logoData
                        ? <img className="relative z-10 size-[76px] rounded-2xl border border-[#40644e]/10 bg-white/70 object-contain p-2" src={business.logoData} alt="Logo usaha" />
                        : <span className="relative z-10 ml-16 size-24 rounded-full bg-[#d9e2d6] after:absolute after:left-28 after:top-[-32px] after:size-11 after:rounded-full after:bg-[#c5d3c5]" />}
                    <span className="relative z-10 text-[11px] text-[#718078]">Dibuat untuk usaha yang terus tumbuh.</span>
                    <span className="relative z-10 flex items-center gap-2 text-[10px] font-bold tracking-widest text-[#42604f]">01 <i className="h-px w-5 bg-[#9baa9e]" /> 04</span>
                </div>
            </aside>

            <section className="flex min-h-[70vh] flex-col bg-white px-6 py-6 sm:px-10 md:min-h-screen md:px-12 md:py-8 xl:px-[4.5rem]">
                <div className="flex justify-between border-b border-[#eff0ed] pb-4 text-[9px] font-bold tracking-[0.14em] text-[#929a94]">
                    <span>{isSetup ? "PENGATURAN AWAL" : "AKSES RUANG USAHA"}</span><span>01 / 04</span>
                </div>
                {children}
                <footer className="flex justify-between border-t border-[#eff0ed] pt-4 text-[8px] font-bold tracking-[0.12em] text-[#929a94]">
                    <span className="flex items-center gap-2">ALPOS <i className="h-px w-3 bg-[#d1d8d1]" /> USAHA DALAM GENGGAMAN</span><span>v0.1.0</span>
                </footer>
            </section>
        </main>
    );
}
