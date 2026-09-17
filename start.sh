#!/usr/bin/env bash
set -e

echo "🚀 Starting StreamPulse"

(cd mini-kafka && node src/broker.js) &
BROKER_PID=$!

(cd backend && npm install && npm run dev) &
BACKEND_PID=$!

(cd frontend && npm install && npm run dev) &
FRONTEND_PID=$!

echo "Dashboard: http://localhost:5173"
echo "Demo site: http://localhost:5500"
echo "API:       http://localhost:3001"
echo "Broker:    localhost:9090"
echo ""
echo "Press Ctrl+C to stop."

trap 'kill $BROKER_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' INT TERM
wait
