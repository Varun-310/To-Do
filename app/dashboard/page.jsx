'use client'
// 'use client' MUST be the very first line.
// It tells Next.js: "this file runs in the browser, not the server."
// You need this because we use useState, useEffect, and localStorage —
// all of which are browser-only features.

import { useState, useEffect } from 'react'
// useState  — stores values that, when changed, make the page re-render
// useEffect — runs a function at a specific moment (e.g. when page loads)

import { useRouter } from 'next/navigation'
// useRouter — lets you navigate to other pages in code (not just clicking links)

export default function DashboardPage() {
  // ─────────────────────────────────────────────────────────────
  // STATE VARIABLES
  // Each line creates two things:
  //   [value, setter] = useState(initialValue)
  // value  = the current data
  // setter = the function you call to update it
  // Calling the setter triggers a re-render of the component
  // ─────────────────────────────────────────────────────────────

  const [todos, setTodos]         = useState([])
  // todos = array of todo objects from the database
  // e.g. [{ id: 1, title: 'Buy milk', completed: 0, user_id: 1 }, ...]
  // starts as empty array — filled after the first API call

  const [input, setInput]         = useState('')
  // input = the text the user is currently typing in the "Add task" field
  // starts as empty string

  const [filter, setFilter]       = useState('all')
  // filter = which todos to show: 'all', 'active', or 'completed'
  // starts as 'all' — show everything

  const [editingId, setEditingId] = useState(null)
  // editingId = the id of the todo whose title is being edited right now
  // null means nothing is being edited
  // When user double-clicks a todo title, we set this to that todo's id
  // When editing is done (Enter / click away), we set this back to null

  const [editText, setEditText]   = useState('')
  // editText = the text inside the edit input while editing a todo title
  // starts as empty — filled when editing starts

  const [loading, setLoading]     = useState(true)
  const [isAdding, setIsAdding]   = useState(false)
  // loading = true while waiting for the first API response
  // We show "Loading..." to the user instead of an empty list
  // Set to false after todos are fetched

  const [user, setUser]           = useState(null)
  // user = the logged-in user's info (id and email)
  // null until we read it from localStorage on page load
  // Used to show the user's email in the header

  // ── Subtask state variables ──────────────────────────────────

  const [subtasks, setSubtasks]         = useState({})
  // subtasks = an object where:
  //   key   = todo id (a number like 1, 2, 3)
  //   value = array of subtask objects for that todo
  // Example:
  // {
  //   1: [{ id: 1, todo_id: 1, title: 'Buy eggs', completed: 0 }, ...],
  //   3: [{ id: 5, todo_id: 3, title: 'Call plumber', completed: 1 }]
  // }
  // We only fetch subtasks when the user expands a todo (lazy loading)

  const [expandedId, setExpandedId]     = useState(null)
  // expandedId = the id of the todo that is currently expanded
  // (showing its subtasks below it)
  // null means no todo is expanded
  // Only one todo can be expanded at a time

  const [subtaskInput, setSubtaskInput] = useState({})
  // subtaskInput = an object where:
  //   key   = todo id
  //   value = the text being typed in that todo's "Add subtask" field
  // We need separate input per todo because multiple todos exist on screen
  // Example: { 1: 'Pick up eggs', 3: '' }

  const router = useRouter()
  // router.push('/path') navigates to a different page


  // ─────────────────────────────────────────────────────────────
  // HELPER: authHeader
  // Every API call to a protected route needs to prove who we are.
  // We send the JWT token in the Authorization header.
  // This function builds that header object.
  // ─────────────────────────────────────────────────────────────
  function authHeader() {
    const token = localStorage.getItem('token')
    // localStorage.getItem reads a value we saved during login
    // 'token' is the key we used when we saved it: localStorage.setItem('token', ...)

    return { 'Authorization': `Bearer ${token}` }
    // Result: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9...' }
    // 'Bearer' is a standard prefix for JWT tokens in HTTP headers
  }


  // ─────────────────────────────────────────────────────────────
  // useEffect — runs ONCE when the page first loads
  // The empty array [] as the second argument means:
  // "run this effect only once, when the component mounts"
  // (mounts = appears on screen for the first time)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token    = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    // Read from localStorage — these were saved during login

    if (!token) {
      // !token means token is null (not found in localStorage)
      // User is not logged in — send them to login page
      router.push('/login')
      return
      // return stops the rest of this function from running
    }

    // JSON.parse converts the stored string back to a JS object
    // We stored: JSON.stringify({ id: 1, email: 'a@a.com' })
    // We get back: { id: 1, email: 'a@a.com' }
    setUser(JSON.parse(userData))

    fetchTodos()
    // Call our function to load todos from the API
  }, [])
  // ↑ empty array = run only once on mount


  // ─────────────────────────────────────────────────────────────
  // fetchTodos — loads all todos from the API
  // Called once on page load
  // ─────────────────────────────────────────────────────────────
  async function fetchTodos() {
    setLoading(true)
    // Show "Loading..." while we wait

    const response = await fetch('/api/todos', {
      headers: authHeader()
      // Sends: Authorization: Bearer <token>
      // The API reads this, verifies the token, and returns only this user's todos
    })

    if (response.status === 401) {
      // 401 = Unauthorized — token is expired or invalid
      // Force the user to log in again
      router.push('/login')
      return
    }

    const data = await response.json()
    // data = { todos: [{ id: 1, title: '...', ... }, ...] }

    setTodos(data.todos)
    // Update the todos state — this triggers a re-render
    // React will now show the todos on screen

    setLoading(false)
    // Hide the "Loading..." message
  }


  // ─────────────────────────────────────────────────────────────
  // addTodo — creates a new todo
  // Called when user clicks "Add" or presses Enter in the input
  // ─────────────────────────────────────────────────────────────
  async function addTodo() {
    if (!input.trim()) return
    // .trim() removes spaces from start and end
    // '   '.trim() = '' which is falsy — so we return early
    // Don't allow adding blank todos

    setIsAdding(true)
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        // method: 'POST' means we're creating something
        // (vs GET = reading, PATCH = updating, DELETE = deleting)

        headers: {
          'Content-Type': 'application/json',
          // Tells the server we're sending JSON data
          ...authHeader()
          // ... (spread) merges authHeader's keys into this object
          // Result: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' }
        },

        body: JSON.stringify({ title: input })
        // body is the data we send
        // JSON.stringify converts { title: 'Buy milk' } to the string '{"title":"Buy milk"}'
        // HTTP bodies must be strings — JSON.stringify does that conversion
      })

      const data = await response.json()
      // data = { todo: { id: 5, title: 'Buy milk', completed: 0, ... } }

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


  // ─────────────────────────────────────────────────────────────
  // toggleTodo — marks a todo as done or not done
  // Called when user clicks the checkbox
  // ─────────────────────────────────────────────────────────────
  async function toggleTodo(todo) {
    const response = await fetch(`/api/todos/${todo.id}`, {
      // Template literal builds the URL: /api/todos/1, /api/todos/2, etc.

      method: 'PATCH',
      // PATCH = partial update (we're only changing 'completed')

      headers: { 'Content-Type': 'application/json', ...authHeader() },

      body: JSON.stringify({ completed: !todo.completed })
      // !todo.completed flips the boolean:
      //   if todo.completed is 0 (false) → !0 = true → sends { completed: true }
      //   if todo.completed is 1 (true)  → !1 = false → sends { completed: false }
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


  // ─────────────────────────────────────────────────────────────
  // saveEdit — saves the edited todo title
  // Called when user presses Enter or clicks away from the edit input
  // ─────────────────────────────────────────────────────────────
  async function saveEdit(id) {
    if (!editText.trim()) {
      setEditingId(null)
      // If they cleared the text, just cancel — don't save empty title
      return
    }

    const response = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ title: editText })
      // We only send title this time — not completed
      // The API uses COALESCE so it only updates what we send
    })

    const data = await response.json()

    if (response.ok) {
      setTodos(prev => prev.map(t => t.id === id ? data.todo : t))
      // Same .map() pattern — replace the updated todo in the list

      setEditingId(null)
      // Exit edit mode — show the span instead of input again
    }
  }


  // ─────────────────────────────────────────────────────────────
  // deleteTodo — removes a todo and all its subtasks
  // Called when user clicks ✕ on the main task row
  // ─────────────────────────────────────────────────────────────
  async function deleteTodo(id) {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'DELETE',
      headers: authHeader()
      // DELETE request — no body needed, the id is in the URL
    })

    if (response.ok) {
      setTodos(prev => prev.filter(t => t.id !== id))
      // .filter() creates a NEW array with only items that PASS the test
      // t.id !== id means: keep all todos EXCEPT the deleted one
      // This removes the deleted todo from the list without re-fetching

      // Also remove its subtasks from local state (cleanup)
      setSubtasks(prev => {
        const updated = { ...prev }
        // Create a copy of the subtasks object

        delete updated[id]
        // Remove the entry for this todo's id

        return updated
      })

      // If this todo was expanded, collapse it
      if (expandedId === id) setExpandedId(null)
    }
  }


  // ─────────────────────────────────────────────────────────────
  // logout — clears auth data and redirects to login
  // ─────────────────────────────────────────────────────────────
  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // removeItem deletes the stored values
    // Without the token, every API call will return 401

    router.push('/login')
  }


  // ─────────────────────────────────────────────────────────────
  // toggleExpand — opens/closes the subtask section for a todo
  // Also fetches subtasks from the API the first time it's opened
  // ─────────────────────────────────────────────────────────────
  async function toggleExpand(todoId) {
    if (expandedId === todoId) {
      // This todo is already expanded — collapse it
      setExpandedId(null)
      return
    }

    // Expand this todo
    setExpandedId(todoId)

    if (!subtasks[todoId]) {
      // subtasks[todoId] is undefined — we haven't fetched subtasks for this todo yet
      // undefined is falsy, so !undefined = true
      // We only fetch once — if we already have them, skip the API call

      const response = await fetch(`/api/todos/${todoId}/subtasks`, {
        headers: authHeader()
      })

      const data = await response.json()
      // data = { subtasks: [{ id: 1, todo_id: 5, title: '...', completed: 0 }, ...] }

      setSubtasks(prev => ({
        ...prev,
        // Copy all existing entries in the subtasks object

        [todoId]: data.subtasks
        // Add/update the entry for this todo's id
        // [todoId] uses the variable as the key (computed property name)
        // e.g. if todoId = 5, this is: { 5: data.subtasks }
      }))
    }
  }


  // ─────────────────────────────────────────────────────────────
  // addSubtask — creates a new subtask under a specific todo
  // ─────────────────────────────────────────────────────────────
  async function addSubtask(todoId) {
    const title = subtaskInput[todoId] || ''
    // subtaskInput[todoId] = the text in this todo's subtask input
    // || '' means: if it's undefined, use empty string instead

    if (!title.trim()) return
    // Don't add empty subtasks

    const response = await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ title })
      // shorthand for { title: title }
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


  // ─────────────────────────────────────────────────────────────
  // toggleSubtask — marks a subtask as done or not done
  // ─────────────────────────────────────────────────────────────
  async function toggleSubtask(todoId, subtask) {
    const response = await fetch(`/api/todos/${todoId}/subtasks/${subtask.id}`, {
      // URL has two dynamic parts: the todo id and the subtask id
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


  // ─────────────────────────────────────────────────────────────
  // deleteSubtask — removes a subtask
  // ─────────────────────────────────────────────────────────────
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


  // ─────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // These are calculated fresh every render — no API calls
  // ─────────────────────────────────────────────────────────────

  const visibleTodos = todos
    .filter(t => {
      // filter() keeps only todos that pass this test
      if (filter === 'active')    return !t.completed
      // !t.completed = not done = active — keep it
      if (filter === 'completed') return  !!t.completed
      // !!t.completed = convert 0/1 to false/true — keep if done
      return true
      // filter === 'all' — keep everything
    })
    .sort((a, b) => a.completed - b.completed)
    // .sort() reorders the array
    // (a, b) are two todos being compared
    // a.completed - b.completed:
    //   if a is done (1) and b is not (0): 1 - 0 = 1  → a goes after b (done sink to bottom)
    //   if a is not done (0) and b is (1): 0 - 1 = -1 → a goes before b (undone float to top)
    //   if both same: 0 → no change

  const pendingCount   = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t =>  !!t.completed).length
  // .length gives the count of items in the filtered array


  // ─────────────────────────────────────────────────────────────
  // RENDER — what the user sees
  // JSX looks like HTML but it's JavaScript
  // Rules:
  //   - {expression} embeds a JS value or expression in JSX
  //   - Use className instead of class
  //   - All tags must be closed: <br /> not <br>
  //   - Return ONE root element (wrap multiple in <div> or <>)
  //   - {condition && <element>} — renders element only if condition is truthy
  //   - {a ? b : c} — ternary: renders b if a is true, else c
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.container}>


        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Tasks</h1>
            {user && <p style={styles.subtitle}>{user.email}</p>}
            {/* user && <p> means: only render the <p> if user is not null */}
            {/* user starts as null — once loaded, this shows the email */}
          </div>
          <button onClick={logout} style={styles.logoutBtn}>
            Log out
          </button>
        </div>

        {/* ── STATS ─────────────────────────────────────────── */}
        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statNum}>{pendingCount}</span>
            <span style={styles.statLabel}>pending</span>
          </div>
          <div style={styles.statDivider} />
          {/* self-closing div renders as an empty element — used as a visual divider */}
          <div style={styles.stat}>
            <span style={styles.statNum}>{completedCount}</span>
            <span style={styles.statLabel}>done</span>
          </div>
        </div>

        {/* ── ADD TODO INPUT ────────────────────────────────── */}
        <div style={styles.inputRow}>
          <input
            value={input}
            // value={input} makes this a "controlled input"
            // the input's displayed value always matches the state variable
            onChange={e => setInput(e.target.value)}
            // onChange fires every time the user types a character
            // e = the event object
            // e.target = the input element
            // e.target.value = the current text in the input
            // setInput updates state → React re-renders → input shows new text
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            // onKeyDown fires when any key is pressed
            // e.key === 'Enter' checks if it was the Enter key
            // && addTodo() — if true, call addTodo()
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

        {/* ── FILTER TABS ───────────────────────────────────── */}
        <div style={styles.filters}>
          {['all', 'active', 'completed'].map(f => (
            // We have 3 filter options — map() creates a button for each
            // f = the current filter string ('all', 'active', or 'completed')
            <button
              key={f}
              // key is required when rendering lists in React
              // It must be unique — f works because each string is unique

              onClick={() => setFilter(f)}
              // When clicked, update the filter state to this value
              // This triggers a re-render and visibleTodos recomputes

              style={{
                ...styles.filterBtn,
                // Spread the base button styles in first

                backgroundColor: filter === f ? '#2563eb' : 'transparent',
                // If this button's value matches the current filter, highlight it blue
                // Otherwise transparent (no background)

                color: filter === f ? '#fff' : '#888'
                // White text when active, grey when not
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {/* Capitalise the first letter:
                  f.charAt(0)          = 'a' (first character)
                  .toUpperCase()       = 'A'
                  f.slice(1)           = 'll' (everything from index 1 onward)
                  'A' + 'll'           = 'All' */}
            </button>
          ))}
        </div>

        {/* ── TODO LIST ─────────────────────────────────────── */}
        {loading ? (
          // Ternary — if loading is true show this:
          <p style={styles.empty}>Loading your tasks...</p>

        ) : visibleTodos.length === 0 ? (
          // Nested ternary — if not loading but list is empty:
          <p style={styles.empty}>
            {filter === 'all'       ? 'No tasks yet. Add one above.' : ''}
            {filter === 'active'    ? 'No pending tasks. Well done!' : ''}
            {filter === 'completed' ? 'No completed tasks yet.'      : ''}
          </p>

        ) : (
          // Otherwise show the list:
          <ul style={styles.list}>
            {visibleTodos.map(todo => (
              <li key={todo.id} style={styles.todoBlock}>

                {/* ── MAIN TASK ROW ──────────────────────────── */}
                <div style={styles.item}>

                  {/* Checkbox — toggles completed */}
                  <input
                    type='checkbox'
                    checked={!!todo.completed}
                    // !! converts 0 to false and 1 to true
                    // checked expects a boolean — SQLite stores 0/1
                    onChange={() => toggleTodo(todo)}
                    style={styles.checkbox}
                  />

                  {/* Title — switches between text and edit input */}
                  {editingId === todo.id ? (
                    // EDIT MODE: show an input field
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => saveEdit(todo.id)}
                      // onBlur fires when the input LOSES focus (user clicks away)
                      // This auto-saves when clicking elsewhere
                      onKeyDown={e => e.key === 'Enter' && saveEdit(todo.id)}
                      autoFocus
                      // autoFocus makes this input focused immediately when it appears
                      style={{ ...styles.input, flex: 1, padding: '4px 8px' }}
                    />
                  ) : (
                    // VIEW MODE: show a span with the title
                    <span
                      onDoubleClick={() => {
                        setEditingId(todo.id)
                        // Enter edit mode for this todo
                        setEditText(todo.title)
                        // Pre-fill the edit input with the current title
                      }}
                      style={{
                        ...styles.itemText,
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        // Strike through text if completed
                        color:          todo.completed ? '#aaa' : '#222',
                        // Grey out completed todos
                        fontWeight: '500'
                      }}
                    >
                      {todo.title}
                    </span>
                  )}

                  {/* Expand / Collapse button */}
                  <button
                    onClick={() => toggleExpand(todo.id)}
                    style={styles.expandBtn}
                    title='Show subtasks'
                    // title shows a tooltip on hover
                  >
                    <span style={{
                      display: 'inline-block',
                      transform: expandedId === todo.id
                        ? 'rotate(90deg)'
                        : 'rotate(0deg)',
                      // Rotate the arrow ▶ to point down when expanded
                      transition: 'transform 0.2s'
                      // Smooth rotation animation over 0.2 seconds
                    }}>
                      ▶
                    </span>
                    {' '}
                    {subtasks[todo.id]
                      ? subtasks[todo.id].length
                      : '·'
                    }
                    {/* Show count if loaded, dot if not yet loaded */}
                  </button>

                  {/* Delete main todo */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    onMouseEnter={e => e.target.style.color = '#e53e3e'}
                    // Turn red on hover
                    onMouseLeave={e => e.target.style.color = '#ccc'}
                    // Back to grey when mouse leaves
                    style={styles.deleteBtn}
                    title='Delete task'
                  >
                    ✕
                  </button>
                </div>

                {/* ── SUBTASKS SECTION ───────────────────────── */}
                {/* Only rendered when this todo is expanded */}
                {expandedId === todo.id && (
                  <div style={styles.subtaskSection}>

                    {/* Subtask list */}
                    {(subtasks[todo.id] || []).length === 0 ? (
                      // No subtasks yet
                      <p style={styles.subtaskEmpty}>
                        No subtasks yet — add one below
                      </p>
                    ) : (
                      // Show each subtask
                      (subtasks[todo.id] || []).map(sub => (
                        <div key={sub.id} style={styles.subtaskItem}>

                          {/* Subtask checkbox */}
                          <input
                            type='checkbox'
                            checked={!!sub.completed}
                            onChange={() => toggleSubtask(todo.id, sub)}
                            style={styles.checkbox}
                          />

                          {/* Subtask title */}
                          <span style={{
                            ...styles.subtaskText,
                            textDecoration: sub.completed ? 'line-through' : 'none',
                            color:          sub.completed ? '#bbb' : '#444'
                          }}>
                            {sub.title}
                          </span>

                          {/* Delete subtask */}
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

                    {/* Add subtask input row */}
                    <div style={styles.subtaskInputRow}>
                      <input
                        value={subtaskInput[todo.id] || ''}
                        // subtaskInput[todo.id] = text for this specific todo's input
                        // || '' = fallback to empty string if undefined
                        onChange={e => setSubtaskInput(prev => ({
                          ...prev,
                          // Keep all other todos' input values unchanged
                          [todo.id]: e.target.value
                          // Update only this todo's input value
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
                {/* End subtask section */}

              </li>
            ))}
          </ul>
        )}
        {/* End todo list */}

      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// STYLES
// CSS written as a JavaScript object.
// Property names are camelCase: background-color → backgroundColor
// Values are strings: '100vh', '#ffffff', '1px solid #ddd'
// Numbers without units are treated as pixels for some properties
// ─────────────────────────────────────────────────────────────
const styles = {

  // The outer full-screen background
  page: {
    minHeight: '100vh',
    // 100vh = 100% of the viewport height (full screen)
    backgroundColor: '#ffffffff',
    fontFamily: 'system-ui, sans-serif',
    // system-ui uses the operating system's default font (clean, no download needed)
    padding: '2rem 1rem'
    // 2rem top/bottom, 1rem left/right (rem = relative to root font size, ~16px each)
  },

  // The white card in the centre
  container: {
    maxWidth: '580px',
    // Never wider than 580px — stays readable on large screens
    margin: '0 auto',
    // 0 = no top/bottom margin, auto = equal left/right margin = centres it
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)'
    // Subtle shadow: 0 horizontal, 1px vertical, 6px blur, 8% black opacity
  },

  // Top row with title and logout
  header: {
    display: 'flex',
    // flexbox — children sit in a row
    justifyContent: 'space-between',
    // Push children to opposite ends (title left, logout right)
    alignItems: 'flex-start',
    // Align to the top
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
    // cursor: 'pointer' shows the hand cursor on hover — signals clickable
    color: '#666'
  },

  // Stats row (pending / done counts)
  stats: {
    display: 'flex',
    gap: '1rem',
    // gap adds space between flex children
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '10px',
    alignItems: 'center'
  },

  stat: {
    display: 'flex',
    flexDirection: 'column',
    // column = children stack vertically (number above label)
    alignItems: 'center',
    flex: 1
    // flex: 1 makes each stat take equal width
  },

  statNum:     { fontSize: '26px', fontWeight: '700', color: '#2563eb' },
  statLabel:   { fontSize: '12px', color: '#999', marginTop: '2px' },
  statDivider: { width: '1px', height: '36px', backgroundColor: '#e8e8e8' },

  // "Add task" input row
  inputRow: { display: 'flex', gap: '8px', marginBottom: '1rem' },

  input: {
    flex: 1,
    // flex: 1 makes the input take all available space
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none'
    // outline: none removes the browser's default blue ring on focus
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
    // flexShrink: 0 prevents the button from shrinking if space is tight
  },

  // Filter tab buttons row
  filters: { display: 'flex', gap: '6px', marginBottom: '1rem' },

  filterBtn: {
    padding: '6px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '20px',
    // high border-radius = pill shape
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.15s'
    // smooth transition for background-color and color changes
  },

  // The <ul> containing all todos
  list: { listStyle: 'none', margin: 0, padding: 0 },
  // listStyle: none removes bullet points from <ul>

  // Each <li> wrapping a main todo + its subtasks
  todoBlock: {
    borderBottom: '1px solid #f0f0f0',
    paddingBottom: '4px',
    marginBottom: '2px'
  },

  // The main task row (checkbox + title + buttons)
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
    // flexShrink: 0 prevents checkbox from getting smaller
  },

  // The todo title text
  itemText: {
    flex: 1,
    fontSize: '15px',
    lineHeight: '1.4',
    cursor: 'text'
    // cursor: text shows the I-beam cursor to hint double-click to edit
  },

  // The ▶ expand/collapse button
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
    // minWidth ensures the button doesn't collapse too small
    textAlign: 'center'
  },

  // The ✕ delete button (shared for todos and subtasks)
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 6px',
    flexShrink: 0
  },

  // The indented subtask section
  subtaskSection: {
    marginLeft: '27px',
    // Indented to align with the text (past the checkbox)
    paddingLeft: '14px',
    borderLeft: '2px solid #e8e8e8',
    // Vertical line connecting the subtasks visually to the parent todo
    marginBottom: '8px',
    paddingBottom: '4px'
  },

  subtaskEmpty: {
    fontSize: '13px',
    color: '#bbb',
    margin: '6px 0',
    fontStyle: 'italic'
  },

  // Each subtask row
  subtaskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '5px 0',
    borderBottom: '1px solid #f8f8f8'
  },

  // Subtask title text
  subtaskText: {
    flex: 1,
    fontSize: '14px',
    lineHeight: '1.4'
  },

  // "Add subtask" input row
  subtaskInputRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
    paddingTop: '6px'
  },

  // The "Add subtask" text input
  subtaskInput: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid #e8e8e8',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#010101'
  },

  // The "+ Add" subtask button
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

  // Empty state message
  empty: {
    textAlign: 'center',
    color: '#bbb',
    padding: '2.5rem 0',
    fontSize: '15px'
  }
}