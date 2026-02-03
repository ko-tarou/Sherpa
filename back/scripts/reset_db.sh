#!/bin/bash
# PostgreSQL の sherpa データベースを削除して作り直し、マイグレーションを実行する。
# 実行場所: back/ から ./scripts/reset_db.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACK_DIR"

if [ ! -f .env ]; then
  echo "Error: .env not found in $BACK_DIR"
  exit 1
fi

# .env を読み込んで export（同じシェルで変数を使う）
set -a
. ./.env
set +a

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-sherpa}"

echo "Dropping database '$DB_NAME'..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating database '$DB_NAME'..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "Running migrations..."
./scripts/setup_db.sh

echo "Reset completed. You can run: make dev"
