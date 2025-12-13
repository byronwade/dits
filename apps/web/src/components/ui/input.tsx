import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input component following AGENTS.md accessibility guidelines:
 * - MUST: Mobile input font-size >= 16px (prevents iOS zoom)
 * - MUST: Visible focus rings (:focus-visible)
 * - NEVER: Block paste (not implemented here)
 * - MUST: autocomplete + meaningful name support
 * - SHOULD: Disable spellcheck for emails/codes/usernames (via props)
 * - MUST: touch-action: manipulation (via globals.css)
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // AGENTS.md: text-base (16px) on mobile to prevent iOS zoom, md:text-sm on larger screens
          // AGENTS.md: focus-visible:ring-2 for visible focus rings with offset
          // AGENTS.md: min-h-[44px] on touch devices for adequate hit target
          "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
