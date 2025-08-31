import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/database'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { nanoid } from 'nanoid'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'application/zip', 'application/x-rar-compressed'
]

function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'ARCHIVE'
  return 'DOCUMENT'
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const relationId = formData.get('relationId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // Проверка типа файла
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Создание уникального имени файла
    const fileId = nanoid()
    const extension = file.name.split('.').pop()
    const fileName = `${fileId}.${extension}`

    // Создание директории для пользователя
    const userDir = join(process.cwd(), 'uploads', session.user.id)
    await mkdir(userDir, { recursive: true })

    // Сохранение файла
    const filePath = join(userDir, fileName)
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Сохранение в БД
    const savedFile = await db.file.create({
      data: {
        id: fileId,
        name: fileName,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        fileType: getFileType(file.type) as 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER',
        path: `uploads/${session.user.id}/${fileName}`,
        userId: session.user.id,
        relationId: relationId || undefined,
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json({ file: savedFile })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const relationId = searchParams.get('relationId')
    const fileType = searchParams.get('type') as 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER' | null

    const files = await db.file.findMany({
      where: {
        userId: session.user.id,
        ...(relationId && { relationId }),
        ...(fileType && { fileType }),
      },
      include: {
        user: {
          select: { name: true, email: true }
        },
        relation: {
          select: { 
            teacherName: true, 
            studentName: true,
            teacher: { select: { name: true, email: true } },
            student: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Get files error:', error)
    return NextResponse.json({ error: 'Failed to get files' }, { status: 500 })
  }
}
