import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// POST /api/lessons/[id]/generate-board — auto-generate a board for a lesson
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Только преподаватели могут генерировать доски' }, { status: 403 })
    }

    // Находим урок
    const lesson = await db.lesson.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        board: { select: { id: true } },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Урок не найден' }, { status: 404 })
    }

    // Если доска уже привязана — возвращаем её
    if (lesson.boardId && lesson.board) {
      return NextResponse.json({ board: lesson.board, alreadyExists: true })
    }

    // Создаём новую доску
    const board = await db.board.create({
      data: {
        title: lesson.title || 'Доска к занятию',
        teacherId: user.id,
        relationId: lesson.relationId || null,
        settings: { background: '#ffffff', gridEnabled: false },
      },
      include: {
        _count: { select: { elements: true } },
      },
    })

    // Привязываем доску к уроку
    await db.lesson.update({
      where: { id },
      data: { boardId: board.id },
    })

    return NextResponse.json({ board, created: true }, { status: 201 })
  } catch (error) {
    console.error('POST /api/lessons/[id]/generate-board error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
