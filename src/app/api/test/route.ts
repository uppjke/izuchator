import { NextRequest, NextResponse } from 'next/server'
import { getTeacherStudents, getStudentTeachers, getLessons } from '@/lib/api'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    switch (type) {
      case 'teacher-students':
        const students = await getTeacherStudents()
        return NextResponse.json({ students })

      case 'student-teachers':
        const teachers = await getStudentTeachers()
        return NextResponse.json({ teachers })

      case 'lessons':
        const lessons = await getLessons()
        return NextResponse.json({ lessons })

      default:
        return NextResponse.json({ 
          user: session.user,
          available_endpoints: [
            '?type=teacher-students',
            '?type=student-teachers', 
            '?type=lessons'
          ]
        })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
