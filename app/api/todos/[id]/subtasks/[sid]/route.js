import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { verifyToken } from '@/lib/auth'

function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return verifyToken(authHeader.split(' ')[1])
}
export async function PATCH(request, { params }) {
  const userData = getUserFromRequest(request)
  if (!userData) {
    return NextResponse.json({ error: 'Please log in' }, { status: 401 })
  }

  const { id, sid } = await params
  const todoId = Number.parseInt(id, 10)
  const subtaskId = Number.parseInt(sid, 10)

  if (Number.isNaN(todoId) || Number.isNaN(subtaskId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const { completed, title } = await request.json()
  const todo = db
    .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(todoId, userData.userId)

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
  }
  const subtask = db
    .prepare('SELECT * FROM subtasks WHERE id = ? AND todo_id = ?')
    .get(subtaskId, todoId)

  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
  }

  db.prepare(`
    UPDATE subtasks
    SET
      completed = COALESCE(?, completed),
      title     = COALESCE(?, title)
    WHERE id = ? AND todo_id = ?
  `).run(
    completed !== undefined ? (completed ? 1 : 0) : null,
    title || null,
    subtaskId,
    todoId
  )

  const allSubtasks = db
    .prepare('SELECT completed FROM subtasks WHERE todo_id = ?')
    .all(todoId)

  if (allSubtasks.length > 0) {
    const allCompleted = allSubtasks.every(sub => sub.completed === 1)
    db.prepare('UPDATE todos SET completed = ? WHERE id = ?').run(
      allCompleted ? 1 : 0,
      todoId
    )
  }

  const updated = db
    .prepare('SELECT * FROM subtasks WHERE id = ?')
    .get(subtaskId)

  const updatedTodo = db
    .prepare('SELECT * FROM todos WHERE id = ?')
    .get(todoId)

  return NextResponse.json({ subtask: updated, todo: updatedTodo })
}
export async function DELETE(request, { params }) {
  const userData = getUserFromRequest(request)
  if (!userData) {
    return NextResponse.json({ error: 'Please log in' }, { status: 401 })
  }

  const { id, sid } = await params
  const todoId = Number.parseInt(id, 10)
  const subtaskId = Number.parseInt(sid, 10)

  if (Number.isNaN(todoId) || Number.isNaN(subtaskId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const todo = db
    .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(todoId, userData.userId)

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
  }

  const subtask = db
    .prepare('SELECT * FROM subtasks WHERE id = ? AND todo_id = ?')
    .get(subtaskId, todoId)

  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
  }

  db.prepare('DELETE FROM subtasks WHERE id = ? AND todo_id = ?')
    .run(subtaskId, todoId)

  const remainingSubtasks = db
    .prepare('SELECT completed FROM subtasks WHERE todo_id = ?')
    .all(todoId)

  if (remainingSubtasks.length > 0) {
    const allCompleted = remainingSubtasks.every(sub => sub.completed === 1)
    db.prepare('UPDATE todos SET completed = ? WHERE id = ?').run(
      allCompleted ? 1 : 0,
      todoId
    )
  }

  const updatedTodo = db
    .prepare('SELECT * FROM todos WHERE id = ?')
    .get(todoId)

  return NextResponse.json({ message: 'Subtask deleted', todo: updatedTodo })
}