"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

type PopoverContentProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
  sameWidth?: boolean
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = "start", side = "bottom", sideOffset = 6, sameWidth = false, collisionPadding = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      side={side}
      sideOffset={sideOffset}
      avoidCollisions
      collisionPadding={collisionPadding}
      className={cn(
        // Base styles
        "z-50 outline-none will-change-[transform,opacity]",
        "max-h-[min(80vh,480px)] overflow-y-auto",
        
        // Appearance - mobile-first
        "bg-white text-zinc-900",
        "border border-zinc-200",
        "rounded-2xl sm:rounded-xl",
        "p-4 sm:p-4",
        "shadow-lg sm:shadow-md",
        
        // Animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        
        sameWidth && "min-w-[var(--radix-popover-trigger-width)] w-[var(--radix-popover-trigger-width)]",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
