"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * ResponsiveDialogContent - Mobile-first dialog that becomes a bottom sheet on mobile
 * On mobile (< 640px): slides up from bottom as a sheet
 * On desktop (>= 640px): centered modal dialog
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Base styles
          "bg-background fixed z-50 grid gap-4 border shadow-lg",
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
          
          // Mobile: Bottom sheet style (default)
          "inset-x-0 bottom-0 rounded-t-3xl p-6 pt-4",
          "max-h-[90dvh] overflow-y-auto",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          
          // Desktop: Centered modal
          "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
          "sm:max-w-lg sm:w-full sm:max-h-[85vh] sm:rounded-2xl sm:p-6",
          "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]",
          "sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
          
          className
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
        {...props}
      >
        {/* Mobile drag indicator */}
        <div className="mx-auto w-12 h-1.5 rounded-full bg-zinc-300 sm:hidden" />
        
        {children}
        
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              "absolute top-4 right-4 rounded-full p-2",
              "opacity-70 transition-all duration-200 ease-out",
              "hover:opacity-100 hover:bg-zinc-100 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2",
              "disabled:pointer-events-none",
              // Larger touch target for mobile (44px minimum per HIG)
              "min-h-[44px] min-w-[44px] flex items-center justify-center",
              "sm:min-h-[36px] sm:min-w-[36px] sm:p-1.5"
            )}
          >
            <XIcon className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="sr-only">Закрыть</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2",
        // Mobile: stack buttons vertically with larger touch targets
        "[&>button]:w-full sm:[&>button]:w-auto",
        "[&>button]:min-h-[48px] sm:[&>button]:min-h-[40px]",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
