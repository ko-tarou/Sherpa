# Sherpa バックエンド API 仕様書

Android アプリおよび Web フロントエンドから共通で利用する REST API の仕様です。

---

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| **ベースURL** | 開発: `http://localhost:3001` / 本番: デプロイ先のホスト |
| **API プレフィックス** | すべて `/api` 配下（例: `/api/events`） |
| **Content-Type** | リクエスト・レスポンスとも `application/json` |
| **文字コード** | UTF-8 |
| **日時形式** | RFC3339（例: `2025-02-03T10:00:00Z`） |

### 1.1 CORS

- すべてのオリジンから許可（`Access-Control-Allow-Origin: *`）
- 許可メソッド: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
- 許可ヘッダー: `Content-Type`, `Authorization`, `X-Admin-Key` など

### 1.2 認証が必要なエンドポイント

以下のいずれかで認証します。

- **Authorization ヘッダー**: `Authorization: Bearer <JWT>`  
  - ログイン後に取得した JWT を付与。Android ではトークンを安全に保存し、各リクエストに付与すること。

---

## 2. エラーレスポンス

エラー時は HTTP ステータスコード 4xx/5xx とともに JSON で `error` が返ります。

```json
{
  "error": "エラーメッセージ（文字列）"
}
```

| HTTP | 意味 |
|------|------|
| 400 | Bad Request（パラメータ不正・バリデーションエラー） |
| 401 | Unauthorized（未認証 or トークン無効） |
| 403 | Forbidden（権限不足） |
| 404 | Not Found（リソース不存在） |
| 500 | Internal Server Error（サーバーエラー） |

---

## 3. 共通データ型・列挙値

### 3.1 イベント

- **EventStatus**: `"draft"` | `"published"` | `"ongoing"` | `"completed"` | `"cancelled"`

### 3.2 タスク

- **TaskStatus**: `"todo"` | `"in_progress"` | `"completed"` | `"cancelled"`

### 3.3 予算

- **BudgetType**: `"income"` | `"expense"`

### 3.4 招待

- **InvitationStatus**: `"pending"` | `"accepted"` | `"declined"`

### 3.5 日時

- すべて **RFC3339** 文字列（例: `2025-02-03T09:00:00+09:00`）

---

## 4. エンドポイント一覧

### 4.1 ヘルスチェック（認証不要）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/health` | サーバー稼働確認 |

**レスポンス例 (200)**

```json
{
  "status": "ok",
  "message": "Sherpa Backend API is running"
}
```

---

### 4.2 認証（Auth）

#### 4.2.1 Google OAuth 開始（ブラウザ/WebView/Android 用）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/auth/google` | Google ログイン画面へリダイレクト。Cookie で state を保持するため、**ブラウザ/WebView で開く必要あり**（同一オリジンで Cookie が使えること）。 |

- レスポンス: 302 で Google の認証 URL へリダイレクト
- **Android 用**: `?redirect_uri=sherpa://auth/callback` を付与すると、認証成功後に `sherpa://auth/callback?token=<JWT>` へリダイレクトされる。Android アプリはこの URL を Intent で受信し、トークンを保存して API に `Authorization: Bearer <token>` を付与する。

#### 4.2.2 OAuth コールバック（サーバー側・ブラウザ用）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/auth/callback?code=...&state=...` | Google 認証後のコールバック。成功時は `FRONTEND_URL/auth/callback?token=<JWT>` へリダイレクト。 |

- **Android**: カスタムスキームや App Links で `auth/callback?token=xxx` を受け取り、`token` を保存して以降の API で `Authorization: Bearer <token>` に使用する。

#### 4.2.3 現在のユーザー取得（JWT 不要だがトークンがあればユーザー情報を返す）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/auth/me` | リクエストの JWT から現在のユーザーを返す。**要認証（Authorization: Bearer）**。 |

**レスポンス例 (200)**

```json
{
  "user": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "avatar_url": "https://...",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**User オブジェクト**

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | number | ユーザーID |
| name | string | 表示名 |
| email | string | メールアドレス |
| avatar_url | string \| null | アバターURL（任意） |
| created_at | string | 作成日時 (RFC3339) |
| updated_at | string | 更新日時 (RFC3339) |

---

### 4.3 イベント（Events）

#### 4.3.1 イベント一覧取得

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/events` | 不要 |

**レスポンス (200)**

```json
{
  "events": [
    {
      "id": 1,
      "organization_id": 1,
      "title": "技術勉強会",
      "start_at": "2025-03-01T10:00:00Z",
      "end_at": "2025-03-01T12:00:00Z",
      "location": "東京都渋谷区",
      "status": "draft",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "organization": { "id": 1, "name": "...", "description": null }
    }
  ]
}
```

#### 4.3.2 イベント詳細取得

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/events/:id` | 不要 |

- **パスパラメータ**: `id` — イベントID（数値）

**レスポンス (200)**  
イベント単体 + Organization, EventStaffs.User, Tasks（Assignees.User 含む）, Budgets を Preload した形で返却。

```json
{
  "event": {
    "id": 1,
    "organization_id": 1,
    "title": "技術勉強会",
    "start_at": "2025-03-01T10:00:00Z",
    "end_at": "2025-03-01T12:00:00Z",
    "location": "東京都渋谷区",
    "status": "draft",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "organization": { ... },
    "event_staffs": [ { "id": 1, "event_id": 1, "user_id": 1, "role": "Admin", "user": { ... } } ],
    "tasks": [ ... ],
    "budgets": [ ... ]
  }
}
```

#### 4.3.3 イベント作成

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/events` | 不要 |

**リクエスト Body**

```json
{
  "organization_id": 1,
  "title": "技術勉強会",
  "start_at": "2025-03-01T10:00:00Z",
  "end_at": "2025-03-01T12:00:00Z",
  "location": "東京都渋谷区",
  "status": "draft",
  "user_id": 1
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| organization_id | number | ○ | 組織ID |
| title | string | ○ | タイトル |
| start_at | string | ○ | 開始日時 (RFC3339) |
| end_at | string | ○ | 終了日時 (RFC3339) |
| location | string | - | 場所 |
| status | string | - | 上記 EventStatus。省略時は `draft` |
| user_id | number | - | 作成者ユーザーID。指定時は EventStaff として Admin で登録 |

**レスポンス (201)**

```json
{
  "event": { "id": 2, "organization_id": 1, "title": "...", ... }
}
```

#### 4.3.4 イベント更新

| メソッド | パス | 認証 |
|----------|------|------|
| PUT | `/api/events/:id` | 不要 |

**リクエスト Body**  
更新したいフィールドを Event オブジェクトの形で送る（部分更新ではなくモデル単位で送る実装のため、必要なら現状の event を取得してから変更して PUT）。

- 例: `title`, `start_at`, `end_at`, `location`, `status` など

**レスポンス (200)**  
更新後の `event` オブジェクト。

#### 4.3.5 イベント削除

| メソッド | パス | 認証 |
|----------|------|------|
| DELETE | `/api/events/:id` | 不要 |

**レスポンス (200)**

```json
{
  "message": "Event deleted successfully"
}
```

#### 4.3.6 イベント用チャット（AI イベント作成アシスタント）

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/events/create-chat` | 不要 |

**リクエスト Body**

```json
{
  "message": "3月に勉強会をやりたい",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

- `history`: 省略可。空配列でよい。

**レスポンス (200)**

```json
{
  "reply": "AIの返答テキスト",
  "suggestedEvent": {
    "title": "技術勉強会",
    "start_at": "2025-03-01T10:00:00Z",
    "end_at": "2025-03-01T12:00:00Z",
    "location": "東京都渋谷区"
  }
}
```

- `suggestedEvent` は、AI がイベント案を確定した場合のみ含まれる。ない場合はキーごと無し。

---

### 4.4 タスク（Tasks）

#### 4.4.1 タスク一覧取得

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/events/:id/tasks` | 不要 |

- **パスパラメータ**: `id` — イベントID

**レスポンス (200)**

```json
{
  "tasks": [
    {
      "id": 1,
      "event_id": 1,
      "assignee_id": null,
      "title": "会場予約",
      "link": "",
      "links": [],
      "start_at": null,
      "deadline": "2025-02-10T23:59:59Z",
      "recurrence": null,
      "status": "todo",
      "is_ai_generated": false,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "assignee": null,
      "assignees": [
        { "task_id": 1, "user_id": 2, "user": { "id": 2, "name": "...", "email": "..." } }
      ]
    }
  ]
}
```

**Task オブジェクト**

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | number | タスクID |
| event_id | number | イベントID |
| assignee_id | number \| null | 単一担当者（後方互換） |
| title | string | タイトル |
| link | string | リンク（1本） |
| links | string[] | リンク複数 |
| start_at | string \| null | 開始日時 (RFC3339) |
| deadline | string | 締切 (RFC3339) |
| recurrence | object \| null | 繰り返しルール（下記） |
| status | string | TaskStatus |
| is_ai_generated | boolean | AI 生成フラグ |
| created_at / updated_at | string | 日時 |
| assignee | User \| null | 単一担当者（後方互換） |
| assignees | TaskAssignee[] | 担当者一覧（user を Preload） |

**RecurrenceRule**

```json
{
  "type": "weekly",
  "weekdays": [1, 3, 5],
  "start_time": "09:00",
  "end_time": "17:00"
}
```

- `type`: `"weekly"` | `"daily"` | `"monthly"`
- `weekdays`: 0=日..6=土

#### 4.4.2 タスク作成

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/events/:id/tasks` | 不要 |

- **パスパラメータ**: `id` — イベントID

**リクエスト Body**

```json
{
  "title": "会場予約",
  "link": "https://...",
  "links": ["https://..."],
  "start_at": "2025-02-01T09:00:00Z",
  "deadline": "2025-02-10T23:59:59Z",
  "recurrence": null,
  "status": "todo",
  "is_ai_generated": false,
  "assignee_ids": [1, 2]
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| title | string | - | タイトル |
| link | string | - | リンク1本 |
| links | string[] | - | リンク複数 |
| start_at | string | - | 開始日時 (RFC3339) |
| deadline | string | ○ | 締切 (RFC3339) |
| recurrence | RecurrenceRule | - | 繰り返し |
| status | string | - | 省略時 `todo` |
| is_ai_generated | boolean | - | デフォルト false |
| assignee_ids | number[] | - | 担当者ユーザーIDの配列 |

**レスポンス (201)**  
作成された `task`（assignee / assignees 含む）。

#### 4.4.3 タスク更新

| メソッド | パス | 認証 |
|----------|------|------|
| PUT | `/api/tasks/:id` | 不要 |

- **パスパラメータ**: `id` — タスクID

**リクエスト Body**  
更新したい項目のみ送る（未指定は変更しない）。

```json
{
  "title": "会場予約（更新）",
  "link": "https://...",
  "links": [],
  "start_at": null,
  "deadline": "2025-02-15T23:59:59Z",
  "recurrence": null,
  "status": "in_progress",
  "assignee_ids": [1]
}
```

- 各フィールドは任意。`assignee_ids` を送るとその内容で担当者を置き換え。

**レスポンス (200)**  
更新後の `task`。

#### 4.4.4 タスク削除

| メソッド | パス | 認証 |
|----------|------|------|
| DELETE | `/api/tasks/:id` | 不要 |

**レスポンス (200)**

```json
{
  "message": "Task deleted successfully"
}
```

#### 4.4.5 AI タスク生成（提案のみ・DB には保存しない）

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/tasks/generate` | 不要 |

**リクエスト Body**

```json
{
  "eventTitle": "技術勉強会 2025"
}
```

**レスポンス (200)**

```json
{
  "tasks": [
    { "title": "会場の手配", "deadline": "2週間前" },
    { "title": "資料準備", "deadline": "1週間前" }
  ]
}
```

- `tasks` の各要素は **TaskSuggestion**（title / deadline のみ）。deadline は日本語表現のことがある（「残り2日」「本日締め切り」等）。実際にタスクとして登録する場合は、フロント/Android で `/api/events/:id/tasks` に POST すること。

---

### 4.5 予算（Budgets）

#### 4.5.1 予算一覧取得

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/events/:id/budgets` | 不要 |

**レスポンス (200)**

```json
{
  "budgets": [
    {
      "id": 1,
      "event_id": 1,
      "category": "会場費",
      "type": "expense",
      "planned_amount": 50000,
      "actual_amount": 0,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

- **type**: `"income"` | `"expense"`

#### 4.5.2 予算作成

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/events/:id/budgets` | 不要 |

**リクエスト Body**

```json
{
  "category": "会場費",
  "type": "expense",
  "planned_amount": 50000,
  "actual_amount": 0
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| category | string | ○ | カテゴリ名 |
| type | string | ○ | `"income"` \| `"expense"` |
| planned_amount | number | - | 予定金額（デフォルト 0） |
| actual_amount | number | - | 実績金額（デフォルト 0） |

**レスポンス (201)**  
作成された `budget`。

#### 4.5.3 予算更新

| メソッド | パス | 認証 |
|----------|------|------|
| PUT | `/api/budgets/:id` | 不要 |

**リクエスト Body**  
更新したい項目のみ。

```json
{
  "category": "会場費（更新）",
  "type": "expense",
  "planned_amount": 60000,
  "actual_amount": 55000
}
```

**レスポンス (200)**  
更新後の `budget`。

#### 4.5.4 予算削除

| メソッド | パス | 認証 |
|----------|------|------|
| DELETE | `/api/budgets/:id` | 不要 |

**レスポンス (200)**

```json
{
  "ok": true
}
```

---

### 4.6 ユーザー（Users）

#### 4.6.1 ユーザー作成

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/users` | 不要 |

**リクエスト Body**

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com"
}
```

- 同一 email が既にいると 400（「このメールアドレスは既に登録されています」）。

**レスポンス (201)**  
作成された `user`。デフォルト組織にも追加される。

#### 4.6.2 ユーザー検索（認証必須）

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/users/search?q=検索文字列` | **要 Bearer** |

- **クエリ**: `q` — 名前またはメールの部分一致（最大30件）。

**レスポンス (200)**

```json
{
  "users": [
    { "id": 1, "name": "山田太郎", "email": "yamada@example.com", ... }
  ]
}
```

#### 4.6.3 ユーザー詳細取得

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/users/:id` | 不要 |

**レスポンス (200)**  
`user` 単体。

#### 4.6.4 ユーザーの参加イベント一覧

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/users/:id/events` | 不要 |

- EventStaff として参加しているイベントのみ返却。

**レスポンス (200)**

```json
{
  "events": [ { "id": 1, "title": "...", ... } ]
}
```

---

### 4.7 招待・通知（認証必須）

いずれも **Authorization: Bearer &lt;JWT&gt;** 必須。

#### 4.7.1 招待可能ユーザー一覧（イベント Admin 用）

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/events/:id/invitable-users` | **要 Bearer** |

- 同一組織内で、未参加・未招待のユーザー。呼び出しユーザーがイベント Admin である必要あり。

**レスポンス (200)**  
`users` 配列。

#### 4.7.2 イベントの招待一覧（Admin 用）

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/events/:id/invitations` | **要 Bearer** |

**レスポンス (200)**

```json
{
  "invitations": [
    {
      "id": 1,
      "event_id": 1,
      "inviter_id": 1,
      "user_id": 2,
      "role": "Staff",
      "status": "pending",
      "created_at": "...",
      "updated_at": "...",
      "user": { ... },
      "inviter": { ... }
    }
  ]
}
```

#### 4.7.3 招待作成

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/events/:id/invitations` | **要 Bearer** |

**リクエスト Body**  
`user_id` または `email` のどちらか必須。

```json
{
  "user_id": 2,
  "email": "",
  "role": "Staff"
}
```

- **role**: 例 `"Admin"`, `"Staff"`, `"Sponsor"` など。

**レスポンス (201)**  
作成された `invitation`（user / inviter Preload）。

#### 4.7.4 招待承諾

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/invitations/:id/accept` | **要 Bearer** |

- 招待の宛先ユーザー本人のみ実行可。

**レスポンス (200)**

```json
{
  "invitation": { ... },
  "event_staff": { "id": 1, "event_id": 1, "user_id": 2, "role": "Staff", ... }
}
```

#### 4.7.5 招待辞退

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/invitations/:id/decline` | **要 Bearer** |

**レスポンス (200)**  
更新後の `invitation`。

#### 4.7.6 未承諾招待一覧（自分あて）

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/invitations/mine` | **要 Bearer** |

**レスポンス (200)**  
`invitations` 配列（status: pending、Event / Inviter Preload）。

#### 4.7.7 通知一覧

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/notifications` | **要 Bearer** |

**レスポンス (200)**

```json
{
  "notifications": [
    {
      "id": 1,
      "user_id": 1,
      "type": "event_invite",
      "title": "イベントへの招待",
      "body": "山田 さんから「技術勉強会」への招待が届きました。",
      "related_id": 1,
      "related_type": "event_invitation",
      "read_at": null,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

- 直近100件、`created_at` 降順。

#### 4.7.8 未読通知件数

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/notifications/unread-count` | **要 Bearer** |

**レスポンス (200)**

```json
{
  "count": 3
}
```

#### 4.7.9 通知を既読にする

| メソッド | パス | 認証 |
|----------|------|------|
| PATCH | `/api/notifications/:id/read` | **要 Bearer** |

- Body は不要（空でよい）。自分の通知のみ既読にできる。

**レスポンス (200)**  
更新後の `notification`（read_at がセットされたもの）。

---

### 4.8 チャンネル・メッセージ（認証必須）

いずれも **Authorization: Bearer &lt;JWT&gt;** 必須。イベントに紐づくチャンネルで、Slack 風のチャット機能を提供。

#### 4.8.1 チャンネル一覧

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/events/:id/channels` | **要 Bearer** |

- チャンネルが0件の場合は「#全体」が自動作成され、スタッフがメンバーになる。

**レスポンス (200)**

```json
{
  "channels": [
    {
      "id": 1,
      "event_id": 1,
      "name": "#全体",
      "description": "このチャンネルは...",
      "is_private": false,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

#### 4.8.2 チャンネル作成（イベント Admin 用）

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/events/:id/channels` | **要 Bearer** |

**リクエスト Body**

```json
{
  "name": "general",
  "description": "雑談用",
  "is_private": false
}
```

- `name` に `#` が無い場合はサーバー側で先頭に付与。

**レスポンス (201)**  
作成された `channel`。作成者は自動でメンバーになる。

#### 4.8.3 チャンネル更新（Admin 用）

| メソッド | パス | 認証 |
|----------|------|------|
| PATCH | `/api/channels/:id` | **要 Bearer** |

**リクエスト Body**  
更新したい項目のみ。

```json
{
  "name": "#general",
  "description": "説明文",
  "is_private": false
}
```

**レスポンス (200)**  
更新後の `channel`。

#### 4.8.4 チャンネル削除（Admin 用）

| メソッド | パス | 認証 |
|----------|------|------|
| DELETE | `/api/channels/:id` | **要 Bearer** |

- 「#全体」は削除不可（400 でエラー）。

**レスポンス (200)**  
`{ "ok": true }`。

#### 4.8.5 チャンネルメンバー一覧

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/channels/:id/members` | **要 Bearer** |

**レスポンス (200)**  
`members` 配列（ChannelMember、User Preload）。

#### 4.8.6 チャンネルにメンバー追加（Admin 用）

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/channels/:id/members` | **要 Bearer** |

**リクエスト Body**

```json
{
  "user_id": 2
}
```

- 対象ユーザーはイベントスタッフである必要あり。

**レスポンス (201)**  
追加された `member`。

#### 4.8.7 チャンネルからメンバー削除（Admin 用）

| メソッド | パス | 認証 |
|----------|------|------|
| DELETE | `/api/channels/:id/members/:userId` | **要 Bearer** |

- **パス**: `userId` は削除するユーザーID（数値）。

**レスポンス (200)**  
`{ "ok": true }`。

#### 4.8.8 メッセージ一覧取得

| メソッド | パス | 認証 |
|----------|------|------|
| GET | `/api/channels/:id/messages` | **要 Bearer** |

- 親メッセージのみ（スレッドの子は含まない）。最大100件、`created_at` 昇順。

**レスポンス (200)**

```json
{
  "messages": [
    {
      "id": 1,
      "channel_id": 1,
      "user_id": 1,
      "content": "こんにちは",
      "parent_message_id": null,
      "created_at": "...",
      "updated_at": "...",
      "is_deleted": false,
      "user": { "id": 1, "name": "...", "email": "..." },
      "reactions": [
        { "id": 1, "message_id": 1, "user_id": 2, "emoji": "👍", "user": { ... } }
      ]
    }
  ]
}
```

#### 4.8.9 メッセージ送信

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/channels/:id/messages` | **要 Bearer** |

- イベントスタッフのみ投稿可。

**リクエスト Body**

```json
{
  "content": "メッセージ本文"
}
```

**レスポンス (201)**  
作成された `message`（user Preload）。同一チャンネルには WebSocket でも配信される。

#### 4.8.10 メッセージ編集（投稿者のみ）

| メソッド | パス | 認証 |
|----------|------|------|
| PATCH | `/api/messages/:id` | **要 Bearer** |

**リクエスト Body**

```json
{
  "content": "編集後の本文"
}
```

**レスポンス (200)**  
更新後の `message`。WebSocket で `message_updated` が配信される。

#### 4.8.11 メッセージ削除（投稿者のみ・論理削除）

| メソッド | パス | 認証 |
|----------|------|------|
| DELETE | `/api/messages/:id` | **要 Bearer** |

**レスポンス (200)**  
`{ "ok": true }`。WebSocket で `message_deleted` が配信される。

#### 4.8.12 リアクション追加/削除（トグル）

| メソッド | パス | 認証 |
|----------|------|------|
| POST | `/api/messages/:id/reactions` | **要 Bearer** |

**リクエスト Body**

```json
{
  "emoji": "👍"
}
```

- `emoji` 省略時は `"👍"`。既に同じユーザーが同じ絵文字でつけていれば削除、なければ追加。

**レスポンス (200)**  
追加時: `{ "action": "added", "reaction": { "id": 1, "message_id": 1, "user_id": 2, "emoji": "👍", ... } }`  
削除時: `{ "action": "removed", "emoji": "👍" }`。WebSocket で `reaction` イベントが配信される。

---

## 5. WebSocket（リアルタイム）

チャットの新着メッセージ・編集・削除・リアクション、およびカレンダー（タスク/イベント）更新をリアルタイムで受け取るために WebSocket を利用する。

### 5.1 接続

- **URL**: `GET /api/ws?token=<JWT>`
- **プロトコル**: 通常の HTTP から WebSocket へアップグレード。クエリ `token` に **JWT** を渡す（Android ではログイン済みの Bearer トークンと同じ値）。
- トークン未指定・無効の場合は 401 JSON `{ "error": "token required" }` または `{ "error": "invalid token" }`。

### 5.2 クライアント → サーバー（送信）

JSON 1行で送る。共通フォーマット:

```json
{
  "type": "join",
  "channel_id": 1,
  "event_id": 0,
  "user_name": ""
}
```

| type | 説明 | 必要なフィールド |
|------|------|-------------------|
| join | チャンネルに参加（メッセージ配信を受け取る） | `channel_id` |
| leave | チャンネルから離脱 | `channel_id` |
| join_calendar | イベントのカレンダー更新を受け取る | `event_id` |
| leave_calendar | カレンダー購読解除 | `event_id` |
| typing | 入力中通知 | `channel_id`, `user_name`（任意） |
| typing_stop | 入力停止 | `channel_id` |

### 5.3 サーバー → クライアント（受信）

いずれも JSON テキストで1メッセージ。

**共通エンベロープ（メッセージ配信）**

```json
{
  "type": "message",
  "message": { ... }
}
```

- `type: "message"` のとき、`message` は新規投稿された Message オブジェクト（id, channel_id, user_id, content, user など）。

**汎用イベント**

```json
{
  "type": "message_updated",
  "payload": { ... }
}
```

```json
{
  "type": "message_deleted",
  "payload": { "message_id": 1, "channel_id": 1 }
}
```

```json
{
  "type": "reaction",
  "payload": { "message_id": 1, "channel_id": 1, "user_id": 2, "emoji": "👍", "action": "remove" }
}
```

- 追加時は `payload` に Reaction オブジェクトが入る場合あり。

**タイピング**

```json
{
  "type": "typing",
  "payload": {
    "user_id": 1,
    "user_name": "山田",
    "typing": true
  }
}
```

**カレンダー更新**

```json
{
  "type": "calendar_update",
  "payload": {}
}
```

- イベントのタスクやイベント情報が更新されたときに、そのイベントを `join_calendar` しているクライアントに送られる。中身は空なので、アプリ側で必要なら該当イベントのデータを再取得する。

**エラー**

```json
{
  "type": "error",
  "error": "channel_id required"
}
```

---

## 6. 管理者 API（本ドキュメント外）

- プレフィックス: `/api/admin`
- 認証: ヘッダー `X-Admin-Key` または `Authorization: Bearer <ADMIN_API_KEY>`
- 主な用途: 全イベント一覧、バッチ実行（論理削除チャンネル物理削除など）

Android アプリからは通常利用しないため、ここではエンドポイントの列挙のみとする。

- `GET /api/admin/events` — 全イベント一覧
- `POST /api/admin/batch/run` — バッチ実行

---

## 7. Android 実装時の注意

1. **ベースURL**  
   ビルドフレーバーや BuildConfig で開発/本番のベースURLを切り替えるとよい。

2. **認証**  
   - Google ログインは WebView または Chrome Custom Tabs で `/api/auth/google` を開き、リダイレクト先の `auth/callback?token=xxx` から JWT を取得。
   - 取得した JWT は Secure な保存（例: EncryptedSharedPreferences）に格納し、各 API リクエストの `Authorization: Bearer <token>` に付与する。

3. **日時**  
   - 送受信とも RFC3339 文字列。Android では `Instant` / `ZonedDateTime` と相互変換する。

4. **エラー処理**  
   - レスポンスが 4xx/5xx のときは body の `error` をパースしてユーザーに表示する。

5. **WebSocket**  
   - OkHttp の `WebSocket` や Jetpack の推奨ライブラリで `/api/ws?token=<JWT>` に接続。  
   - 受信 JSON の `type` に応じて UI 更新（新着メッセージ表示・カレンダー再取得など）を行う。

---

## 8. 変更履歴

- 初版: イベント・タスク・予算・ユーザー・認証・招待・通知・チャンネル・メッセージ・WebSocket を記載。
