import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// GET /api/boards/[id] — получить доску с элементами
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const board = await db.board.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        relation: {
          include: {
            student: { select: { id: true, name: true, email: true } },
            teacher: { select: { id: true, name: true, email: true } },
          }
        },
        elements: {
          orderBy: { zIndex: 'asc' },
          include: {
            creator: { select: { id: true, name: true } }
          }
        },
      },
    })

    if (!board) {
      return NextResponse.json({ error: 'Доска не найдена' }, { status: 404 })
    }

    // Проверяем доступ: учитель-создатель или ученик из связи
    const userId = session.user.id
    const isTeacher = board.teacherId === userId
    const isStudent = board.relation?.studentId === userId

    if (!isTeacher && !isStudent) {
      return NextResponse.json({ error: 'Нет доступа к этой доске' }, { status: 403 })
    }

    return NextResponse.json({ board, role: isTeacher ? 'teacher' : 'student' })
  } catch (error) {
    console.error('GET /api/boards/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/boards/[id] — обновить доску
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Только учитель-создатель может редактировать настройки доски
    const board = await db.board.findFirst({
      where: { id, teacherId: session.user.id },
    })

    if (!board) {
      return NextResponse.json({ error: 'Доска не найдена или нет доступа' }, { status: 404 })
    }

    const body = await request.json()
    const { title, settings, thumbnail, relationId } = body

    // Если указан relationId — проверяем, что это связь текущего учителя
    if (relationId !== undefined && relationId !== null) {
      const relation = await db.teacherStudentRelation.findFirst({
        where: {
          id: relationId,
          teacherId: session.user.id,
          status: 'ACTIVE',
          deletedAt: null,
        }
      })
      if (!relation) {
        return NextResponse.json({ error: 'Связь не найдена' }, { status: 404 })
      }
    }

    const updatedBoard = await db.board.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(settings !== undefined && { settings }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(relationId !== undefined && { relationId: relationId || null }),
      },
      include: {
        relation: {
          include: {
            student: { select: { id: true, name: true, email: true } },
            teacher: { select: { id: true, name: true, email: true } },
          }
        },
      },
    })

    return NextResponse.json({ board: updatedBoard })
  } catch (error) {
    console.error('PATCH /api/boards/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/boards/[id] — удалить доску (только учитель-создатель)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const board = await db.board.findFirst({
      where: { id, teacherId: session.user.id },
    })

    if (!board) {
      return NextResponse.json({ error: 'Доска не найдена или нет доступа' }, { status: 404 })
    }

    // Cascade delete удалит и все элементы
    await db.board.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/boards/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
