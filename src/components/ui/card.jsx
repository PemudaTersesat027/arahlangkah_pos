import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
    return <div className={cn("rounded-2xl border border-[#e7eae4] bg-white text-[#202b27] shadow-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
    return <div className={cn("p-6", className)} {...props} />;
}
