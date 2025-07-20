'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function RegisterDialog({ 
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
          <DialogTitle className="text-center">Создание аккаунта</DialogTitle>
        </DialogHeader>
        {/* <RegisterForm /> */}
      </DialogContent>
    </Dialog>
  )
}