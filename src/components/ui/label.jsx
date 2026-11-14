import { cn } from "../../lib/utils";

export function Label({ className, ...props }) {
    return (
        <label
            className={cn("text-[11px] font-semibold leading-none text-[#59645d]", className)}
            {...props}
        />
    );
}
