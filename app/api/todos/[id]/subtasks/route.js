import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { verifyToken } from '@/lib/auth'

function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return verifyToken(authHeader.split(' ')[1])
}
export async function GET(request, { params }) {
  const userData = getUserFromRequest(request)
  if (!userData) {
    return NextResponse.json({ error: 'Please log in' }, { status: 401 })
  }

  const { id } = await params
  const todoId = Number.parseInt(id, 10)

  if (Number.isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo id' }, { status: 400 })
  }

  const todo = db
    .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(todoId, userData.userId)

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
  }

  const subtasks = db
    .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY created_at ASC')
    .all(todoId)

  return NextResponse.json({ subtasks })
}

export async function POST(request, { params }) {
  const userData = getUserFromRequest(request)
  if (!userData) {
    return NextResponse.json({ error: 'Please log in' }, { status: 401 })
  }

  const { id } = await params
  const todoId = Number.parseInt(id, 10)

  if (Number.isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo id' }, { status: 400 })
  }

  const { title } = await request.json()

  if (!title || title.trim() === '') {
    return NextResponse.json({ error: 'Subtask title cannot be empty' }, { status: 400 })
  }
  const todo = db
    .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(todoId, userData.userId)

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
  }

  const result = db
    .prepare('INSERT INTO subtasks (todo_id, title) VALUES (?, ?)')
    .run(todoId, title.trim())

  db.prepare('UPDATE todos SET completed = 0 WHERE id = ?').run(todoId)

  const newSubtask = db
    .prepare('SELECT * FROM subtasks WHERE id = ?')
    .get(result.lastInsertRowid)

  const updatedTodo = db
    .prepare('SELECT * FROM todos WHERE id = ?')
    .get(todoId)

  return NextResponse.json({ subtask: newSubtask, todo: updatedTodo }, { status: 201 })
}