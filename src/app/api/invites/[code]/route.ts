import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// GET /api/invites/[code] - получить приглашение по коду
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const invite = await db.inviteLink.findFirst({
      where: {
        code: code,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        createdBy: true,
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Приглашение не найдено или истекло' }, { status: 404 })
    }

    return NextResponse.json(invite)
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
