import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'
import { createToken } from '@/lib/auth'

export async function POST(request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }
  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email)

  if (!user) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }
  const passwordMatch = await bcrypt.compare(password, user.password)

  if (!passwordMatch) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }
  const token = createToken(user.id)
  return NextResponse.json({
    message: 'Login successful',
    token,
    user: { id: user.id, email: user.email }
  })
}