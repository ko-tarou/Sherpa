#!/bin/bash

# PostgreSQL データベースセットアップスクリプト

set -e

# 環境変数の読み込み
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-sherpa}

echo "Setting up PostgreSQL database..."

# データベースの作成（存在しない場合）
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME"

echo "Database '$DB_NAME' created or already exists"

# マイグレーションの実行
for f in migrations/001_initial_schema.sql migrations/002_task_extensions.sql; do
    if [ -f "$f" ]; then
        echo "Running $f..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$f"
        echo "Done: $f"
    fi
done

echo "Database setup completed!"
