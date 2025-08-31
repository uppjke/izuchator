import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// GET /api/lessons/[id] - получить урок по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем информацию о пользователе с ролью
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let lesson
    
    if (user.role === 'TEACHER') {
      // Преподаватели видят свои уроки
      lesson = await db.lesson.findFirst({
        where: {
          id: id,
          userId: session.user.id,
        },
        include: {
          relation: {
            include: {
              teacher: true,
              student: true,
            },
          },
        },
      })
    } else {
      // Ученики видят только уроки, назначенные им
      lesson = await db.lesson.findFirst({
        where: {
          id: id,
          relation: {
            studentId: session.user.id,
            status: 'ACTIVE',
            deletedAt: null,
          }
        },
        include: {
          relation: {
            include: {
              teacher: true,
              student: true,
            },
          },
        },
      })
    }

    if (!lesson) {
      return NextResponse.json({ error: 'Урок не найден' }, { status: 404 })
    }

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/lessons/[id] - обновить урок (только преподаватели)
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

    // Получаем информацию о пользователе с ролью
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, что пользователь - преподаватель
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can update lessons' }, { status: 403 })
    }

    const data = await request.json()

    // Проверяем, что урок принадлежит пользователю
    const lesson = await db.lesson.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Урок не найден' }, { status: 404 })
    }

    // Конвертируем даты если они переданы
    const updateData = { ...data }
    if (updateData.startTime) {
      updateData.startTime = new Date(updateData.startTime)
    }
    if (updateData.endTime) {
      updateData.endTime = new Date(updateData.endTime)
    }

    const updatedLesson = await db.lesson.update({
      where: { id: id },
      data: updateData,
    })

    return NextResponse.json(updatedLesson)
  } catch (error) {
    console.error('Error updating lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/lessons/[id] - удалить урок (только преподаватели)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем информацию о пользователе с ролью
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, что пользователь - преподаватель
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can delete lessons' }, { status: 403 })
    }

    const lesson = await db.lesson.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Урок не найден' }, { status: 404 })
    }

    await db.lesson.delete({
      where: { id: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
