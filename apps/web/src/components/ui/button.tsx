import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button component following AGENTS.md accessibility guidelines:
 * - MUST: Hit target >= 24px (mobile >= 44px)
 * - MUST: Visible focus rings (:focus-visible)
 * - MUST: touch-action: manipulation (applied via globals.css)
 * - MUST: Increased contrast on :hover/:active/:focus
 */
const buttonVariants = cva(
  // Base styles with AGENTS.md requirements:
  // - min-h-[24px] for minimum hit target (44px on touch via globals.css)
  // - focus-visible:ring-2 for visible focus rings
  // - active:scale-[0.98] for subtle feedback
  // - transition uses transform/opacity (compositor-friendly per AGENTS.md)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] min-h-[24px]",
  {
    variants: {
      variant: {
        default:
          // AGENTS.md: Increase contrast on hover/active/focus
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-md active:bg-primary/80 focus-visible:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md active:bg-destructive/80",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 active:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline focus-visible:underline",
      },
      size: {
        // AGENTS.md: All sizes maintain minimum 24px height (44px on touch devices)
        default: "h-9 px-4 py-2 min-w-[24px]",
        sm: "h-8 rounded-md px-3 text-xs min-w-[24px]",
        lg: "h-10 rounded-md px-8 min-w-[24px]",
        // Icon buttons: ensure minimum 24px x 24px hit target
        icon: "h-9 w-9 min-h-[24px] min-w-[24px]",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    // Suppress hydration warnings when used with Radix UI (asChild) or when Radix UI sets dynamic IDs
    const shouldSuppressHydration = asChild || props.id?.startsWith("radix-")
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        suppressHydrationWarning={shouldSuppressHydration}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
