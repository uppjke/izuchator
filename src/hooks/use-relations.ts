'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getTeacherStudents, 
  getStudentTeachers, 
  removeTeacherStudentRelation,
  updateCustomNameInRelation,
  updateNotesInRelation
} from '@/lib/api'
import { toast } from 'sonner'

// Используем типы из существующего API
type StudentRelation = Awaited<ReturnType<typeof getTeacherStudents>>[0]
type TeacherRelation = Awaited<ReturnType<typeof getStudentTeachers>>[0]

// Ключи для запросов
export const relationKeys = {
  all: ['relations'] as const,
  teacherStudents: (teacherId: string) => [...relationKeys.all, 'teacher-students', teacherId] as const,
  studentTeachers: (studentId: string) => [...relationKeys.all, 'student-teachers', studentId] as const,
}

// Хук для получения учеников преподавателя
export function useTeacherStudents(teacherId: string | undefined) {
  return useQuery({
    queryKey: relationKeys.teacherStudents(teacherId || ''),
    queryFn: () => getTeacherStudents(teacherId!),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000, // 5 минут
  })
}

// Хук для получения учителей ученика
export function useStudentTeachers(studentId: string | undefined) {
  return useQuery({
    queryKey: relationKeys.studentTeachers(studentId || ''),
    queryFn: () => getStudentTeachers(studentId!),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 минут
  })
}

// Хук для удаления связи
export function useRemoveRelation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeTeacherStudentRelation,
    onSuccess: (result) => {
      if (result.success) {
        // Инвалидируем все запросы связей для обновления
        queryClient.invalidateQueries({ queryKey: relationKeys.all })
        toast.success('Связь успешно удалена')
      } else {
        toast.error(result.message)
      }
    },
    onError: () => {
      toast.error('Ошибка при удалении связи')
    }
  })
}

// Хук для обновления имени
export function useUpdateCustomName() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ relationId, customName, isTeacherUpdating }: {
      relationId: string
      customName: string
      isTeacherUpdating: boolean
    }) => updateCustomNameInRelation(relationId, customName, isTeacherUpdating),
    onSuccess: (result) => {
      if (result.success) {
        // Инвалидируем все запросы связей для обновления
        queryClient.invalidateQueries({ queryKey: relationKeys.all })
        toast.success('Имя успешно обновлено')
      } else {
        toast.error(result.message)
      }
    },
    onError: () => {
      toast.error('Ошибка при обновлении имени')
    }
  })
}

// Хук для обновления заметок
export function useUpdateNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ relationId, notes, isTeacherUpdating }: {
      relationId: string
      notes: string
      isTeacherUpdating: boolean
    }) => updateNotesInRelation(relationId, notes, isTeacherUpdating),
    onSuccess: (result) => {
      if (result.success) {
        // Инвалидируем все запросы связей для обновления
        queryClient.invalidateQueries({ queryKey: relationKeys.all })
        toast.success('Заметка сохранена')
      } else {
        toast.error(result.message)
      }
    },
    onError: () => {
      toast.error('Ошибка при сохранении заметки')
    }
  })
}

// Экспортируем типы для использования в компонентах
export type { StudentRelation, TeacherRelation }
