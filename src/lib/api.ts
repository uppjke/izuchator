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
  const response = await fetch('/api/invites/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: inviteCode }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to accept invite')
  }

  return await response.json()
}

export async function getInviteByCode(code: string) {
  const response = await fetch(`/api/invites/${code}`)
  if (!response.ok) {
    return null
  }
  return await response.json()
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

export async function deleteLesson(lessonId: string) {
  const response = await fetch(`/api/lessons/${lessonId}`, {
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
