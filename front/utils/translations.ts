import type { LangCode } from './language';

export const translations: Record<LangCode, Record<string, string>> = {
  ja: {
    // Common
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    close: '閉じる',
    send: '送信',
    add: '追加',
    edit: '編集',
    loading: '読み込み中...',
    notifications: '通知',
    settings: '設定',
    language: '言語',
    logout: 'ログアウト',

    // Nav
    dashboard: 'ダッシュボード',
    tasks: 'タスク',
    budget: '予算',
    team: 'チーム',
    chat: 'チャット',
    createEvent: '新規イベント作成',
    eventSelect: 'イベント選択',
    eventSettings: 'イベント設定',

    // Dashboard
    budgetStatus: '予算状況',
    expenseBudgetActual: '支出（予算 / 実績）',
    viewAll: 'すべて見る',
    totalStaff: '総スタッフ数',
    staffCount: '人',

    // Tasks
    taskManagement: 'タスク管理',
    newTask: '新規タスク',
    taskPlaceholder: 'タスク名を入力',
    deadline: '締め切り',
    aiTaskGenerate: 'AIタスク生成',
    generating: '生成中...',
    noTasks: 'タスクがありません',
    topPriority: '最優先タスク',
    aiTaskSuggestion: 'AIタスク提案',
    dropHere: 'ここにドロップ',
    deleteCompleted: '完了タスクの削除',
    deleteCompletedConfirm: '完了のタスク {count} 件を削除しますか？',
    todo: '未着手',
    inProgress: '進行中',
    completed: '完了',

    // Budget
    budgetSummary: '予算サマリー',
    budgetIncome: '予算',
    category: 'カテゴリ',
    type: '区分',
    planned: '予算額 (PLANNED)',
    actual: '実績額 (ACTUAL)',
    diff: '差分 (DIFF)',
    addItem: '項目を追加',
    income: '収入',
    balance: '残高（収入 − 支出）',
    expenditureRate: '支出消化率',

    // Team
    teamList: 'チーム・関係者一覧',
    invite: '招待を送る',
    inviting: '送信中...',

    // Chat
    chatRoom: 'チャットルーム',
    channelSettings: 'チャンネル設定',
    messagePlaceholder: '{channel}へのメッセージを送信...',
    sendHint: 'Enterで送信 / Shift+Enterで改行',
    noNotifications: '通知はありません',
    typing: 'が入力中...',

    // Event
    eventSettingsTitle: 'イベント設定',
    status: 'ステータス',
    titleRequired: 'タイトル',
    eventName: 'イベント名',
    startDateTime: '開始日時',
    endDateTime: '終了日時',
    selectDateTime: '日時を選択',
    location: '場所',
    locationPlaceholder: '会場・住所（任意）',
    updating: '更新中...',
    update: '更新',
    deleteEvent: 'イベントを削除',
    deleteEventConfirm: 'このイベントを削除しますか？',
    deleteEventDesc: '削除すると元に戻せません。',
    cannotUndo: 'この操作は取り消せません。',
    deleting: '削除中...',
    errTitleRequired: 'タイトルは必須です',
    errDatetimeRequired: '開始日時・終了日時は必須です',
    errEndAfterStart: '終了日時は開始日時より後にしてください',
    draft: '下書き',
    published: '公開済み',
    ongoing: '開催中',
    ended: '終了',
    cancelled: 'キャンセル',
  },
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    close: 'Close',
    send: 'Send',
    add: 'Add',
    edit: 'Edit',
    loading: 'Loading...',
    notifications: 'Notifications',
    settings: 'Settings',
    language: 'Language',
    logout: 'Log out',

    // Nav
    dashboard: 'Dashboard',
    tasks: 'Tasks',
    budget: 'Budget',
    team: 'Team',
    chat: 'Chat',
    createEvent: 'Create Event',
    eventSelect: 'Select Event',
    eventSettings: 'Event Settings',

    // Dashboard
    budgetStatus: 'Budget Status',
    expenseBudgetActual: 'Expense (Planned / Actual)',
    expenditureRate: 'Expenditure Rate',
    viewAll: 'View All',
    totalStaff: 'Total Staff',
    staffCount: '',
    reservedTickets: 'Reserved Tickets',
    statusLabel: 'Status',

    // Tasks
    taskManagement: 'Task Management',
    newTask: 'New Task',
    taskPlaceholder: 'Enter task name',
    deadline: 'Deadline',
    aiTaskGenerate: 'AI Task Generation',
    generating: 'Generating...',
    noTasks: 'No tasks',
    topPriority: 'Top Priority Tasks',
    aiTaskSuggestion: 'AI Task Suggestions',
    dropHere: 'Drop here',
    deleteCompleted: 'Delete Completed Tasks',
    deleteCompletedConfirm: 'Delete {count} completed task(s)?',
    todo: 'To Do',
    inProgress: 'In Progress',
    completed: 'Completed',

    // Budget
    budgetSummary: 'Budget Summary',
    budgetIncome: 'Budget',
    category: 'Category',
    type: 'Type',
    planned: 'Planned',
    actual: 'Actual',
    diff: 'Diff',
    addItem: 'Add Item',
    income: 'Income',
    balance: 'Balance (Income − Expense)',

    // Team
    teamList: 'Team & Stakeholders',
    invite: 'Send Invite',
    inviting: 'Sending...',

    // Chat
    chatRoom: 'Chat Room',
    channelSettings: 'Channel Settings',
    messagePlaceholder: 'Send a message to {channel}...',
    sendHint: 'Enter to send / Shift+Enter for new line',
    noNotifications: 'No notifications',
    typing: ' typing...',

    // Event
    eventSettingsTitle: 'Event Settings',
    status: 'Status',
    titleRequired: 'Title',
    eventName: 'Event name',
    startDateTime: 'Start date/time',
    endDateTime: 'End date/time',
    selectDateTime: 'Select date/time',
    location: 'Location',
    locationPlaceholder: 'Venue or address (optional)',
    updating: 'Updating...',
    update: 'Update',
    deleteEvent: 'Delete event',
    deleteEventConfirm: 'Are you sure you want to delete this event?',
    deleteEventDesc: 'This action cannot be undone.',
    cannotUndo: 'This action cannot be undone.',
    deleting: 'Deleting...',
    errTitleRequired: 'Title is required',
    errDatetimeRequired: 'Start and end date/time are required',
    errEndAfterStart: 'End date/time must be after start date/time',
    draft: 'Draft',
    published: 'Published',
    ongoing: 'Ongoing',
    ended: 'Ended',
    cancelled: 'Cancelled',
  },
};

export function t(lang: LangCode, key: string, params?: Record<string, string | number>): string {
  let str = translations[lang]?.[key] ?? translations.ja[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}
