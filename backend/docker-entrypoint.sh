#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Applying database schema..."
until npx prisma db push; do
  echo "Database not ready, retrying..."
  sleep 2
done

if [ "$SEED_ON_START" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts || echo "Seed failed — check products.json and logs"
else
  echo "SEED_ON_START is not true — skip seed"
fi

exec "$@"
