import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'
import { 
  createLessonSchema, 
  getLessonsQuerySchema, 
  validateRequest,
  validationErrorResponse 
} from '@/lib/validations'

// GET /api/lessons - получить уроки пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Валидация query параметров
    const queryValidation = validateRequest(getLessonsQuerySchema, {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })
    
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation.error)
    }
    
    const { startDate, endDate } = queryValidation.data

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
        board: {
          select: { id: true, title: true, thumbnail: true },
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

    const rawData = await request.json()
    
    // Валидация входных данных
    const validation = validateRequest(createLessonSchema, rawData)
    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }
    
    const data = validation.data
    
    const lesson = await db.lesson.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        relationId: data.relationId,
        boardId: data.boardId || undefined,
        isRecurring: data.isRecurring ?? false,
        recurrence: data.recurrence as Prisma.InputJsonValue ?? Prisma.JsonNull,
        labelColor: data.labelColor,
        userId: session.user.id,
      },
    })

    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Error creating lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
