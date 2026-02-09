import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// GET /api/chat/unread — количество непрочитанных сообщений по каждой связи
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
      return NextResponse.json({ unread: {}, total: 0 })
    }

    const relationIds = relations.map((r) => r.id)

    // Считаем непрочитанные сообщения: те, которые отправлены НЕ мной и НЕ прочитаны мной
    const unreadCounts = await db.chatMessage.groupBy({
      by: ['relationId'],
      where: {
        relationId: { in: relationIds },
        senderId: { not: userId }, // чужие сообщения
        reads: {
          none: { userId }, // которые я не прочитал
        },
      },
      _count: true,
    })

    const unread: Record<string, number> = {}
    let total = 0
    for (const item of unreadCounts) {
      unread[item.relationId] = item._count
      total += item._count
    }

    return NextResponse.json({ unread, total })
  } catch (error) {
    console.error('GET /api/chat/unread error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
