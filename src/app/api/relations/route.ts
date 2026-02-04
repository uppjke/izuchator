import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'
import { createInviteSchema, validateRequest } from '@/lib/validations'

// GET /api/relations - получить связи пользователя
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Получаем связи где пользователь является преподавателем
    const asTeacher = await db.teacherStudentRelation.findMany({
      where: {
        teacherId: userId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        student: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Получаем связи где пользователь является студентом
    const asStudent = await db.teacherStudentRelation.findMany({
      where: {
        studentId: userId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        teacher: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ asTeacher, asStudent })
  } catch (error) {
    console.error('Error fetching relations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/relations - создать приглашение
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body
    const body = await request.json()
    const validation = validateRequest(createInviteSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error },
        { status: 400 }
      )
    }

    const { type, message, expiresInHours } = validation.data

    // Генерируем уникальный код
    const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    const invite = await db.inviteLink.create({
      data: {
        code,
        type: type || 'STUDENT_TO_TEACHER',
        message,
        expiresAt: new Date(Date.now() + (expiresInHours || 24) * 60 * 60 * 1000),
        createdById: session.user.id,
      },
    })

    return NextResponse.json({ code: invite.code })
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
