#!/bin/bash
# PostgreSQL の sherpa DB を削除→作成→マイグレーションまで一括実行。
# どこからでも: bash /path/to/Sherpa/back/scripts/reset_db.sh
# または back で: ./scripts/reset_db.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACK_DIR"

if [ ! -f .env ]; then
  echo "Error: .env not found in $BACK_DIR"
  echo "Copy .env.example to .env and set DB_USER, DB_PASSWORD, DB_NAME."
  exit 1
fi

# .env を 1 行ずつ読み、KEY=VALUE だけ export（コメント・空行は無視、CRLF 対応）
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%%#*}"
  line="${line//$'\r'/}"
  [ -z "${line}" ] && continue
  case "$line" in
    *=*)
      key="${line%%=*}"
      val="${line#*=}"
      export "$key=$val"
      ;;
  esac
done < .env

# 必須のデフォルト（未設定 or 空のとき）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-sherpa}"
# DB_PASSWORD は空でもよい（peer 認証など）

if [ -z "$DB_USER" ]; then
  echo "Error: DB_USER is empty. Set DB_USER=postgres (or your user) in .env"
  exit 1
fi

echo "Using: DB_HOST=$DB_HOST DB_PORT=$DB_PORT DB_USER=$DB_USER DB_NAME=$DB_NAME"

echo "Dropping database '$DB_NAME'..."
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

echo "Creating database '$DB_NAME'..."
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\";"

for f in migrations/001_initial_schema.sql migrations/002_task_extensions.sql; do
  if [ -f "$f" ]; then
    echo "Running $f..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$f"
    echo "Done: $f"
  fi
done

echo ""
echo "Reset + migrations completed. Start the server with: make dev"
