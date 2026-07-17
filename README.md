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

*(Personalize this section honestly before submitting — e.g., which parts you read line-by-line and understood, any bugs you fixed yourself, any changes you made to the AI-generated code, and anything you added on top of it.)*

## Challenges faced

*(Fill in based on your actual experience — e.g., getting MongoDB connected locally, understanding how the JWT token flows from login → interceptor → protected routes, etc.)*

## If I had more time, I would improve

- Add form validation feedback (e.g. disabling the submit button until required fields are valid)
- Add pagination or filtering (by status/priority) on the task list
- Add unit tests for the backend routes and Angular services
- Add a "forgot password" flow and email verification
- Deploy the backend and frontend so the Live Demo link works out of the box
