// Простые API функции для работы с профилями и связями
import { createSupabaseBrowserClient } from './supabase'
import type { UserProfile, CreateInviteLink, TeacherStudentRelation } from './types/database.generated'

// Получить профиль пользователя
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data
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

// Создать ссылку-приглашение
export async function createInviteLink(params: {
  invite_type: 'teacher_to_student' | 'student_to_teacher'
  message?: string
  expires_in_hours?: number
}): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  
  // Получаем текущего пользователя
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Генерируем код приглашения
  const { data: codeData, error: codeError } = await supabase.rpc('generate_invite_code')
  if (codeError) {
    console.error('Error generating invite code:', codeError)
    return null
  }
  
  const invite_code = codeData as string
  
  // Создаем приглашение
  const inviteData: CreateInviteLink = {
    created_by: user.id,
    invite_code,
    invite_type: params.invite_type,
    message: params.message,
    expires_at: params.expires_in_hours 
      ? new Date(Date.now() + params.expires_in_hours * 60 * 60 * 1000).toISOString()
      : null,
    max_uses: 1,
    used_count: 0,
    is_active: true
  }
  
  const { error } = await supabase
    .from('invite_links')
    .insert(inviteData)
  
  if (error) {
    console.error('Error creating invite link:', error)
    return null
  }
  
  return invite_code
}

// Использовать приглашение
export async function useInviteLink(inviteCode: string): Promise<{
  success: boolean
  message: string
  relation?: TeacherStudentRelation
}> {
  const supabase = createSupabaseBrowserClient()
  
  // Получаем текущего пользователя
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Необходимо войти в систему' }
  }
  
  // Получаем приглашение
  const { data: invite, error: inviteError } = await supabase
    .from('invite_links')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('is_active', true)
    .single()
  
  if (inviteError || !invite) {
    return { success: false, message: 'Приглашение не найдено или неактивно' }
  }
  
  // Проверяем срок действия
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { success: false, message: 'Срок действия приглашения истек' }
  }
  
  // Проверяем лимит использований
  if ((invite.used_count || 0) >= (invite.max_uses || 1)) {
    return { success: false, message: 'Приглашение исчерпано' }
  }
  
  // Получаем профили создателя и пользователя
  const [creatorProfile, userProfile] = await Promise.all([
    getUserProfile(invite.created_by),
    getUserProfile(user.id)
  ])
  
  if (!creatorProfile || !userProfile) {
    return { success: false, message: 'Ошибка получения профилей' }
  }
  
  // Определяем роли
  let teacherId: string, studentId: string
  
  if (invite.invite_type === 'teacher_to_student') {
    // Преподаватель приглашает ученика
    if (creatorProfile.role !== 'teacher') {
      return { success: false, message: 'Приглашение может создать только преподаватель' }
    }
    if (userProfile.role !== 'student') {
      return { success: false, message: 'Приглашение предназначено для ученика' }
    }
    teacherId = invite.created_by
    studentId = user.id
  } else {
    // Ученик приглашает преподавателя
    if (creatorProfile.role !== 'student') {
      return { success: false, message: 'Приглашение может создать только ученик' }
    }
    if (userProfile.role !== 'teacher') {
      return { success: false, message: 'Приглашение предназначено для преподавателя' }
    }
    teacherId = user.id
    studentId = invite.created_by
  }
  
  // Проверяем, что связи еще нет
  const { data: existingRelation } = await supabase
    .from('teacher_student_relations')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .single()
  
  if (existingRelation) {
    return { success: false, message: 'Связь уже существует' }
  }
  
  // Создаем связь
  const { data: relation, error: relationError } = await supabase
    .from('teacher_student_relations')
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      status: 'active',
      invited_by: invite.created_by,
      invite_message: invite.message
    })
    .select()
    .single()
  
  if (relationError) {
    console.error('Error creating relation:', relationError)
    return { success: false, message: 'Ошибка создания связи' }
  }
  
  // Обновляем счетчик использований
  await supabase
    .from('invite_links')
    .update({ used_count: (invite.used_count || 0) + 1 })
    .eq('id', invite.id)
  
  // Записываем использование
  await supabase
    .from('invite_uses')
    .insert({
      invite_link_id: invite.id,
      used_by: user.id,
      result: 'success'
    })
  
  return { 
    success: true, 
    message: 'Связь успешно создана!',
    relation 
  }
}
