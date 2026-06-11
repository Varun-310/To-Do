import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { verifyToken } from '@/lib/auth'

function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  return verifyToken(token)
}

export async function PATCH(request, { params }) {
  const userData = getUserFromRequest(request)
  if (!userData) {
    return NextResponse.json({ error: 'Please log in' }, { status: 401 })
  }

  const { id } = await params
  const todoId = Number.parseInt(id, 10)

  if (Number.isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo id' }, { status: 400 })
  }

  const { completed, title } = await request.json()
  const todo = db
    .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(todoId, userData.userId)

  if (!todo) {
    return NextResponse.json(
      { error: 'Todo not found' },
      { status: 404 }
    )
  }

  db.prepare(`
    UPDATE todos
    SET
      completed = COALESCE(?, completed),
      title     = COALESCE(?, title)
    WHERE id = ? AND user_id = ?
  `).run(
    completed !== undefined ? (completed ? 1 : 0) : null,
    title || null,
    todoId,
    userData.userId
  )

  if (completed !== undefined) {
    db.prepare('UPDATE subtasks SET completed = ? WHERE todo_id = ?').run(
      completed ? 1 : 0,
      todoId
    )
  }

  const updated = db
    .prepare('SELECT * FROM todos WHERE id = ?')
    .get(todoId)

  const subtasks = db
    .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY created_at ASC')
    .all(todoId)

  return NextResponse.json({ todo: updated, subtasks })
}

export async function DELETE(request, { params }) {
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

  db.prepare('DELETE FROM subtasks WHERE todo_id = ?').run(todoId)

  db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
    .run(todoId, userData.userId)
  return NextResponse.json({ message: 'Deleted successfully' })
}