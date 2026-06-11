'use client'
import { useState, useEffect } from 'react'

import { useRouter } from 'next/navigation'

export default function DashboardPage() {

  const [todos, setTodos]         = useState([])
  const [input, setInput]         = useState('')
  const [filter, setFilter]       = useState('all')
  const [editingId, setEditingId] = useState(null)

  const [editText, setEditText]   = useState('')

  const [loading, setLoading]     = useState(true)
  const [isAdding, setIsAdding]   = useState(false)
  const [user, setUser]           = useState(null)
  const [subtasks, setSubtasks]         = useState({})
  const [expandedId, setExpandedId]     = useState(null)

  const [subtaskInput, setSubtaskInput] = useState({})

  const router = useRouter()

  function authHeader() {
    const token = localStorage.getItem('token')

    return { 'Authorization': `Bearer ${token}` }
  }

  useEffect(() => {
    const token    = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
    fetchTodos()
  }, [])
  async function fetchTodos() {
    setLoading(true)
    const response = await fetch('/api/todos', {
      headers: authHeader()
    })

    if (response.status === 401) {
      router.push('/login')
      return
    }

    const data = await response.json()

    setTodos(data.todos)

    setLoading(false)
  }

  async function addTodo() {
    if (!input.trim()) return

    setIsAdding(true)
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },

        body: JSON.stringify({ title: input })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.todos && Array.isArray(data.todos)) {
          setTodos(prev => [...data.todos, ...prev])
          if (data.subtasks) {
            setSubtasks(prev => ({
              ...prev,
              ...data.subtasks
            }))
          }
          if (data.todos.length > 0) {
            setExpandedId(data.todos[0].id)
          }
        } else if (data.todo) {
          setTodos(prev => [data.todo, ...prev])
          if (data.subtasks) {
            setSubtasks(prev => ({
              ...prev,
              [data.todo.id]: data.subtasks
            }))
            setExpandedId(data.todo.id)
          }
        }
        setInput('')
      }
    } catch (err) {
      console.error('Failed to add todo:', err)
    } finally {
      setIsAdding(false)
    }
  }
  async function toggleTodo(todo) {
    const response = await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },

      body: JSON.stringify({ completed: !todo.completed })
    })

    const data = await response.json()

    if (response.ok) {
      setTodos(prev =>
        prev.map(t => t.id === todo.id ? data.todo : t)
      )
      if (data.subtasks) {
        setSubtasks(prev => ({
          ...prev,
          [todo.id]: data.subtasks
        }))
      }
    }
  }

async function saveEdit(id) {
    if (!editText.trim()) {
      setEditingId(null)
      return
    }

    const response = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ title: editText })
    })

    const data = await response.json()

    if (response.ok) {
      setTodos(prev => prev.map(t => t.id === id ? data.todo : t))

      setEditingId(null)
    }
  }

async function deleteTodo(id) {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'DELETE',
      headers: authHeader()
    })

    if (response.ok) {
      setTodos(prev => prev.filter(t => t.id !== id))

      setSubtasks(prev => {
        const updated = { ...prev }

        delete updated[id]

        return updated
      })

      if (expandedId === id) setExpandedId(null)
    }
  }

function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    router.push('/login')
  }

async function toggleExpand(todoId) {
    if (expandedId === todoId) {
      setExpandedId(null)
      return
    }

    setExpandedId(todoId)

    if (!subtasks[todoId]) {

      const response = await fetch(`/api/todos/${todoId}/subtasks`, {
        headers: authHeader()
      })

      const data = await response.json()

      setSubtasks(prev => ({
        ...prev,

        [todoId]: data.subtasks
      }))
    }
  }

async function addSubtask(todoId) {
    const title = subtaskInput[todoId] || ''

    if (!title.trim()) return

    const response = await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ title })
    })

    const data = await response.json()

    if (response.ok) {
      setSubtasks(prev => ({
        ...prev,
        [todoId]: [...(prev[todoId] || []), data.subtask]
      }))

      setSubtaskInput(prev => ({ ...prev, [todoId]: '' }))

      if (data.todo) {
        setTodos(prev => prev.map(t => t.id === todoId ? data.todo : t))
      }
    }
  }

async function toggleSubtask(todoId, subtask) {
    const response = await fetch(`/api/todos/${todoId}/subtasks/${subtask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ completed: !subtask.completed })
    })

    const data = await response.json()

    if (response.ok) {
      setSubtasks(prev => ({
        ...prev,
        [todoId]: prev[todoId].map(s =>
          s.id === subtask.id ? data.subtask : s
        )
      }))
      if (data.todo) {
        setTodos(prev => prev.map(t => t.id === todoId ? data.todo : t))
      }
    }
  }

async function deleteSubtask(todoId, subtaskId) {
    const response = await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
      headers: authHeader()
    })

    if (response.ok) {
      setSubtasks(prev => ({
        ...prev,
        [todoId]: prev[todoId].filter(s => s.id !== subtaskId)
      }))
      const data = await response.json()
      if (data.todo) {
        setTodos(prev => prev.map(t => t.id === todoId ? data.todo : t))
      }
    }
  }

const visibleTodos = todos
    .filter(t => {
      if (filter === 'active')    return !t.completed
      if (filter === 'completed') return  !!t.completed
      return true
    })
    .sort((a, b) => a.completed - b.completed)

  const pendingCount   = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t =>  !!t.completed).length

return (
    <div style={styles.page}>
      <div style={styles.container}>

<div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Tasks</h1>
            {user && <p style={styles.subtitle}>{user.email}</p>}
          </div>
          <button onClick={logout} style={styles.logoutBtn}>
            Log out
          </button>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statNum}>{pendingCount}</span>
            <span style={styles.statLabel}>pending</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <span style={styles.statNum}>{completedCount}</span>
            <span style={styles.statLabel}>done</span>
          </div>
        </div>

        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder={isAdding ? 'Adding task...' : 'Add a new task...'}
            disabled={isAdding}
            style={{
              ...styles.input,
              opacity: isAdding ? 0.7 : 1,
              cursor: isAdding ? 'not-allowed' : 'text'
            }}
          />
          <button
            onClick={addTodo}
            disabled={isAdding}
            style={{
              ...styles.addBtn,
              opacity: isAdding ? 0.7 : 1,
              cursor: isAdding ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isAdding ? (
              <>
                <svg
                  className="animate-spin"
                  style={{ width: '16px', height: '16px' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="32"
                    strokeDashoffset="12"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{/^\\[aA][iI]\s+/.test(input) ? 'Thinking...' : 'Adding...'}</span>
              </>
            ) : (
              'Add'
            )}
          </button>
        </div>

        <div style={styles.filters}>
          {['all', 'active', 'completed'].map(f => (
            <button
              key={f}

              onClick={() => setFilter(f)}

              style={{
                ...styles.filterBtn,

                backgroundColor: filter === f ? '#2563eb' : 'transparent',

                color: filter === f ? '#fff' : '#888'
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={styles.empty}>Loading your tasks...</p>

        ) : visibleTodos.length === 0 ? (
          <p style={styles.empty}>
            {filter === 'all'       ? 'No tasks yet. Add one above.' : ''}
            {filter === 'active'    ? 'No pending tasks. Well done!' : ''}
            {filter === 'completed' ? 'No completed tasks yet.'      : ''}
          </p>

        ) : (
          <ul style={styles.list}>
            {visibleTodos.map(todo => (
              <li key={todo.id} style={styles.todoBlock}>

                <div style={styles.item}>

                  <input
                    type='checkbox'
                    checked={!!todo.completed}
                    onChange={() => toggleTodo(todo)}
                    style={styles.checkbox}
                  />

                  {editingId === todo.id ? (
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => saveEdit(todo.id)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(todo.id)}
                      autoFocus
                      style={{ ...styles.input, flex: 1, padding: '4px 8px' }}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => {
                        setEditingId(todo.id)
                        setEditText(todo.title)
                      }}
                      style={{
                        ...styles.itemText,
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        color:          todo.completed ? '#aaa' : '#222',
                        fontWeight: '500'
                      }}
                    >
                      {todo.title}
                    </span>
                  )}

                  <button
                    onClick={() => toggleExpand(todo.id)}
                    style={styles.expandBtn}
                    title='Show subtasks'
                  >
                    <span style={{
                      display: 'inline-block',
                      transform: expandedId === todo.id
                        ? 'rotate(90deg)'
                        : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}>
                      ▶
                    </span>
                    {' '}
                    {subtasks[todo.id]
                      ? subtasks[todo.id].length
                      : '·'
                    }
                  </button>

                  <button
                    onClick={() => deleteTodo(todo.id)}
                    onMouseEnter={e => e.target.style.color = '#e53e3e'}
                    onMouseLeave={e => e.target.style.color = '#ccc'}
                    style={styles.deleteBtn}
                    title='Delete task'
                  >
                    ✕
                  </button>
                </div>

                {expandedId === todo.id && (
                  <div style={styles.subtaskSection}>

                    {(subtasks[todo.id] || []).length === 0 ? (
                      <p style={styles.subtaskEmpty}>
                        No subtasks yet — add one below
                      </p>
                    ) : (
                      (subtasks[todo.id] || []).map(sub => (
                        <div key={sub.id} style={styles.subtaskItem}>

                          <input
                            type='checkbox'
                            checked={!!sub.completed}
                            onChange={() => toggleSubtask(todo.id, sub)}
                            style={styles.checkbox}
                          />

                          <span style={{
                            ...styles.subtaskText,
                            textDecoration: sub.completed ? 'line-through' : 'none',
                            color:          sub.completed ? '#bbb' : '#444'
                          }}>
                            {sub.title}
                          </span>

                          <button
                            onClick={() => deleteSubtask(todo.id, sub.id)}
                            onMouseEnter={e => e.target.style.color = '#e53e3e'}
                            onMouseLeave={e => e.target.style.color = '#ddd'}
                            style={styles.deleteBtn}
                            title='Delete subtask'
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}

                    <div style={styles.subtaskInputRow}>
                      <input
                        value={subtaskInput[todo.id] || ''}
                        onChange={e => setSubtaskInput(prev => ({
                          ...prev,
                          [todo.id]: e.target.value
                        }))}
                        onKeyDown={e => e.key === 'Enter' && addSubtask(todo.id)}
                        placeholder='Add a subtask...'
                        style={styles.subtaskInput}
                      />
                      <button
                        onClick={() => addSubtask(todo.id)}
                        style={styles.subtaskAddBtn}
                      >
                        + Add
                      </button>
                    </div>

                  </div>
                )}

              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  )
}

const styles = {

  page: {
    minHeight: '100vh',
    backgroundColor: '#ffffffff',
    fontFamily: 'system-ui, sans-serif',
    padding: '2rem 1rem'
  },

  container: {
    maxWidth: '580px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem'
  },

  title:    { margin: 0, fontSize: '22px', fontWeight: '600', color: '#111' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#999' },

  logoutBtn: {
    background: 'none',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#666'
  },

  stats: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '10px',
    alignItems: 'center'
  },

  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1
  },

  statNum:     { fontSize: '26px', fontWeight: '700', color: '#2563eb' },
  statLabel:   { fontSize: '12px', color: '#999', marginTop: '2px' },
  statDivider: { width: '1px', height: '36px', backgroundColor: '#e8e8e8' },

  inputRow: { display: 'flex', gap: '8px', marginBottom: '1rem' },

  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none'
  },

  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    flexShrink: 0
  },

  filters: { display: 'flex', gap: '6px', marginBottom: '1rem' },

  filterBtn: {
    padding: '6px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '20px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.15s'
  },

  list: { listStyle: 'none', margin: 0, padding: 0 },

  todoBlock: {
    borderBottom: '1px solid #f0f0f0',
    paddingBottom: '4px',
    marginBottom: '2px'
  },

  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0'
  },

  checkbox: {
    width: '17px',
    height: '17px',
    cursor: 'pointer',
    flexShrink: 0
  },

  itemText: {
    flex: 1,
    fontSize: '15px',
    lineHeight: '1.4',
    cursor: 'text'
  },

  expandBtn: {
    background: 'none',
    border: '1px solid #e8e8e8',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#aaa',
    flexShrink: 0,
    minWidth: '36px',
    textAlign: 'center'
  },

  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 6px',
    flexShrink: 0
  },

  subtaskSection: {
    marginLeft: '27px',
    paddingLeft: '14px',
    borderLeft: '2px solid #e8e8e8',
    marginBottom: '8px',
    paddingBottom: '4px'
  },

  subtaskEmpty: {
    fontSize: '13px',
    color: '#bbb',
    margin: '6px 0',
    fontStyle: 'italic'
  },

  subtaskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '5px 0',
    borderBottom: '1px solid #f8f8f8'
  },

  subtaskText: {
    flex: 1,
    fontSize: '14px',
    lineHeight: '1.4'
  },

  subtaskInputRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
    paddingTop: '6px'
  },

  subtaskInput: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid #e8e8e8',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#010101'
  },

  subtaskAddBtn: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    flexShrink: 0
  },

  empty: {
    textAlign: 'center',
    color: '#bbb',
    padding: '2.5rem 0',
    fontSize: '15px'
  }
}