"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"

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
 * On mobile (< 640px): slides up from bottom as a sheet with swipe-to-dismiss
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
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0.5])
  
  // Use CSS media query match for initial value to avoid flash
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 639px)').matches
  })
  
  // Listen for resize
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If dragged down more than 100px or with velocity > 500, close
    if (info.offset.y > 100 || info.velocity.y > 500) {
      // Find and click the close button
      const closeButton = document.querySelector('[data-slot="dialog-close"]') as HTMLButtonElement
      closeButton?.click()
    }
  }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Base styles
          "bg-background fixed z-50 grid gap-4 border shadow-lg outline-none",
          
          // Desktop: Centered modal with CSS animations
          "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
          "sm:max-w-lg sm:w-full sm:max-h-[85vh] sm:rounded-2xl sm:p-6",
          "sm:duration-200 sm:data-[state=open]:animate-in sm:data-[state=closed]:animate-out",
          "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          "sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0",
          
          // Mobile: Bottom sheet
          "inset-x-0 bottom-0 rounded-t-3xl p-6 pt-2",
          "max-h-[90dvh] overflow-y-auto",
          
          className
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
        asChild={isMobile}
        {...props}
      >
        {isMobile ? (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            style={{ y, opacity }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Mobile drag indicator */}
            <div className="py-3 cursor-grab active:cursor-grabbing">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-zinc-300" />
            </div>
            
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
                  "min-h-[44px] min-w-[44px] flex items-center justify-center"
                )}
              >
                <XIcon className="h-5 w-5" />
                <span className="sr-only">Закрыть</span>
              </DialogPrimitive.Close>
            )}
          </motion.div>
        ) : (
          <>
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
                  "min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5"
                )}
              >
                <XIcon className="h-4 w-4" />
                <span className="sr-only">Закрыть</span>
              </DialogPrimitive.Close>
            )}
          </>
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
