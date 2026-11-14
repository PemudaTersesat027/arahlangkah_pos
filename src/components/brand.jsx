import { Building2, Store } from "lucide-react";

export function BrandMark({ className = "" }) {
    return (
        <span className={`grid size-[35px] place-items-center rounded-[11px] bg-[#345b49] text-white ${className}`}>
            <Store size={19} />
        </span>
    );
}

export function BrandLockup() {
    return (
        <div className="flex items-center gap-[11px] text-lg font-bold tracking-[-0.04em] text-[#263a30]">
            <BrandMark />
            <span>Nexus<span className="font-medium text-[#87928b]">POS</span></span>
        </div>
    );
}

export function BusinessAvatar({ business, className = "" }) {
    return (
        <div className={`grid size-[58px] place-items-center overflow-hidden rounded-[17px] border border-[#e8ede7] bg-[#f4f7f2] text-[#54745e] ${className}`}>
            {business?.logoData
                ? <img className="size-full object-contain p-[7px]" src={business.logoData} alt="Logo usaha" />
                : <Building2 size={24} />}
        </div>
    );
}
