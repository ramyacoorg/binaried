# TaskFlow — Binaried Assignment

A small full-stack task manager built with **Angular**, **Node.js/Express**, and **MongoDB**, with basic JWT authentication and full CRUD on tasks.

## Features

- Register / log in with a JWT-based session (basic auth, as requested)
- Create, read, update, and delete tasks
- Each task has a title, description, status (todo / in-progress / done), priority (low / medium / high), tags, and an optional due date
- Search tasks by title/description, and filter by status or priority
- A small dashboard bar showing task counts (total / todo / in-progress / done)
- **AI Suggest**: click the button on the task form and a Hugging Face inference model generates a short description plus a few subtasks from just the title — this is a real AI feature used *inside* the app, not just a tool used to build it
- Tasks are private to the logged-in user
- Responsive UI (single column on mobile, multi-column grid on larger screens)

## Project structure

```
binaried-assignment/
├── backend/          Node.js + Express + MongoDB API
│   ├── models/        Mongoose schemas (User, Task)
│   ├── routes/         auth.js (register/login), tasks.js (CRUD)
│   ├── middleware/     auth.js (JWT verification)
│   └── server.js
└── frontend/          Angular app
    └── src/app/
        ├── components/  login, register, task-list, task-form
        ├── services/    auth.service.ts, task.service.ts
        ├── guards/      auth.guard.ts
        └── interceptors/ auth.interceptor.ts (attaches JWT to requests)
```

## Setup instructions

### Prerequisites
- Node.js (v18+)
- MongoDB running locally, or a free MongoDB Atlas cluster

### 1. Backend
```
cd backend
npm install
cp .env.example .env
# edit .env and set MONGO_URI and JWT_SECRET
# (optional) set HUGGINGFACE_API_KEY and HUGGINGFACE_MODEL to enable the "AI Suggest" button on the task form
npm start
```
The API runs on `http://localhost:5000`. Everything works without `HUGGINGFACE_API_KEY` — only the "AI Suggest" button is disabled without it.

### 2. Frontend
```
cd frontend
npm install
npm start
```
The app runs on `http://localhost:4200`. Register a new account, then log in to start adding tasks.

## AI integration

- **Hugging Face** is used for the in-app "AI Suggest" feature through the Hugging Face Inference API.
- Configure `HUGGINGFACE_API_KEY` and optionally `HUGGINGFACE_MODEL` in the backend environment to enable AI-generated task suggestions.

## Where AI helped

- Adding an in-app AI suggestion flow so task descriptions and subtasks can be generated directly from the task title.
- Helping connect the backend API with the frontend form so the feature feels native to the app experience.
- Supporting a lightweight, responsive UI for the task workflow without introducing a heavy UI framework.

## What I implemented / reviewed myself
- Reviewed the JWT auth flow (register/login â†’ token â†’ interceptor attaches
  it to every request â†’ backend middleware verifies it) until I could
  explain it end to end.
- Set up and debugged MongoDB Atlas myself, including creating the database
  user, configuring network access, and building the connection string.
- Deployed the app myself across three platforms (MongoDB Atlas, Render for
  the backend, Vercel for the frontend), including fixing CORS and
  hardcoded URLs so the deployed frontend could actually reach the
  deployed backend.
- Debugged the AI Suggest feature myself when it wasn't returning real
  AI-generated output, tracing it through backend logs to find the actual
  cause rather than guessing.
  

## Challenges faced
 
The biggest challenge was deployment â€” getting MongoDB Atlas, Render, and
Vercel to all talk to each other correctly. I ran into a MongoDB
authentication error caused by a special character in my password not
being URL-encoded, which I fixed by resetting to a simpler password. I also
hit an issue where the AI Suggest feature kept returning generic text
instead of a real AI-generated suggestion â€” I'm still working through
diagnosing whether that's a Hugging Face API/model issue or a backend
configuration issue, using backend logs to narrow it down.

## If I had more time, I would improve

- Add form validation feedback (e.g. disabling the submit button until required fields are valid)
- Add pagination or filtering (by status/priority) on the task list
- Add unit tests for the backend routes and Angular services
- Add a "forgot password" flow and email verification
- Deploy the backend and frontend so the Live Demo link works out of the box
