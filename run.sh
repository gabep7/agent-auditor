#!/bin/bash
set -e

echo "Starting Agent Auditor..."

# Start backend
cd backend
source venv/bin/activate
echo "Backend starting on http://localhost:8000"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd ../frontend
echo "Frontend starting on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

# Wait for both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
