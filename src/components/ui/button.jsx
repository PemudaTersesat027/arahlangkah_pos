import { cn } from "../../lib/utils";

const variants = {
    default: "bg-[#315b49] text-white hover:bg-[#254a39]",
    outline: "border border-[#e2e7e0] bg-white text-[#596b60] hover:bg-[#f7f9f6]",
    ghost: "bg-transparent text-[#68756d] hover:bg-[#f2f5f0]",
};

export function Button({ className, variant = "default", type = "button", ...props }) {
    return (
        <button
            type={type}
            className={cn(
                "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ba995] disabled:pointer-events-none disabled:opacity-60",
                variants[variant] || variants.default,
                className,
            )}
            {...props}
        />
    );
}
