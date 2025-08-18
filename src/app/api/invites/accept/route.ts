import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// POST /api/invites/accept - принять приглашение
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()

    // Ищем активное приглашение
    const invite = await db.inviteLink.findFirst({
      where: {
        code,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        createdBy: true,
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Приглашение не найдено или истекло' }, { status: 404 })
    }

    // Проверяем, что пользователь не пытается принять собственное приглашение
    if (invite.createdById === session.user.id) {
      return NextResponse.json({ error: 'Нельзя принять собственное приглашение' }, { status: 400 })
    }

    // Определяем роли
    const isStudentToTeacher = invite.type === 'STUDENT_TO_TEACHER'
    const teacherId = isStudentToTeacher ? session.user.id : invite.createdById
    const studentId = isStudentToTeacher ? invite.createdById : session.user.id

    // Проверяем, есть ли уже связь
    const existingRelation = await db.teacherStudentRelation.findFirst({
      where: {
        teacherId,
        studentId,
      },
    })

    let relation

    if (existingRelation) {
      // Реактивируем существующую связь
      relation = await db.teacherStudentRelation.update({
        where: { id: existingRelation.id },
        data: {
          status: 'ACTIVE',
          deletedAt: null,
          // Сбрасываем кастомные данные при реактивации
          teacherName: null,
          studentName: null,
          teacherNotes: null,
          studentNotes: null,
        },
      })
    } else {
      // Создаем новую связь
      relation = await db.teacherStudentRelation.create({
        data: {
          teacherId,
          studentId,
          status: 'ACTIVE',
        },
      })
    }

    // Записываем использование приглашения
    await db.inviteUse.create({
      data: {
        inviteId: invite.id,
        userId: session.user.id,
      },
    })

    // Деактивируем приглашение
    await db.inviteLink.update({
      where: { id: invite.id },
      data: { isActive: false },
    })

    return NextResponse.json(relation)
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
