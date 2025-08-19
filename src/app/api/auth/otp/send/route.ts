import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import nodemailer from 'nodemailer'
import { createHash } from 'crypto'
import { buildOtpEmail } from '@/lib/email-templates'

// Simple in-memory rate limiting; replace with Redis in production
const RATE: Record<string, { windowStart: number; count: number }> = {}
const WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_REQUESTS = 5

function hash(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendMail(email: string, code: string, variant: 'login' | 'signup') {
  if (!process.env.EMAIL_SERVER_HOST) throw new Error('EMAIL_SERVER_HOST not set')
  const port = Number(process.env.EMAIL_SERVER_PORT || 587)
  
  // Логи только в dev режиме
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    console.log('=== EMAIL DEBUG ===')
    console.log('Host:', process.env.EMAIL_SERVER_HOST)
    console.log('Port:', port)
    console.log('User:', process.env.EMAIL_SERVER_USER)
    console.log('To:', email)
    console.log('Code:', code)
  }
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: port,
    secure: port === 465, // true для 465, false для других портов
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    // Логи только в dev
    debug: isDev,
    logger: isDev
  })
  
  // Проверяем соединение
  await transporter.verify()
  if (isDev) console.log('SMTP connection verified')
  
  const from = process.env.EMAIL_FROM || 'no-reply@izuchator.ru'
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@izuchator.ru>`
  const template = buildOtpEmail({ code, variant })
  
  const result = await transporter.sendMail({
    to: email,
    from,
    envelope: { from: (from.match(/<(.+)>/)?.[1]) || from, to: email }, // гарантируем MAIL FROM = no-reply@izuchator.ru
    replyTo: from,
    subject: template.subject,
    html: template.html,
    text: template.text,
    messageId,
    headers: {
      'List-Unsubscribe': '<mailto:no-reply@izuchator.ru?subject=unsubscribe>',
      'X-Entity-Ref-ID': Date.now().toString(),
      'X-Transactional': 'true'
    },
  })
  
  if (isDev) {
    console.log('Email sent successfully:', result.messageId || 'unknown')
    console.log('Response:', result.response || 'unknown')
  console.log('Envelope used:', result.envelope)
  console.log('Accepted:', result.accepted, 'Rejected:', result.rejected)
  }
}

export async function POST(req: NextRequest) {
  try {
  const { email, name, role, isSignUp } = await req.json()
    if (typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    const normEmail = email.toLowerCase().trim()
    if (!/^.+@.+\..+$/.test(normEmail)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Rate limiting
    const now = Date.now()
    const bucket = RATE[normEmail] || { windowStart: now, count: 0 }
    if (now - bucket.windowStart > WINDOW_MS) {
      bucket.windowStart = now
      bucket.count = 0
    }
    bucket.count += 1
    RATE[normEmail] = bucket
    if (bucket.count > MAX_REQUESTS) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Generate code
    const code = generateCode()
    const hashed = hash(code)
    const expires = new Date(Date.now() + 10 * 60 * 1000)

    // Replace existing tokens
    await db.verificationToken.deleteMany({ where: { identifier: normEmail } })
    await db.verificationToken.create({ data: { identifier: normEmail, token: hashed, expires } })

    // Pre-create user if missing (with optional metadata)
    let user = await db.user.findUnique({ where: { email: normEmail } })
    if (!user) {
      user = await db.user.create({
        data: {
          email: normEmail,
          name: typeof name === 'string' && name.trim() ? name.trim() : null,
          role: role === 'teacher' ? 'TEACHER' : 'STUDENT',
        },
      })
    }

  await sendMail(normEmail, code, isSignUp ? 'signup' : 'login')
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('OTP send error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
