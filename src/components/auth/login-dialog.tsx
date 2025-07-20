'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function LoginDialog({ 
  children, 
  open, 
  onOpenChange 
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Вход</DialogTitle>
        </DialogHeader>
        {/* <LoginForm /> */}
      </DialogContent>
    </Dialog>
  )
}