export interface AdminEventRow {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  location: string;
  status: string;
  staff_count: number;
  task_todo: number;
  task_in_progress: number;
  task_completed: number;
  channel_count: number;
  created_at: string;
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  published: '公開済み',
  ongoing: '開催中',
  completed: '完了',
  cancelled: 'キャンセル',
};
