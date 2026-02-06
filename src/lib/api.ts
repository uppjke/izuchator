// Клиентский API для работы с backend через fetch
// Все функции используют API routes, а не прямое подключение к БД

export type RelationStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED'

// Типы для работы с уроками
export interface CreateLessonData {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  relationId?: string
  isRecurring?: boolean
  recurrence?: Record<string, unknown>
  labelColor?: string
}

export interface UpdateLessonData extends Partial<CreateLessonData> {
  id: string
  status?: string
}

// Работа со связями

export async function getTeacherStudents() {
  const response = await fetch('/api/relations')
  if (!response.ok) {
    throw new Error('Failed to fetch relations')
  }
  const data = await response.json()
  return data.asTeacher || []
}

export async function getStudentTeachers() {
  const response = await fetch('/api/relations')
  if (!response.ok) {
    throw new Error('Failed to fetch relations')
  }
  const data = await response.json()
  return data.asStudent || []
}

export async function createInviteLink(
  type: 'STUDENT_TO_TEACHER' | 'TEACHER_TO_STUDENT',
  message?: string,
  expiresInHours: number = 24
) {
  const response = await fetch('/api/relations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, message, expiresInHours }),
  })

  if (!response.ok) {
    throw new Error('Failed to create invite')
  }

  const data = await response.json()
  return data.code
}

export async function acceptInviteLink(inviteCode: string) {
  try {
    const response = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: inviteCode }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        message: error.error || 'Ошибка при принятии приглашения'
      }
    }

    const data = await response.json()
    return {
      success: true,
      data
    }
  } catch {
    return {
      success: false,
      message: 'Ошибка при принятии приглашения'
    }
  }
}

export async function getInviteByCode(code: string) {
  try {
    const response = await fetch(`/api/invites/${code}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        message: errorData.error || 'Приглашение не найдено'
      }
    }
    
    const invite = await response.json()
    return {
      success: true,
      invite: {
        invite_type: invite.type === 'TEACHER_TO_STUDENT' ? 'teacher_to_student' : 'student_to_teacher',
        creator_name: invite.createdBy?.name || 'Неизвестный пользователь'
      }
    }
  } catch {
    return {
      success: false,
      message: 'Ошибка при проверке приглашения'
    }
  }
}

// Работа с уроками

export async function getLessons(startDate?: Date, endDate?: Date) {
  let url = '/api/lessons'
  if (startDate && endDate) {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })
    url += `?${params}`
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch lessons')
  }
  return await response.json()
}

export async function getLessonsForPeriod(startDate: Date, endDate: Date) {
  return await getLessons(startDate, endDate)
}

export async function createLesson(data: CreateLessonData) {
  const response = await fetch('/api/lessons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create lesson')
  }

  return await response.json()
}

export async function updateLesson(data: UpdateLessonData) {
  const { id, ...updateData } = data
  
  const response = await fetch(`/api/lessons/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  })

  if (!response.ok) {
    throw new Error('Failed to update lesson')
  }

  return await response.json()
}

export type DeleteLessonScope = 'single' | 'weekday' | 'all_future_student'

export async function deleteLesson(lessonId: string, scope: DeleteLessonScope = 'single') {
  const url = new URL(`/api/lessons/${lessonId}`, window.location.origin)
  if (scope && scope !== 'single') {
    url.searchParams.set('scope', scope)
  }
  const response = await fetch(url.toString().replace(window.location.origin, ''), {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete lesson')
  }

  return await response.json()
}

export async function getLessonById(lessonId: string) {
  const response = await fetch(`/api/lessons/${lessonId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch lesson')
  }
  return await response.json()
}

// Совместимость со старым API

export async function removeTeacherStudentRelation(relationId: string) {
  const response = await fetch(`/api/relations/${relationId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to remove relation')
  }

  return await response.json()
}

export async function updateCustomNameInRelation(
  relationId: string,
  customName: string,
  isTeacher: boolean = false
) {
  const data = isTeacher 
    ? { teacherName: customName }
    : { studentName: customName }
  
  const response = await fetch(`/api/relations/${relationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update relation')
  }

  return await response.json()
}

export async function updateNotesInRelation(
  relationId: string,
  notes: string,
  isTeacher: boolean = false
) {
  const data = isTeacher 
    ? { teacherNotes: notes }
    : { studentNotes: notes }
  
  const response = await fetch(`/api/relations/${relationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update relation')
  }

  return await response.json()
}

// Работа с файлами

export interface FileData {
  id: string
  name: string
  originalName: string
  size: number
  mimeType: string
  fileType: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER'
  path: string
  url?: string
  userId: string
  relationId?: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  user?: {
    name?: string
    email?: string
  }
  relation?: {
    teacherName?: string
    studentName?: string
    teacher?: { name?: string; email?: string }
    student?: { name?: string; email?: string }
  }
  shares?: Array<{
    id: string
    relationId: string
    createdAt: string
    relation: {
      id: string
      studentName?: string
      student: { name?: string; email?: string }
    }
  }>
}

export async function uploadFile(file: File, relationId?: string): Promise<FileData> {
  const formData = new FormData()
  formData.append('file', file)
  if (relationId) {
    formData.append('relationId', relationId)
  }

  const response = await fetch('/api/files', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  const data = await response.json()
  return data.file
}

export async function getFiles(params?: {
  relationId?: string
  type?: string
}): Promise<FileData[]> {
  const searchParams = new URLSearchParams()
  if (params?.relationId) searchParams.set('relationId', params.relationId)
  if (params?.type) searchParams.set('type', params.type)

  const response = await fetch(`/api/files?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch files')
  }

  const data = await response.json()
  return data.files
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete file')
  }
}

export function getFileDownloadUrl(fileId: string): string {
  return `/api/files/${fileId}`
}

// File sharing

export interface FileShareData {
  id: string
  fileId: string
  relationId: string
  createdAt: string
  relation: {
    id: string
    studentName?: string
    student: { name?: string; email?: string }
  }
}

export interface SharedFileData extends FileData {
  sharedBy: {
    name?: string
    email?: string
  }
  sharedAt: string
}

export async function shareFile(fileId: string, relationIds: string[]): Promise<FileShareData[]> {
  const response = await fetch(`/api/files/${fileId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ relationIds }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to share file')
  }

  const data = await response.json()
  return data.shares
}

export async function getFileShares(fileId: string): Promise<FileShareData[]> {
  const response = await fetch(`/api/files/${fileId}/share`)
  if (!response.ok) {
    throw new Error('Failed to get file shares')
  }

  const data = await response.json()
  return data.shares
}

export async function unshareFile(fileId: string, relationId: string): Promise<void> {
  const response = await fetch(`/api/files/${fileId}/share?relationId=${relationId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to unshare file')
  }
}

export async function getSharedFiles(): Promise<SharedFileData[]> {
  const response = await fetch('/api/files?shared=true')
  if (!response.ok) {
    throw new Error('Failed to fetch shared files')
  }

  const data = await response.json()
  return data.files
}

// ============================================================================
// Работа с досками
// ============================================================================

export interface BoardListItem {
  id: string
  title: string
  teacherId: string
  relationId: string | null
  thumbnail: string | null
  createdAt: string
  updatedAt: string
  teacher?: { id: string; name: string | null; email: string }
  relation?: {
    id: string
    student: { id: string; name: string | null; email: string }
  } | null
  _count: { elements: number }
}

export interface CreateBoardData {
  title?: string
  relationId?: string
}

export async function getBoards(): Promise<BoardListItem[]> {
  const response = await fetch('/api/boards')
  if (!response.ok) {
    throw new Error('Failed to fetch boards')
  }
  const data = await response.json()
  return data.boards
}

export async function createBoard(data: CreateBoardData = {}): Promise<BoardListItem> {
  const response = await fetch('/api/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Failed to create board')
  }
  return response.json()
}

export async function getBoard(id: string) {
  const response = await fetch(`/api/boards/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch board')
  }
  return response.json()
}

export async function updateBoard(id: string, data: { title?: string; settings?: Record<string, unknown> }) {
  const response = await fetch(`/api/boards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error('Failed to update board')
  }
  return response.json()
}

export async function deleteBoard(id: string): Promise<void> {
  const response = await fetch(`/api/boards/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete board')
  }
}
