#!/bin/bash
set -e

workdir="${1:-packages/gui}"
timeout_seconds=1800  # 30 minutes

echo "Starting npm run electron in $workdir with 30 minute timeout..."

cd "$workdir"
# don't exit for sandboxing issues
npm run electron --no-sandbox &
pid=$!

sleep $timeout_seconds &

sleep_pid=$!

wait $sleep_pid 2>/dev/null || true

if kill -0 $pid 2>/dev/null; then
    echo "⏱  Electron run completed 30 minutes without error, terminating..."
    kill $pid
    sleep 5
    if kill -0 $pid 2>/dev/null; then
        kill -9 $pid
    fi
    echo "✅ 程序运行正常"
    exit 0
else
    echo "❌ 程序运行不正常"
    exit 1
fi