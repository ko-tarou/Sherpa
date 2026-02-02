-- タスク拡張: リンク、開始日、周期、複数担当者

-- 新規カラム追加
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS links JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence JSONB;

CREATE INDEX IF NOT EXISTS idx_tasks_start_at ON tasks(start_at);

-- 担当者多対多テーブル
CREATE TABLE IF NOT EXISTS task_assignees (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
