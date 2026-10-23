import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[15px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-60 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-deep",
        outline: "border border-line bg-white text-ink hover:border-gold hover:bg-gold-soft/60",
        ghost: "text-muted hover:text-ink hover:bg-canvas",
        link: "text-brand underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        md: "h-11 min-w-32 px-5",
        sm: "h-9 px-3 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
