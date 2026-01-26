# Sherpa Event Manager

イベント管理用のフルスタックWebアプリケーションです。

## プロジェクト構造

```
Sherpa/
├── front/          # フロントエンド (React + Vite + TypeScript)
├── back/           # バックエンド (Express + TypeScript)
└── package.json    # モノレポ管理用
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
# フロントエンドのみ (http://localhost:3000)
npm run dev:front

# バックエンドのみ (http://localhost:3001)
npm run dev:back
```

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
