'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface InviteHandlerProps {
  onInviteFound: () => void
}

export function InviteHandler({ onInviteFound }: InviteHandlerProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const inviteCode = searchParams.get('invite')
    const inviteType = searchParams.get('type')
    
    if (inviteCode && inviteType) {
      onInviteFound()
    }
  }, [searchParams, onInviteFound])

  return null
}
