import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md border border-line bg-canvas px-2 py-0.5 text-xs text-ink", className)}
      {...props}
    />
  );
}
