import NextAuth from "next-auth"
import PgAdapter from "@auth/pg-adapter"
import { Pool } from "pg"
import Credentials from "next-auth/providers/credentials"
import { db } from "./database"
import { createHash } from "crypto"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PgAdapter(pool),
  providers: [
    Credentials({
      id: 'otp',
      name: 'One-Time Code',
      credentials: {
        email: { label: 'Email', type: 'text' },
        code: { label: 'Code', type: 'text' },
      },
      // Проверка OTP кода
      async authorize(creds) {
        if (!creds?.email || !creds?.code) return null
        const email = String(creds.email).toLowerCase().trim()
        const code = String(creds.code).trim()
        if (code.length !== 6) return null

        const hashed = createHash('sha256').update(code).digest('hex')

        // Ищем токен
        const token = await db.verificationToken.findFirst({
          where: { identifier: email, token: hashed },
        })
        if (!token) return null
        if (token.expires < new Date()) {
          // Удаляем просроченный
            await db.verificationToken.deleteMany({ where: { identifier: email } })
            return null
        }

        // Одноразовое использование - удаляем все токены для email
        await db.verificationToken.deleteMany({ where: { identifier: email } })

        // На этапе запроса кода мы могли упаковать желаемую роль и имя в identifier через спец. приставку
        // Но проще: роль/имя передаются отдельно в /api/auth/otp/send и создаётся временная запись? Мы создаём пользователя здесь если он отсутствует.
        let user = await db.user.findUnique({ where: { email } })
        if (!user) {
          // Попытаемся найти временно сохранённые метаданные в отдельной таблице – отсутствует. Поэтому используем дефолты.
          user = await db.user.create({
            data: {
              email,
              role: 'STUDENT',
            },
          })
        }
        return { id: user.id, email: user.email, name: user.name ?? null, role: user.role }
      },
    }),
  ],
  // Используем JWT стратегию для мгновенного обновления сессии без перезагрузки страницы
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Первичный вход: переносим id/role в токен
        token.id = user.id
  token.role = (user as any).role || 'STUDENT'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
  ;(session.user as any).role = (token as any).role || 'STUDENT'
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
})
