// Простые API функции для работы с связями
import { createSupabaseBrowserClient } from './supabase'
import type { Database } from './types/database.generated'

// Допустимые статусы для teacher_student_relations
export type RelationStatus = 'pending' | 'active' | 'rejected' | 'blocked'

// Тип для пользователя из auth.users
type AuthUser = {
  id: string
  email: string
  full_name: string
  role: string
}

type TeacherStudentRelation = Database['public']['Tables']['teacher_student_relations']['Row'] & {
  student?: AuthUser | null
  teacher?: AuthUser | null
}

// Типы для RPC функций
type GetTeacherStudentsReturn = Database['public']['Functions']['get_teacher_students']['Returns'][0]
type GetStudentTeachersReturn = Database['public']['Functions']['get_student_teachers']['Returns'][0]

export async function getTeacherStudents(teacherId: string) {
  const supabase = createSupabaseBrowserClient()
  
  // Используем RPC функцию для получения данных с именами
  const { data, error } = await supabase
    .rpc('get_teacher_students', {
      teacher_user_id: teacherId
    })
  
  if (error) {
    console.error('Error fetching teacher students:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Преобразуем данные в нужный формат
  const result = data.map((row: GetTeacherStudentsReturn) => {
    return {
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      teacher_id: row.teacher_id,
      student_id: row.student_id,
      status: row.status,
      invited_by: row.invited_by,
      invite_message: row.invite_message,
      rejected_reason: row.rejected_reason,
      deleted_at: row.deleted_at,
      teacher_custom_name_for_student: row.teacher_custom_name_for_student,
      student_custom_name_for_teacher: row.student_custom_name_for_teacher,
      teacher_notes: row.teacher_notes,
      student_notes: row.student_notes,
      student: row.student // student уже приходит как JSON объект от базы данных
    }
  })

  return result as TeacherStudentRelation[]
}

// Получить связи студента с преподавателями
export async function getStudentTeachers(studentId: string): Promise<TeacherStudentRelation[]> {
  const supabase = createSupabaseBrowserClient()
  
  // Используем RPC функцию для получения данных с именами
  const { data, error } = await supabase
    .rpc('get_student_teachers', {
      student_user_id: studentId
    })
  
  if (error) {
    console.error('Error fetching student teachers:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Преобразуем данные в нужный формат
  const result = data.map((row: GetStudentTeachersReturn) => {
    return {
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      teacher_id: row.teacher_id,
      student_id: row.student_id,
      status: row.status,
      invited_by: row.invited_by,
      invite_message: row.invite_message,
      rejected_reason: row.rejected_reason,
      deleted_at: row.deleted_at,
      teacher_custom_name_for_student: row.teacher_custom_name_for_student,
      student_custom_name_for_teacher: row.student_custom_name_for_teacher,
      teacher_notes: row.teacher_notes,
      student_notes: row.student_notes,
      teacher: row.teacher // teacher уже приходит как JSON объект от базы данных
    }
  })

  return result as TeacherStudentRelation[]
}

// Создать ссылку-приглашение через RPC
export async function createInviteLink(data: {
  createdBy: string
  type: 'teacher' | 'student'
}): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  
  const inviteType = data.type === 'student' ? 'teacher_to_student' : 'student_to_teacher'
  
  const { data: inviteCode, error } = await supabase
    .rpc('create_invite_link', {
      p_invite_type: inviteType,
      p_message: undefined,
      p_expires_in_hours: 24
    })
  
  if (error) {
    console.error('Error creating invite link:', error)
    return null
  }
  
  return inviteCode as string
}

// Проверить приглашение по коду через RPC
export async function getInviteByCode(code: string) {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .rpc('get_invite_info', {
      p_invite_code: code
    })
  
  if (error) {
    console.error('Error fetching invite:', error)
    return { success: false, message: 'Ошибка при проверке приглашения' }
  }
  
  // data - это массив строк из RPC функции
  if (!data || data.length === 0) {
    return { success: false, message: 'Приглашение не найдено или недействительно' }
  }
  
  const inviteInfo = data[0]
  
  if (inviteInfo.is_expired) {
    return { success: false, message: 'Приглашение истекло' }
  }
  
  return { 
    success: true, 
    invite: {
      invite_type: inviteInfo.invite_type,
      creator_name: inviteInfo.creator_name || 'Неизвестный пользователь'
    }
  }
}

// Принять приглашение через RPC
export async function acceptInviteLink(inviteCode: string): Promise<{
  success: boolean
  message: string
  relation?: { id: string }
}> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .rpc('accept_invite_link', {
      p_invite_code: inviteCode
    })
  
  if (error) {
    console.error('Error using invite link:', error)
    return { 
      success: false, 
      message: 'Ошибка при принятии приглашения' 
    }
  }
  
  // data - это массив строк из RPC функции
  if (!data || data.length === 0) {
    return { 
      success: false, 
      message: 'Ошибка при принятии приглашения' 
    }
  }
  
  const result = data[0]
  
  return {
    success: result.success || false,
    message: result.message || 'Неизвестная ошибка'
  }
}

// Удалить связь между преподавателем и студентом
export async function removeTeacherStudentRelation(relationId: string): Promise<{
  success: boolean
  message: string
}> {
  const supabase = createSupabaseBrowserClient()
  
  const { error } = await supabase
    .from('teacher_student_relations')
    .update({ 
      status: 'blocked' as RelationStatus,
      deleted_at: new Date().toISOString()
    })
    .eq('id', relationId)
  
  if (error) {
    console.error('Error removing relation:', error)
    return { 
      success: false, 
      message: 'Ошибка при удалении связи' 
    }
  }
  
  return {
    success: true,
    message: 'Связь успешно удалена'
  }
}

// Обновить пользовательское имя в связи
export async function updateCustomNameInRelation(relationId: string, customName: string, isTeacherUpdating: boolean): Promise<{
  success: boolean
  message: string
}> {
  const supabase = createSupabaseBrowserClient()
  
  const updateField = isTeacherUpdating 
    ? 'teacher_custom_name_for_student' 
    : 'student_custom_name_for_teacher'
  
  // Явно преобразуем пустую строку в null
  const nameValue = customName.trim() === '' ? null : customName.trim()
  
  const { error } = await supabase
    .from('teacher_student_relations')
    .update({ 
      [updateField]: nameValue,
      updated_at: new Date().toISOString()
    })
    .eq('id', relationId)
  
  if (error) {
    console.error('Error updating custom name:', error)
    return { 
      success: false, 
      message: 'Ошибка при обновлении имени' 
    }
  }
  
  return {
    success: true,
    message: nameValue === null ? 'Имя сброшено' : 'Имя успешно обновлено'
  }
}

// Обновить заметку в связи
export async function updateNotesInRelation(relationId: string, notes: string, isTeacherUpdating: boolean): Promise<{
  success: boolean
  message: string
}> {
  const supabase = createSupabaseBrowserClient()
  
  const updateField = isTeacherUpdating 
    ? 'teacher_notes' 
    : 'student_notes'
  
  // Ограничиваем заметку до 500 символов и преобразуем пустую строку в null
  const notesValue = notes.trim() === '' ? null : notes.trim().substring(0, 500)
  
  const { error } = await supabase
    .from('teacher_student_relations')
    .update({ 
      [updateField]: notesValue,
      updated_at: new Date().toISOString()
    })
    .eq('id', relationId)
  
  if (error) {
    console.error('Error updating notes:', error)
    return { 
      success: false, 
      message: 'Ошибка при обновлении заметки' 
    }
  }
  
  return {
    success: true,
    message: notesValue === null ? 'Заметка удалена' : 'Заметка успешно сохранена'
  }
}

// =============================
// Lessons (planner)
// =============================

// Тип строки урока из БД
type LessonRow = Database['public']['Tables']['lessons']['Row']

// Получить занятия за период через RPC (учитывает RLS)
export async function getLessonsForPeriod(start: Date, end: Date): Promise<LessonRow[]> {
  const supabase = createSupabaseBrowserClient()

  const { data, error } = await supabase.rpc(
    'get_lessons_for_period',
    {
      p_start: start.toISOString(),
      p_end: end.toISOString()
    }
  )

  if (error) {
    console.error('Error fetching lessons for period:', error)
    return []
  }

  // data может быть любым Json, поэтому дополнительно проверяем что это массив объектов с ожидаемыми ключами
  if (!Array.isArray(data)) return []
  return data as LessonRow[]
}

// Создать занятие (owner_id = текущий пользователь, RLS проверит)
export async function createLesson(input: {
  title: string
  description?: string | null
  start_time: Date | string
  duration_minutes: number
  student_id: string
  // status optional for compatibility; auto-handled by system
  status?: 'scheduled' | 'completed' | 'cancelled' | 'confirmed' | 'in_progress'
  reminder_minutes?: number | null
  is_series_master?: boolean
  parent_series_id?: string | null
  recurrence_rule?: string | null
  room_id?: string | null
  label_color?: string | null
}): Promise<{
  success: boolean
  message: string
  lesson?: LessonRow
}> {
  const supabase = createSupabaseBrowserClient()

  // Узнаем владельца из текущей сессии
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, message: 'Не авторизован' }
  }

  const row = {
    title: input.title,
    description: input.description ?? null,
    start_time: (input.start_time instanceof Date ? input.start_time.toISOString() : input.start_time),
    duration_minutes: input.duration_minutes,
    student_id: input.student_id,
    owner_id: user.id,
    status: input.status ?? 'scheduled',
    reminder_minutes: input.reminder_minutes ?? 30,
    is_series_master: input.is_series_master ?? false,
    parent_series_id: input.parent_series_id ?? null,
    recurrence_rule: input.recurrence_rule ?? null,
    room_id: input.room_id ?? null,
    label_color: input.label_color ?? null
  }

  const { data, error } = await supabase
    .from('lessons')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating lesson:', error)
    return { success: false, message: 'Ошибка при создании занятия' }
  }

  return { success: true, message: 'Занятие создано', lesson: data as LessonRow }
}
