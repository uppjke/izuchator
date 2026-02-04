"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button variants with Apple HIG-compliant touch targets
 * Minimum touch target: 44x44px on mobile, can be smaller on desktop
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "rounded-full",
    "active:scale-95 touch-manipulation", // Better touch response
    "select-none", // Prevent text selection on touch
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Mobile-first sizes with 44px minimum touch target
        default: "h-12 px-5 min-w-[44px] sm:h-10 sm:px-4",
        sm: "h-10 px-4 text-xs min-w-[44px] sm:h-8 sm:px-3",
        lg: "h-14 px-8 min-w-[44px] sm:h-12 sm:px-6",
        xl: "h-16 px-10 text-lg min-w-[44px]",
        // Special sizes
        hero: "h-14 px-8 text-base sm:h-12 sm:px-6",
        header: "h-10 px-4 text-sm",
        mobileMenu: "h-14 px-6 w-full justify-start",
        // Icon buttons with proper touch targets
        icon: "h-12 w-12 sm:h-10 sm:w-10 p-0",
        iconSm: "h-10 w-10 sm:h-8 sm:w-8 p-0",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
