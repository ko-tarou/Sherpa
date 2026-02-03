# Sherpa Event Manager — NotebookLM Source

## プロダクト概要
- イベント管理用のフルスタック Web アプリケーション。
- Web フロント、バックエンド、管理者用アプリが同一リポジトリに含まれる。
- Android アプリも同一バックエンド API を利用する想定。

## リポジトリ構成（README.md）
- `front/`: Web フロントエンド（React + Vite + TypeScript）
- `back/`: バックエンド（Go + Gin + PostgreSQL）
- `admin/`: 管理者用アプリ（React + Vite）

## 管理者アプリの役割（README.md）
- 全イベントの状態を表で確認・検索・ソート
- 論理削除チャンネルの物理削除バッチを手動実行
- `ADMIN_API_KEY` による認証

## API 基本情報（API.md）
- ベースURL: 開発 `http://localhost:3001`
- API プレフィックス: `/api`
- Content-Type: `application/json`
- 日時形式: RFC3339

## 認証（API.md）
- JWT を `Authorization: Bearer <JWT>` で付与
- Google OAuth:
  - `/api/auth/google` で認証開始（ブラウザ/ WebView で開く）
  - `/api/auth/callback` が認証後のコールバック
  - Android は `sherpa://auth/callback?token=<JWT>` などのカスタムスキームで受け取り想定

## 主要エンドポイント（API.md / back/cmd/server/main.go）
- ヘルスチェック: `GET /api/health`
- 認証: `GET /api/auth/google`, `GET /api/auth/callback`, `GET /api/auth/me`
- イベント: `GET /api/events`, `POST /api/events`, `GET /api/events/:id`, `PUT /api/events/:id`, `DELETE /api/events/:id`
- タスク: `GET /api/events/:id/tasks`, `POST /api/events/:id/tasks`, `PUT /api/tasks/:id`, `DELETE /api/tasks/:id`, `POST /api/tasks/generate`
- 予算: `GET /api/events/:id/budgets`, `POST /api/events/:id/budgets`, `PUT /api/budgets/:id`, `DELETE /api/budgets/:id`
- ユーザー: `POST /api/users`, `GET /api/users/:id`, `GET /api/users/:id/events`, `GET /api/users/search`
- 招待/通知: `GET /api/events/:id/invitable-users`, `GET /api/events/:id/invitations`,
  `POST /api/events/:id/invitations`, `POST /api/invitations/:id/accept`,
  `POST /api/invitations/:id/decline`, `GET /api/invitations/mine`,
  `GET /api/notifications`, `GET /api/notifications/unread-count`,
  `PATCH /api/notifications/:id/read`
- チャット/チャンネル:
  `GET /api/events/:id/channels`, `POST /api/events/:id/channels`,
  `GET /api/channels/:id/messages`, `POST /api/channels/:id/messages`,
  `PATCH /api/messages/:id`, `DELETE /api/messages/:id`,
  `POST /api/messages/:id/reactions`,
  `PATCH /api/channels/:id`, `DELETE /api/channels/:id`,
  `GET /api/channels/:id/members`, `POST /api/channels/:id/members`,
  `DELETE /api/channels/:id/members/:userId`
- WebSocket: `GET /api/ws`（チャット用）

## 共通データ型（API.md）
- EventStatus: `draft` | `published` | `ongoing` | `completed` | `cancelled`
- TaskStatus: `todo` | `in_progress` | `completed` | `cancelled`
- BudgetType: `income` | `expense`
- InvitationStatus: `pending` | `accepted` | `declined`

## エラーレスポンス（API.md）
- JSON `{ "error": "..." }` で返却
- HTTP: 400 / 401 / 403 / 404 / 500
