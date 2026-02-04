/**
 * Zod схемы валидации для API endpoints
 * Используется для строгой типизации и валидации входящих данных
 */

import { z } from 'zod'

// ===== Общие схемы =====

export const emailSchema = z
  .string()
  .email('Некорректный формат email')
  .min(5, 'Email слишком короткий')
  .max(255, 'Email слишком длинный')
  .transform((email) => email.toLowerCase().trim())

export const idSchema = z
  .string()
  .min(1, 'ID обязателен')
  .max(100, 'ID слишком длинный')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ===== Auth схемы =====

export const otpSendSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['STUDENT', 'TEACHER']).optional(),
})

export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .length(6, 'Код должен содержать 6 цифр')
    .regex(/^\d{6}$/, 'Код должен содержать только цифры'),
})

// ===== Lesson схемы =====

export const createLessonSchema = z.object({
  title: z
    .string()
    .min(1, 'Название урока обязательно')
    .max(200, 'Название слишком длинное'),
  description: z
    .string()
    .max(2000, 'Описание слишком длинное')
    .optional()
    .nullable(),
  startTime: z
    .string()
    .datetime('Некорректный формат даты начала')
    .or(z.date()),
  endTime: z
    .string()
    .datetime('Некорректный формат даты окончания')
    .or(z.date()),
  relationId: idSchema.optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurrence: z.record(z.string(), z.unknown()).optional().nullable(),
  labelColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Некорректный формат цвета')
    .optional()
    .nullable(),
})

export const updateLessonSchema = createLessonSchema.partial().extend({
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
})

export const deleteLessonSchema = z.object({
  scope: z.enum(['single', 'weekday', 'all_future_student']).default('single'),
})

export const getLessonsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ===== Relation схемы =====

export const createInviteSchema = z.object({
  type: z.enum(['STUDENT_TO_TEACHER', 'TEACHER_TO_STUDENT']),
  message: z.string().max(500, 'Сообщение слишком длинное').optional(),
  expiresInHours: z.coerce.number().int().min(1).max(720).default(24), // max 30 дней
})

export const acceptInviteSchema = z.object({
  code: z
    .string()
    .min(6, 'Код приглашения слишком короткий')
    .max(50, 'Код приглашения слишком длинный'),
})

export const updateRelationSchema = z.object({
  customName: z.string().max(100, 'Имя слишком длинное').optional(),
  notes: z.string().max(2000, 'Заметка слишком длинная').optional(),
  isTeacherUpdating: z.boolean(),
})

// ===== File схемы =====

export const uploadFileSchema = z.object({
  relationId: idSchema.optional().nullable(),
  isPublic: z.boolean().default(false),
})

export const fileTypeSchema = z.enum([
  'DOCUMENT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'ARCHIVE',
  'OTHER',
])

export const fileQuerySchema = z.object({
  relationId: idSchema.optional().nullable(),
  type: fileTypeSchema.optional().nullable(),
})

// ===== Валидация помощники =====

/**
 * Валидирует данные и возвращает результат или ошибку
 */
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      success: false,
      error: firstError?.message || 'Ошибка валидации',
    }
  }
  
  return { success: true, data: result.data }
}

/**
 * Создает ответ с ошибкой валидации
 */
export function validationErrorResponse(error: string, status = 400) {
  return Response.json(
    { error, code: 'VALIDATION_ERROR' },
    { status }
  )
}

// Типы для экспорта
export type OtpSendInput = z.infer<typeof otpSendSchema>
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>
export type CreateLessonInput = z.infer<typeof createLessonSchema>
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>
export type CreateInviteInput = z.infer<typeof createInviteSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
export type UpdateRelationInput = z.infer<typeof updateRelationSchema>
