import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'
export async function POST(request) {

  const { email, password } = await request.json()
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 } 
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    )
  }
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const stmt = db.prepare(
      'INSERT INTO users (email, password) VALUES (?, ?)'
    )
    stmt.run(email, hashedPassword)

    return NextResponse.json(
      { message: 'Account created successfully' },
      { status: 201 }
    )

  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 } 
      )
    }

    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}