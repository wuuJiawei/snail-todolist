import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, onClick, children, ...props }, ref) => {
    const [pending, setPending] = React.useState(false)
    const isLoading = loading || pending

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      const result = onClick?.(event) as unknown
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        setPending(true)
        void Promise.resolve(result).then(
          () => setPending(false),
          () => setPending(false),
        )
      }
    }

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={onClick}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn("relative", buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        onClick={onClick ? handleClick : undefined}
        {...props}
      >
        <span className={cn("inline-flex items-center gap-2", isLoading && "opacity-0")}>
          {children}
        </span>
        {isLoading && <Loader2 data-loading-spinner className="absolute h-4 w-4 animate-spin" aria-hidden="true" />}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
