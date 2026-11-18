#!/usr/bin/env bash
set -e

echo "=============================================="
echo "   🚀 Deploying DeepTrace AI in Production"
echo "=============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Ensure .env file exists
if [ ! -f backend/.env ]; then
    echo "⚠️ backend/.env not found! Creating from backend/.env.example with random JWT secret..."
    cp backend/.env.example backend/.env
    # Generate random 32-byte secret
    RANDOM_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$RANDOM_SECRET/" backend/.env
fi

echo "📦 Building and starting Docker containers..."
docker compose up -d --build

echo "⏳ Waiting for services to become healthy..."
sleep 5

echo "🔍 Checking container status..."
docker compose ps

echo "=============================================="
echo "✅ DeepTrace AI is LIVE and Running!"
echo "👉 Frontend: http://localhost:80 (or http://localhost:5173)"
echo "👉 Backend API: http://localhost:8000"
echo "👉 API Docs: http://localhost:8000/api/docs"
echo "=============================================="
