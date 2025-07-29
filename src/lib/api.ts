// Простые API функции для работы с профилями и связями
import { createSupabaseBrowserClient } from './supabase'
import type { Database } from './types/database.generated'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type TeacherStudentRelation = Database['public']['Tables']['teacher_student_relations']['Row']

// Получить профиль пользователя
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle() // Используем maybeSingle вместо single для обработки случая отсутствия записи
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data
}

// Убедиться, что профиль пользователя существует
export async function ensureUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createSupabaseBrowserClient()
  
  // Сначала пытаемся получить существующий профиль
  const existingProfile = await getUserProfile(userId)
  if (existingProfile) {
    return existingProfile
  }

  // Если профиль не существует, получаем данные пользователя из auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    console.error('User not authenticated or ID mismatch')
    return null
  }

  // Создаем новый профиль
  const userName = user.user_metadata?.full_name || 
                  user.email?.split('@')[0] || 
                  'Пользователь'
  
  return await createUserProfile({
    id: userId,
    full_name: userName,
    role: 'teacher' // По умолчанию роль преподавателя
  })
}

// Создать профиль пользователя (при первом входе)
export async function createUserProfile(profile: {
  id: string
  full_name: string
  role: 'teacher' | 'student'
}): Promise<UserProfile | null> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert(profile)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating user profile:', error)
    return null
  }
  
  return data
}

// Получить связи преподавателя со студентами
export async function getTeacherStudents(teacherId: string): Promise<TeacherStudentRelation[]> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('teacher_student_relations')
    .select(`
      *,
      student:user_profiles!student_id(*)
    `)
    .eq('teacher_id', teacherId)
    .eq('status', 'active')
    .is('deleted_at', null)
  
  if (error) {
    console.error('Error fetching teacher students:', error)
    return []
  }
  
  return data || []
}

// Получить связи студента с преподавателями
export async function getStudentTeachers(studentId: string): Promise<TeacherStudentRelation[]> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('teacher_student_relations')
    .select(`
      *,
      teacher:user_profiles!teacher_id(*)
    `)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .is('deleted_at', null)
  
  if (error) {
    console.error('Error fetching student teachers:', error)
    return []
  }
  
  return data || []
}

// Создать ссылку-приглашение через RPC
export async function createInviteLink(data: {
  createdBy: string
  type: 'teacher' | 'student'
}): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  
  // Убеждаемся, что профиль пользователя существует
  const userProfile = await ensureUserProfile(data.createdBy)
  if (!userProfile) {
    console.error('Failed to ensure user profile exists')
    return null
  }
  
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
      status: 'inactive',
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
