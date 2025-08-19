import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'

const db = new PrismaClient()

interface SupabaseUser {
  id: string
  email: string
  name: string | null
  role: string | null
  created_at: string
}

interface SupabaseRelation {
  id: string
  created_at: string
  updated_at: string
  teacher_id: string
  student_id: string
  status: string
  invited_by: string
  invite_message: string | null
  rejected_reason: string | null
  deleted_at: string | null
  teacher_custom_name_for_student: string | null
  student_custom_name_for_teacher: string | null
  teacher_notes: string | null
  student_notes: string | null
}

interface SupabaseLesson {
  id: string
  created_at: string
  updated_at: string
  owner_id: string
  student_id: string | null
  title: string
  description: string | null
  start_time: string
  duration_minutes: number | null
  room_id: string | null
  recurrence_rule: string | null
  parent_series_id: string | null
  is_series_master: boolean | null
  reminder_minutes: number | null
  price: string | null
  status: string | null
  deleted_at: string | null
  label_color: string | null
}

async function readCSV<T>(filename: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = []
    const filePath = path.join(process.cwd(), 'migration', filename)
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

async function migrateUsers() {
  console.log('Migrating users...')
  const users = await readCSV<SupabaseUser>('users.csv')
  
  for (const user of users) {
    try {
      await db.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          role: user.role?.toUpperCase() as 'STUDENT' | 'TEACHER' || 'STUDENT',
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.created_at),
        },
      })
      console.log(`✓ User ${user.email} migrated`)
    } catch (error) {
      console.error(`✗ Error migrating user ${user.email}:`, error)
    }
  }
}

async function migrateRelations() {
  console.log('Migrating relations...')
  const relations = await readCSV<SupabaseRelation>('relations.csv')
  
  for (const relation of relations) {
    try {
      await db.teacherStudentRelation.create({
        data: {
          id: relation.id,
          teacherId: relation.teacher_id,
          studentId: relation.student_id,
          status: relation.status.toUpperCase() as 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED',
          teacherName: relation.teacher_custom_name_for_student,
          studentName: relation.student_custom_name_for_teacher,
          teacherNotes: relation.teacher_notes,
          studentNotes: relation.student_notes,
          createdAt: new Date(relation.created_at),
          updatedAt: new Date(relation.updated_at),
          deletedAt: relation.deleted_at ? new Date(relation.deleted_at) : null,
        },
      })
      console.log(`✓ Relation ${relation.id} migrated`)
    } catch (error) {
      console.error(`✗ Error migrating relation ${relation.id}:`, error)
    }
  }
}

async function migrateLessons() {
  console.log('Migrating lessons...')
  const lessons = await readCSV<SupabaseLesson>('lessons.csv')
  
  for (const lesson of lessons) {
    try {
      // Находим связь между учителем и студентом для получения relationId
  let relationId: string | null = null
      if (lesson.student_id) {
        const relation = await db.teacherStudentRelation.findFirst({
          where: {
            teacherId: lesson.owner_id,
            studentId: lesson.student_id,
          },
        })
        relationId = relation?.id || null
      }

      // Вычисляем endTime на основе startTime и duration
      const startTime = new Date(lesson.start_time)
      const endTime = new Date(startTime.getTime() + (lesson.duration_minutes || 60) * 60 * 1000)

      await db.lesson.create({
        data: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          startTime: startTime,
          endTime: endTime,
          userId: lesson.owner_id,
          relationId: relationId,
          isRecurring: lesson.recurrence_rule ? true : false,
          recurrence: lesson.recurrence_rule ? JSON.parse(lesson.recurrence_rule) : null,
          labelColor: lesson.label_color,
          createdAt: new Date(lesson.created_at),
          updatedAt: new Date(lesson.updated_at),
        },
      })
      console.log(`✓ Lesson ${lesson.title} migrated`)
    } catch (error) {
      console.error(`✗ Error migrating lesson ${lesson.id}:`, error)
    }
  }
}

async function main() {
  try {
    console.log('Starting migration...')
    
    await migrateUsers()
    await migrateRelations()
    await migrateLessons()
    
    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await db.$disconnect()
  }
}

main()
