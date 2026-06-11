import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { verifyToken } from '@/lib/auth'

function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  return verifyToken(token)
}

export async function GET(request) {
  const userData = getUserFromRequest(request)
  if (!userData) {
    return NextResponse.json(
      { error: 'Please log in' },
      { status: 401 }
    )
  }
  const todos = db
    .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC')
    .all(userData.userId)

  return NextResponse.json({ todos })
}
export async function POST(request) {
  const userData = getUserFromRequest(request)

  if (!userData) {
    return NextResponse.json(
      { error: 'Please log in' },
      { status: 401 }
    )
  }

  const { title } = await request.json()

  if (!title || title.trim() === '') {
    return NextResponse.json(
      { error: 'Todo title cannot be empty' },
      { status: 400 }
    )
  }

  const trimmedTitle = title.trim()
  const isAiRequest = /^\\[aA][iI]\s+/.test(trimmedTitle)

  if (isAiRequest) {
    const prompt = trimmedTitle.replace(/^\\[aA][iI]\s+/, '').trim()
    if (prompt === '') {
      return NextResponse.json(
        { error: 'AI prompt cannot be empty' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured in .env.local' },
        { status: 500 }
      )
    }

    try {
      let response;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Generate one or more tasks based on the prompt: "${prompt}". For each task, provide a concise, clean main todo title and a list of 3-7 actionable subtasks.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'OBJECT',
                  properties: {
                    tasks: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          title: { type: 'STRING' },
                          subtasks: {
                            type: 'ARRAY',
                            items: { type: 'STRING' },
                          },
                        },
                        required: ['title', 'subtasks'],
                      },
                    },
                  },
                  required: ['tasks'],
                },
              },
            }),
          }
        )

        if (response.ok) {
          break
        }

        if (response.status === 503 || response.status === 429) {
          attempts++
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, attempts * 1000))
            continue
          }
        }
        break
      }

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          { error: `Gemini API error: ${errorText}` },
          { status: response.status }
        )
      }

      const data = await response.json()
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResult) {
        return NextResponse.json(
          { error: 'No content returned from Gemini' },
          { status: 500 }
        )
      }

      const generated = JSON.parse(textResult)
      const tasks = generated.tasks || []

      const createdTodos = []
      const subtasksMap = {}

      const stmtTodo = db.prepare(
        'INSERT INTO todos (user_id, title) VALUES (?, ?)'
      )
      const stmtSubtask = db.prepare(
        'INSERT INTO subtasks (todo_id, title) VALUES (?, ?)'
      )

      for (const task of tasks) {
        const mainTitle = task.title || prompt
        const subtaskTitles = task.subtasks || []

        const resultTodo = stmtTodo.run(userData.userId, mainTitle.trim())
        const newTodo = db
          .prepare('SELECT * FROM todos WHERE id = ?')
          .get(resultTodo.lastInsertRowid)

        createdTodos.push(newTodo)

        const subtaskArray = []
        if (subtaskTitles.length > 0) {
          for (const subTitle of subtaskTitles) {
            if (subTitle && subTitle.trim() !== '') {
              const resultSubtask = stmtSubtask.run(newTodo.id, subTitle.trim())
              const subtask = db
                .prepare('SELECT * FROM subtasks WHERE id = ?')
                .get(resultSubtask.lastInsertRowid)
              subtaskArray.push(subtask)
            }
          }
        }
        subtasksMap[newTodo.id] = subtaskArray
      }

      return NextResponse.json(
        { todos: createdTodos.reverse(), subtasks: subtasksMap },
        { status: 201 }
      )
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to generate AI todo: ${err.message}` },
        { status: 500 }
      )
    }
  }

  const stmt = db.prepare(
    'INSERT INTO todos (user_id, title) VALUES (?, ?)'
  )
  const result = stmt.run(userData.userId, trimmedTitle)
  const newTodo = db
    .prepare('SELECT * FROM todos WHERE id = ?')
    .get(result.lastInsertRowid)

  return NextResponse.json({ todo: newTodo }, { status: 201 })
}