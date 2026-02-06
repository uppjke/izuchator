import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// POST /api/boards/[id]/elements — добавить элемент на доску
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: boardId } = await params

    // Проверяем доступ к доске
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { relation: { select: { studentId: true } } }
    })

    if (!board) {
      return NextResponse.json({ error: 'Доска не найдена' }, { status: 404 })
    }

    const userId = session.user.id
    const hasAccess = board.teacherId === userId || board.relation?.studentId === userId
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const body = await request.json()
    const { elements } = body // Поддерживаем batch-добавление

    if (Array.isArray(elements)) {
      // Batch-создание (для загрузки сохранённой доски)
      const maxZ = await db.boardElement.aggregate({
        where: { boardId },
        _max: { zIndex: true }
      })

      const created = await db.boardElement.createMany({
        data: elements.map((el: { id?: string; type: string; data: unknown; zIndex?: number }, i: number) => ({
          ...(el.id && { id: el.id }),
          boardId,
          type: el.type,
          data: el.data as object,
          zIndex: el.zIndex ?? (maxZ._max.zIndex || 0) + i + 1,
          createdBy: userId,
        }))
      })

      return NextResponse.json({ count: created.count }, { status: 201 })
    }

    // Одиночное создание
    const { type, data, zIndex } = body

    if (!type || !data) {
      return NextResponse.json({ error: 'type и data обязательны' }, { status: 400 })
    }

    const element = await db.boardElement.create({
      data: {
        boardId,
        type,
        data: data as object,
        zIndex: zIndex ?? 0,
        createdBy: userId,
      }
    })

    return NextResponse.json({ element }, { status: 201 })
  } catch (error) {
    console.error('POST /api/boards/[id]/elements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/boards/[id]/elements — удалить элементы (batch)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: boardId } = await params
    const { searchParams } = new URL(request.url)
    const elementIds = searchParams.get('ids')?.split(',')

    if (!elementIds?.length) {
      return NextResponse.json({ error: 'ids параметр обязателен' }, { status: 400 })
    }

    // Проверяем доступ
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { relation: { select: { studentId: true } } }
    })

    if (!board) {
      return NextResponse.json({ error: 'Доска не найдена' }, { status: 404 })
    }

    const userId = session.user.id
    const hasAccess = board.teacherId === userId || board.relation?.studentId === userId
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const deleted = await db.boardElement.deleteMany({
      where: {
        id: { in: elementIds },
        boardId,
      }
    })

    return NextResponse.json({ deleted: deleted.count })
  } catch (error) {
    console.error('DELETE /api/boards/[id]/elements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
