import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// GET /api/lessons - получить уроки пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Получаем информацию о пользователе с ролью
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let whereClause: Record<string, unknown>

    if (user.role === 'TEACHER') {
      // Преподаватели видят уроки, которые они создали
      whereClause = {
        userId: session.user.id,
      }
    } else {
      // Ученики видят только уроки, назначенные им через связи teacher-student
      whereClause = {
        relation: {
          studentId: session.user.id,
          status: 'ACTIVE',
          deletedAt: null,
        }
      }
    }

    if (startDate && endDate) {
      whereClause.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const lessons = await db.lesson.findMany({
      where: whereClause,
      include: {
        relation: {
          include: {
            teacher: true,
            student: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json(lessons)
  } catch (error) {
    console.error('Error fetching lessons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/lessons - создать урок (только для преподавателей)
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Only teachers can create lessons' }, { status: 403 })
    }

    const data = await request.json()
    
    const lesson = await db.lesson.create({
      data: {
        ...data,
        userId: session.user.id,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    })

    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Error creating lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
