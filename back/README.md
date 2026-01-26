# Sherpa Backend (Go)

Sherpa Event Manager のバックエンドAPIサーバーです。

## 技術スタック

- **言語**: Go 1.21+
- **フレームワーク**: Gin
- **データベース**: PostgreSQL
- **ORM**: GORM
- **AI**: Google Gemini API

## セットアップ

### 1. PostgreSQLのインストール

macOS:
```bash
brew install postgresql@15
brew services start postgresql@15
```

Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. 依存関係のインストール

```bash
go mod download
```

### 3. 環境変数の設定

`.env.example`をコピーして`.env`を作成：

```bash
cp .env.example .env
```

`.env`ファイルを編集して、データベース接続情報とAPIキーを設定してください：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=sherpa
DB_SSLMODE=disable
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. データベースのセットアップ

#### 方法1: スクリプトを使用（推奨）

```bash
chmod +x scripts/setup_db.sh
./scripts/setup_db.sh
```

#### 方法2: 手動でセットアップ

```bash
# PostgreSQLに接続
psql -U postgres

# データベースを作成
CREATE DATABASE sherpa;

# マイグレーションファイルを実行
psql -U postgres -d sherpa -f migrations/001_initial_schema.sql
```

#### 方法3: GORMのAutoMigrateを使用（開発用）

サーバーを起動すると、自動的にマイグレーションが実行されます（`main.go`で`AutoMigrate`を呼び出しています）。

## 開発

### サーバーの起動

```bash
make dev
```

または：

```bash
go run cmd/server/main.go
```

### ビルド

```bash
make build
```

## API エンドポイント

### ヘルスチェック
- `GET /api/health` - サーバーの状態確認

### イベント
- `GET /api/events` - イベント一覧取得
- `GET /api/events/:id` - イベント詳細取得
- `POST /api/events` - イベント作成
- `PUT /api/events/:id` - イベント更新
- `DELETE /api/events/:id` - イベント削除

### タスク
- `GET /api/events/:eventId/tasks` - タスク一覧取得
- `POST /api/events/:eventId/tasks` - タスク作成
- `POST /api/tasks/generate` - AIタスク生成
- `PUT /api/tasks/:id` - タスク更新
- `DELETE /api/tasks/:id` - タスク削除

## プロジェクト構造

```
back/
├── cmd/
│   └── server/
│       └── main.go          # エントリーポイント
├── internal/
│   ├── models/              # データモデル
│   ├── handlers/            # HTTPハンドラー
│   ├── services/            # ビジネスロジック
│   ├── middleware/          # ミドルウェア
│   └── database/            # データベース接続
├── migrations/              # データベースマイグレーション
└── go.mod                   # Go依存関係
```
