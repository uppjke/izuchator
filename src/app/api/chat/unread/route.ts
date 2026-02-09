import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// GET /api/chat/unread — непрочитанные + превью последних сообщений
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Получаем все активные связи пользователя
    const relations = await db.teacherStudentRelation.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { teacherId: userId },
          { studentId: userId },
        ],
      },
      select: { id: true },
    })

    if (relations.length === 0) {
      return NextResponse.json({ unread: {}, total: 0, lastMessages: {} })
    }

    const relationIds = relations.map((r) => r.id)

    // Параллельно: непрочитанные + последнее сообщение каждого чата
    const [unreadCounts, lastMessageRows] = await Promise.all([
      // Считаем непрочитанные сообщения
      db.chatMessage.groupBy({
        by: ['relationId'],
        where: {
          relationId: { in: relationIds },
          senderId: { not: userId },
          reads: {
            none: { userId },
          },
        },
        _count: true,
      }),
      // Последнее сообщение каждого чата
      Promise.all(
        relationIds.map((relationId) =>
          db.chatMessage.findFirst({
            where: { relationId },
            orderBy: { createdAt: 'desc' },
            select: {
              text: true,
              senderId: true,
              createdAt: true,
              sender: { select: { name: true } },
              relationId: true,
            },
          }),
        ),
      ),
    ])

    const unread: Record<string, number> = {}
    let total = 0
    for (const item of unreadCounts) {
      unread[item.relationId] = item._count
      total += item._count
    }

    const lastMessages: Record<string, { text: string; senderId: string; createdAt: string; senderName: string | null }> = {}
    for (const msg of lastMessageRows) {
      if (msg) {
        lastMessages[msg.relationId] = {
          text: msg.text,
          senderId: msg.senderId,
          createdAt: msg.createdAt.toISOString(),
          senderName: msg.sender.name,
        }
      }
    }

    return NextResponse.json({ unread, total, lastMessages })
  } catch (error) {
    console.error('GET /api/chat/unread error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
