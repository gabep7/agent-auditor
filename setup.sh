#!/bin/bash
set -e

echo "=== Agent Auditor Setup ==="

# Backend
echo "Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "=== Setup complete ==="
echo ""
echo "To run the application:"
echo "  1. Copy backend/.env.example to backend/.env and fill in your keys"
echo "  2. Run: ./run.sh"
