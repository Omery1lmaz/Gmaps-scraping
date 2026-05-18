#!/bin/bash
set -e

echo "=== DOCKER ENTRYPOINT SCRIPT STARTING ==="
echo "Cleaning up Chromium singleton lock files to prevent profile conflicts..."

# Clean up any existing singleton lock files that might cause conflicts
if [ -d "/app/.wwebjs_auth" ]; then
  echo "Found .wwebjs_auth directory, cleaning Singleton files..."
  find "/app/.wwebjs_auth" -name "SingletonLock" -delete 2>/dev/null || true
  find "/app/.wwebjs_auth" -name "SingletonCookie" -delete 2>/dev/null || true
  find "/app/.wwebjs_auth" -name "SingletonSocket" -delete 2>/dev/null || true

  # Also check for lock files in session directories
  find "/app/.wwebjs_auth" -type d -name "session-*" -exec sh -c '
    for dir; do
      if [ -e "$dir/SingletonLock" ]; then
        rm -f "$dir/SingletonLock" && echo "Removed lock from $dir"
      fi
      if [ -e "$dir/SingletonCookie" ]; then
        rm -f "$dir/SingletonCookie" && echo "Removed cookie from $dir"
      fi
      if [ -e "$dir/SingletonSocket" ]; then
        rm -f "$dir/SingletonSocket" && echo "Removed socket from $dir"
      fi
    done
  ' sh {} + 2>/dev/null || true

  echo "Finished cleaning Chromium singleton lock files"
else
  echo ".wwebjs_auth directory not found at /app/.wwebjs_auth"
fi

# Clean up any existing stale wwebjs cache directories to prevent loading outdated web version assets
if [ -d "/app/.wwebjs_cache" ]; then
  echo "Found .wwebjs_cache directory, cleaning up to prevent cached stale version errors..."
  rm -rf /app/.wwebjs_cache
fi

# echo "Skipping Prisma migrations in wa-engine (handled by api service)..."
# npx prisma migrate deploy

echo "Starting WhatsApp Engine..."
exec "$@"