# 🚀 AI-Powered To-Do App

A modern, full-stack To-Do application built with **Next.js**, **SQLite**, and integrated with **Google Gemini AI** to automatically break down your high-level tasks into detailed checklists of subtasks.

---

## ✨ Features

- **🔒 User Authentication**: Secure Register & Login using JSON Web Tokens (JWT) and Bcrypt password hashing.
- **📁 Persistent SQLite Database**: Store users, todos, and subtasks locally via `better-sqlite3`.
- **⚡ AI Checklist Generator**: Simply prefix a task with `\ai ` to automatically generate a main task and a checklist of 3–7 subtasks using Google's Gemini AI.
- **✅ Subtasks Checklist**: Interactive, toggleable subtasks for each main todo item.

---

## 🛠️ Setup & Running

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Configure Environment Variables
Create a file named `.env.local` in the root of the project directory and define the following variables:

```env
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key_here
```

> [!TIP]
> You can get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/).

### 3. Install Dependencies
Run the following command in the root folder to install the required packages:
```bash
npm install
```

### 4. Run the App
Launch the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to register/login and access the dashboard.

---

## 🤖 Using the AI Feature

To use the AI checklist generator:

1. Locate the todo input box at the top of the dashboard.
2. Type `\ai ` (case-insensitive) followed by your high-level goal or prompt.
   
   *Example prompts:*
   - `\ai Plan a weekend trip to Paris`
   - `\ai Learn React basics this week`
   - `\ai Clean the kitchen and meal prep`
3. Press **Enter** or click add.
4. Gemini will automatically create a main task and populate it with a checklist of **3 to 7 structured, actionable subtasks**!
