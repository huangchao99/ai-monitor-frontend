#!/bin/bash
# Start AI Monitor Vue Frontend (dev mode)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
exec npm run dev
