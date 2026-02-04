import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/database'

// Share file with student(s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await params
    const body = await request.json()
    const { relationIds } = body as { relationIds: string[] }

    if (!relationIds || !Array.isArray(relationIds) || relationIds.length === 0) {
      return NextResponse.json({ error: 'relationIds required' }, { status: 400 })
    }

    // Check that file belongs to user
    const file = await db.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check that all relations belong to user as teacher
    const relations = await db.teacherStudentRelation.findMany({
      where: {
        id: { in: relationIds },
        teacherId: session.user.id,
        status: 'ACTIVE',
      },
    })

    if (relations.length !== relationIds.length) {
      return NextResponse.json({ error: 'Invalid relations' }, { status: 400 })
    }

    // Create file shares (upsert to avoid duplicates)
    const shares = await Promise.all(
      relationIds.map((relationId) =>
        db.fileShare.upsert({
          where: {
            fileId_relationId: {
              fileId,
              relationId,
            },
          },
          create: {
            fileId,
            relationId,
          },
          update: {},
        })
      )
    )

    return NextResponse.json({ shares })
  } catch (error) {
    console.error('Share file error:', error)
    return NextResponse.json({ error: 'Failed to share file' }, { status: 500 })
  }
}

// Get shares for a file
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await params

    // Check that file belongs to user
    const file = await db.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const shares = await db.fileShare.findMany({
      where: { fileId },
      include: {
        relation: {
          select: {
            id: true,
            studentName: true,
            student: {
              select: { name: true, email: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ shares })
  } catch (error) {
    console.error('Get shares error:', error)
    return NextResponse.json({ error: 'Failed to get shares' }, { status: 500 })
  }
}

// Remove share from a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await params
    const { searchParams } = new URL(request.url)
    const relationId = searchParams.get('relationId')

    if (!relationId) {
      return NextResponse.json({ error: 'relationId required' }, { status: 400 })
    }

    // Check that file belongs to user
    const file = await db.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await db.fileShare.delete({
      where: {
        fileId_relationId: {
          fileId,
          relationId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unshare file error:', error)
    return NextResponse.json({ error: 'Failed to unshare file' }, { status: 500 })
  }
}
