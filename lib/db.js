import Database from 'better-sqlite3'
const db = new Database('todos.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    email    TEXT    UNIQUE NOT NULL,
    password TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS todos (
    id        INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER  NOT NULL,
    title     TEXT     NOT NULL,
    completed INTEGER  DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

   CREATE TABLE IF NOT EXISTS subtasks (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    todo_id    INTEGER  NOT NULL,
    title      TEXT     NOT NULL,
    completed  INTEGER  DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (todo_id) REFERENCES todos(id)
  );
`)

export default db