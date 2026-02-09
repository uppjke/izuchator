import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'
import {
  sendMessageSchema,
  getMessagesQuerySchema,
  validateRequest,
  validationErrorResponse,
} from '@/lib/validations'

// GET /api/chat?relationId=...&cursor=...&limit=50 — получить сообщения
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryValidation = validateRequest(getMessagesQuerySchema, {
      relationId: searchParams.get('relationId') || undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || 50,
    })

    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation.error)
    }

    const { relationId, cursor, limit } = queryValidation.data

    // Проверяем что пользователь участник этой связи
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

    const messages = await db.chatMessage.findMany({
      where: { relationId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // +1 чтобы узнать есть ли ещё
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
        reads: {
          where: { userId: { not: session.user.id } },
          select: { userId: true, readAt: true },
        },
      },
    })

    const hasMore = messages.length > limit
    const items = hasMore ? messages.slice(0, limit) : messages

    return NextResponse.json({
      messages: items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    })
  } catch (error) {
    console.error('GET /api/chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat — отправить сообщение
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validateRequest(sendMessageSchema, body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const { relationId, text } = validation.data

    // Проверяем что пользователь участник этой связи
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

    const message = await db.chatMessage.create({
      data: {
        relationId,
        senderId: session.user.id,
        text: text.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
        reads: true,
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('POST /api/chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
