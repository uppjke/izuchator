import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// PATCH /api/relations/[id] - обновить связь
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Проверяем, что пользователь является частью этой связи
    const relation = await db.teacherStudentRelation.findFirst({
      where: {
        id: id,
        OR: [
          { teacherId: session.user.id },
          { studentId: session.user.id },
        ],
        status: 'ACTIVE',
        deletedAt: null,
      },
    })

    if (!relation) {
      return NextResponse.json({ error: 'Активная связь не найдена' }, { status: 404 })
    }

    const updatedRelation = await db.teacherStudentRelation.update({
      where: { id: id },
      data,
    })

    return NextResponse.json(updatedRelation)
  } catch (error) {
    console.error('Error updating relation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/relations/[id] - удалить связь
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const relation = await db.teacherStudentRelation.findFirst({
      where: {
        id: id,
        OR: [
          { teacherId: session.user.id },
          { studentId: session.user.id },
        ],
      },
    })

    if (!relation) {
      return NextResponse.json({ error: 'Связь не найдена' }, { status: 404 })
    }

    const updatedRelation = await db.teacherStudentRelation.update({
      where: { id: id },
      data: {
        status: 'BLOCKED',
        deletedAt: new Date(),
      },
    })

    return NextResponse.json(updatedRelation)
  } catch (error) {
    console.error('Error deleting relation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
