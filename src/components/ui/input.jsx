import { cn } from "../../lib/utils";

export function Input({ className, type = "text", ...props }) {
    return (
        <input
            type={type}
            className={cn(
                "h-10 w-full min-w-0 rounded-md border border-[#e5e9e5] bg-white px-3 text-xs text-[#2e3932] shadow-sm outline-none transition placeholder:text-[#aeb6b0] focus-visible:border-[#8ba995] focus-visible:ring-2 focus-visible:ring-[#8ba995]/20 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}
