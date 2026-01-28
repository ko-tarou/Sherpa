# Sherpa Event Manager

イベント管理用のフルスタックWebアプリケーションです。

## プロジェクト構造

```
Sherpa/
├── front/          # フロントエンド (React + Vite + TypeScript)
├── back/           # バックエンド (Go + Gin + PostgreSQL)
├── admin/          # 管理者用アプリ (React + Vite) — 全イベント一覧・バッチ実行
└── ...
```

## セットアップ

### 1. 依存関係のインストール

```bash
npm run install:all
```

または、個別にインストール：

```bash
# ルート
npm install

# フロントエンド
cd front && npm install

# バックエンド
cd back && npm install
```

### 2. 環境変数の設定

#### バックエンド
`back/.env` ファイルを作成：

```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```

#### フロントエンド
`front/.env` ファイルを作成（必要に応じて）：

```env
VITE_API_URL=http://localhost:3001
```

## 開発

### フロントエンドとバックエンドを同時に起動

```bash
npm run dev
```

### 個別に起動

```bash
# フロントエンド (http://localhost:5173)
cd front && npm run dev

# バックエンド (http://localhost:3001)
cd back && make dev

# 管理者アプリ (http://localhost:5175)
cd admin && npm install && npm run dev
```

### 管理者アプリ (admin)

- 全イベントの状態を表で確認・検索・ソート
- 論理削除チャンネル物理削除バッチの手動実行
- `back/.env` に `ADMIN_API_KEY` を設定し、管理画面ログイン時にそのキーを入力して利用

## ビルド

```bash
# 両方ビルド
npm run build

# 個別にビルド
npm run build:front
npm run build:back
```

## API エンドポイント

### ヘルスチェック
- `GET /api/health` - サーバーの状態確認

### イベント
- `GET /api/events` - イベント一覧取得
- `POST /api/events` - イベント作成
- `PUT /api/events/:id` - イベント更新
- `DELETE /api/events/:id` - イベント削除

### タスク
- `POST /api/tasks/generate` - AIタスク生成
  - Body: `{ "eventTitle": "イベント名" }`

## 技術スタック

### フロントエンド
- React 19
- TypeScript
- Vite
- Tailwind CSS

### バックエンド
- Node.js
- Express
- TypeScript
- Google Gemini API
