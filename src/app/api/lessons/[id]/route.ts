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

    // Если переносим время (start/end изменены) — фиксируем предыдущие значения и статус
    if (updateData.startTime || updateData.endTime) {
      const rescheduleData: Record<string, unknown> = {}
      if (updateData.startTime && lesson.startTime.getTime() !== updateData.startTime.getTime()) {
        rescheduleData.previousStartTime = lesson.startTime
      }
      if (updateData.endTime && lesson.endTime.getTime() !== updateData.endTime.getTime()) {
        rescheduleData.previousEndTime = lesson.endTime
      }
      if (rescheduleData.previousStartTime || rescheduleData.previousEndTime) {
        rescheduleData.status = 'rescheduled'
      }
      Object.assign(updateData, rescheduleData)
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

    const scope = request.nextUrl.searchParams.get('scope') as 'single' | 'weekday' | 'all_future_student' | null

    // Получаем информацию о пользователе с ролью
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can delete lessons' }, { status: 403 })
    }

    const lesson = await db.lesson.findFirst({
      where: { id, userId: session.user.id },
      include: { relation: true }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Урок не найден' }, { status: 404 })
    }

    // По умолчанию удаляем один урок
    let deletedCount = 0

    if (!scope || scope === 'single') {
      await db.lesson.delete({ where: { id } })
      deletedCount = 1
    } else if (scope === 'weekday') {
      // Удаляем только выбранное и будущие занятия в тот же день недели (прошлые не трогаем)
      if (!lesson.relationId) {
        await db.lesson.delete({ where: { id } })
        deletedCount = 1
      } else {
        const weekday = lesson.startTime.getUTCDay()
        const startTs = lesson.startTime
        const candidates = await db.lesson.findMany({
          where: {
            userId: session.user.id,
            relationId: lesson.relationId,
            startTime: { gte: startTs }
          },
          select: { id: true, startTime: true }
        })
        const toDelete = candidates.filter(l => l.startTime.getUTCDay() === weekday).map(l => l.id)
        if (toDelete.length) {
          await db.$transaction(toDelete.map(lid => db.lesson.delete({ where: { id: lid } })))
        }
        deletedCount = toDelete.length
      }
    } else if (scope === 'all_future_student') {
      // Удаляем это и все будущие уроки по relation (для данного ученика) начиная с даты начала удаляемого урока
      if (!lesson.relationId) {
        await db.lesson.delete({ where: { id } })
        deletedCount = 1
      } else {
        const startTs = lesson.startTime
        const futureLessons = await db.lesson.findMany({
          where: {
            userId: session.user.id,
            relationId: lesson.relationId,
            startTime: { gte: startTs }
          },
          select: { id: true }
        })
        if (futureLessons.length) {
          await db.$transaction(futureLessons.map(l => db.lesson.delete({ where: { id: l.id } })))
        }
        deletedCount = futureLessons.length
      }
    }

    return NextResponse.json({ success: true, deleted: deletedCount, scope: scope || 'single' })
  } catch (error) {
    console.error('Error deleting lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
