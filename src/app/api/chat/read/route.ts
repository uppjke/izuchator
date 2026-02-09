import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'
import { markReadSchema, validateRequest, validationErrorResponse } from '@/lib/validations'

// POST /api/chat/read — отметить сообщения прочитанными
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validateRequest(markReadSchema, body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const { relationId, messageIds } = validation.data

    // Проверяем что пользователь участник
    const relation = await db.teacherStudentRelation.findFirst({
      where: {
        id: relationId,
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { teacherId: session.user.id },
          { studentId: session.user.id },
        ],
      },
    })

    if (!relation) {
      return NextResponse.json({ error: 'Связь не найдена' }, { status: 404 })
    }

    // Массовое создание записей о прочтении (пропускаем дубликаты)
    await db.chatMessageRead.createMany({
      data: messageIds.map((messageId) => ({
        messageId,
        userId: session.user!.id!,
      })),
      skipDuplicates: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/chat/read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
