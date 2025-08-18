// API функции для работы с PostgreSQL через Prisma
import { db } from './database'
import { auth } from './auth'
import type { User } from '@prisma/client'

// Допустимые статусы для teacher_student_relations
export type RelationStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED'

// Типы для работы с уроками
export interface CreateLessonData {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  relationId?: string
  isRecurring?: boolean
  recurrence?: any
  labelColor?: string
}

export interface UpdateLessonData extends Partial<CreateLessonData> {
  id: string
}

// Получение студентов преподавателя
export async function getTeacherStudents() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return await db.teacherStudentRelation.findMany({
    where: {
      teacherId: session.user.id,
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
}

// Получение преподавателей студента
export async function getStudentTeachers() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return await db.teacherStudentRelation.findMany({
    where: {
      studentId: session.user.id,
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
}

// Создание приглашения
export async function createInviteLink(
  type: 'STUDENT_TO_TEACHER' | 'TEACHER_TO_STUDENT',
  message?: string,
  expiresInHours: number = 24
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Генерируем уникальный код
  const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  const invite = await db.inviteLink.create({
    data: {
      code,
      type,
      message,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      createdById: session.user.id,
    },
  })

  return invite.code
}

// Принятие приглашения
export async function acceptInviteLink(inviteCode: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Ищем активное приглашение
  const invite = await db.inviteLink.findFirst({
    where: {
      code: inviteCode,
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
    throw new Error('Приглашение не найдено или истекло')
  }

  // Проверяем, что пользователь не пытается принять собственное приглашение
  if (invite.createdById === session.user.id) {
    throw new Error('Нельзя принять собственное приглашение')
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

  return relation
}

// Отклонение связи
export async function rejectRelation(relationId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Проверяем, что пользователь является частью этой связи
  const relation = await db.teacherStudentRelation.findFirst({
    where: {
      id: relationId,
      OR: [
        { teacherId: session.user.id },
        { studentId: session.user.id },
      ],
    },
  })

  if (!relation) {
    throw new Error('Связь не найдена')
  }

  return await db.teacherStudentRelation.update({
    where: { id: relationId },
    data: {
      status: 'REJECTED',
      deletedAt: new Date(),
    },
  })
}

// Блокировка связи (софт удаление)
export async function blockRelation(relationId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const relation = await db.teacherStudentRelation.findFirst({
    where: {
      id: relationId,
      OR: [
        { teacherId: session.user.id },
        { studentId: session.user.id },
      ],
    },
  })

  if (!relation) {
    throw new Error('Связь не найдена')
  }

  return await db.teacherStudentRelation.update({
    where: { id: relationId },
    data: {
      status: 'BLOCKED',
      deletedAt: new Date(),
    },
  })
}

// Обновление кастомных данных связи
export async function updateRelationData(
  relationId: string,
  data: {
    teacherName?: string
    studentName?: string
    teacherNotes?: string
    studentNotes?: string
  }
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const relation = await db.teacherStudentRelation.findFirst({
    where: {
      id: relationId,
      OR: [
        { teacherId: session.user.id },
        { studentId: session.user.id },
      ],
      status: 'ACTIVE',
      deletedAt: null,
    },
  })

  if (!relation) {
    throw new Error('Активная связь не найдена')
  }

  return await db.teacherStudentRelation.update({
    where: { id: relationId },
    data,
  })
}

// Работа с уроками

// Получение уроков пользователя
export async function getLessons(startDate?: Date, endDate?: Date) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const whereClause: any = {
    userId: session.user.id,
  }

  if (startDate && endDate) {
    whereClause.startTime = {
      gte: startDate,
      lte: endDate,
    }
  }

  return await db.lesson.findMany({
    where: whereClause,
    orderBy: {
      startTime: 'asc',
    },
  })
}

// Создание урока
export async function createLesson(data: CreateLessonData) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return await db.lesson.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  })
}

// Обновление урока
export async function updateLesson(data: UpdateLessonData) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const { id, ...updateData } = data

  // Проверяем, что урок принадлежит пользователю
  const lesson = await db.lesson.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!lesson) {
    throw new Error('Урок не найден')
  }

  return await db.lesson.update({
    where: { id },
    data: updateData,
  })
}

// Удаление урока
export async function deleteLesson(lessonId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      userId: session.user.id,
    },
  })

  if (!lesson) {
    throw new Error('Урок не найден')
  }

  return await db.lesson.delete({
    where: { id: lessonId },
  })
}

// Дополнительные функции для совместимости со старым API

// Получение приглашения по коду
export async function getInviteByCode(code: string) {
  return await db.inviteLink.findFirst({
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
}

// Получение урока по ID
export async function getLessonById(lessonId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return await db.lesson.findFirst({
    where: {
      id: lessonId,
      userId: session.user.id,
    },
  })
}

// Получение уроков за период (алиас для getLessons)
export async function getLessonsForPeriod(startDate: Date, endDate: Date) {
  return await getLessons(startDate, endDate)
}

// Удаление связи преподаватель-студент (алиас для blockRelation)
export async function removeTeacherStudentRelation(relationId: string) {
  return await blockRelation(relationId)
}

// Обновление кастомного имени в связи
export async function updateCustomNameInRelation(
  relationId: string,
  customName: string,
  isTeacher: boolean = false
) {
  const data = isTeacher 
    ? { teacherName: customName }
    : { studentName: customName }
  
  return await updateRelationData(relationId, data)
}

// Обновление заметок в связи
export async function updateNotesInRelation(
  relationId: string,
  notes: string,
  isTeacher: boolean = false
) {
  const data = isTeacher 
    ? { teacherNotes: notes }
    : { studentNotes: notes }
  
  return await updateRelationData(relationId, data)
}
