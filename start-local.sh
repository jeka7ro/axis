#!/bin/bash

# Kill any existing processes on these ports to avoid conflicts
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "🚀 Pornire Backend (FastAPI)..."
cd backend
source venv/bin/activate
# Start backend in the background
uvicorn app.main:app --reload --port 8000 &
cd ..

echo "🚀 Pornire Frontend (React/Vite)..."
cd frontend
# Start frontend in the foreground
npm run dev
