import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const inputBase =
  "w-full rounded-lg border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 transition-colors hover:border-gray-300 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/10 aria-[invalid=true]:border-brand aria-[invalid=true]:bg-brand-soft/30";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputBase, "h-11", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputBase, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const NativeSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(inputBase, "h-11 appearance-none pe-10", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  ),
);
NativeSelect.displayName = "NativeSelect";
