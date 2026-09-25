#!/bin/sh
set -e
# Create / migrate the SQLite schema, then start the server.
node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss >/dev/null
exec node server.js
