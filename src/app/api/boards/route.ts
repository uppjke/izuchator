import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { auth } from '@/lib/auth'

// GET /api/boards — список досок пользователя
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let boards

    if (user.role === 'TEACHER') {
      // Учитель видит свои доски
      boards = await db.board.findMany({
        where: { teacherId: user.id },
        include: {
          relation: {
            include: {
              student: { select: { id: true, name: true, email: true } }
            }
          },
          _count: { select: { elements: true } }
        },
        orderBy: { updatedAt: 'desc' }
      })
    } else {
      // Ученик видит доски, привязанные к его связям с учителями
      boards = await db.board.findMany({
        where: {
          relation: {
            studentId: user.id,
            status: 'ACTIVE',
            deletedAt: null,
          }
        },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
          relation: {
            include: {
              teacher: { select: { id: true, name: true, email: true } }
            }
          },
          _count: { select: { elements: true } }
        },
        orderBy: { updatedAt: 'desc' }
      })
    }

    return NextResponse.json({ boards })
  } catch (error) {
    console.error('GET /api/boards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/boards — создать доску (только учителя)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Только преподаватели могут создавать доски' }, { status: 403 })
    }

    const body = await request.json()
    const { title, relationId, settings } = body

    // Если указан relationId — проверяем, что это связь текущего учителя
    if (relationId) {
      const relation = await db.teacherStudentRelation.findFirst({
        where: {
          id: relationId,
          teacherId: user.id,
          status: 'ACTIVE',
          deletedAt: null,
        }
      })
      if (!relation) {
        return NextResponse.json({ error: 'Связь не найдена' }, { status: 404 })
      }
    }

    const board = await db.board.create({
      data: {
        title: title || 'Без названия',
        teacherId: user.id,
        relationId: relationId || null,
        settings: settings || { background: '#ffffff', gridEnabled: false },
      },
      include: {
        relation: {
          include: {
            student: { select: { id: true, name: true, email: true } }
          }
        },
        _count: { select: { elements: true } }
      }
    })

    return NextResponse.json({ board }, { status: 201 })
  } catch (error) {
    console.error('POST /api/boards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
