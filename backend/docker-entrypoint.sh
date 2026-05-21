#!/bin/sh
set -e

echo "Applying database schema..."
until npx prisma db push 2>/dev/null; do
  echo "Database not ready, retrying..."
  sleep 2
done

if [ "$SEED_ON_START" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts || echo "Seed skipped or failed"
fi

exec "$@"
