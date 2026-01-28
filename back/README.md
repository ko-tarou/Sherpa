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
go mod tidy
```

**注意**: OAuth認証を使用するには、`go mod tidy`を実行してJWTライブラリをインストールしてください。

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

# OAuth設定（Google）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URL=http://localhost:5173/auth/callback
FRONTEND_URL=http://localhost:5173

# JWT設定（オプション、未設定の場合は自動生成）
JWT_SECRET=your_jwt_secret_key

# 管理者API（管理者アプリ /admin 用）
ADMIN_API_KEY=your_admin_api_key_here
```

### Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. 「APIとサービス」→「認証情報」でOAuth 2.0クライアントIDを作成
3. 承認済みのリダイレクトURIに `http://localhost:5173/auth/callback` を追加
4. クライアントIDとシークレットを`.env`に設定

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

### バッチ処理（週次クリーンアップ）

論理削除済みチャンネル（および CASCADE で紐づくメッセージ・メンバー）を物理削除するバッチです。週1回 cron で実行する想定です。

```bash
go run ./cmd/batch
```

例: 毎週日曜 3:00 に実行（crontab `0 3 * * 0`）:

```bash
0 3 * * 0 cd /path/to/Sherpa/back && go run ./cmd/batch >> /var/log/sherpa-batch.log 2>&1
```

ビルド済みバイナリを使う場合:

```bash
go build -o bin/batch ./cmd/batch
0 3 * * 0 /path/to/Sherpa/back/bin/batch >> /var/log/sherpa-batch.log 2>&1
```

### 管理者API・管理者アプリ

- `back/.env` に `ADMIN_API_KEY` を設定する。
- 管理者アプリ (`admin/`) から `GET /api/admin/events`（全イベント一覧）・`POST /api/admin/batch/run`（バッチ手動実行）を利用できる。
- 認証: リクエストヘッダーに `X-Admin-Key: <ADMIN_API_KEY>` を付与する。

## API エンドポイント

### ヘルスチェック
- `GET /api/health` - サーバーの状態確認

### 管理者API（`X-Admin-Key` 必須）
- `GET /api/admin/events` - 全イベント一覧（集計付き）
- `POST /api/admin/batch/run` - バッチ処理（論理削除チャンネル物理削除）の手動実行

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
│   ├── server/
│   │   └── main.go          # API サーバー
│   └── batch/
│       └── main.go          # 週次バッチ（クリーンアップ）
├── internal/
│   ├── batch/               # バッチ用パッケージ
│   ├── models/              # データモデル
│   ├── handlers/            # HTTPハンドラー
│   ├── services/            # ビジネスロジック
│   ├── middleware/          # ミドルウェア
│   └── database/            # データベース接続
├── migrations/              # データベースマイグレーション
└── go.mod                   # Go依存関係
```
