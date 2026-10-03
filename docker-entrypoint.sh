#!/bin/sh
set -e
# Create / update the SQLite schema, then start the server.
node /app/prisma-cli/node_modules/prisma/build/index.js db push --schema /app/prisma/schema.prisma --skip-generate --accept-data-loss
exec node server.js
