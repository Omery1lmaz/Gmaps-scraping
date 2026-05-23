#!/bin/sh
# docker-entrypoint.sh - Server Start

set -e

echo "🐳 Docker entrypoint starting..."

# Start the server (use dev mode if NODE_ENV is development)
if [ "$NODE_ENV" = "development" ]; then
  echo "📦 Checking/Installing dependencies..."
  npm install --legacy-peer-deps
  echo "🚀 Starting server in development mode..."
  exec npm run dev
else
  echo "🚀 Starting server..."
  exec node dist/index.js
fi