
// バックエンドAPIの型定義

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  organization_id: number;
  title: string;
  start_at: string;
  end_at: string;
  location?: string;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  organization?: Organization;
  tasks?: Task[];
  budgets?: Budget[];
}

export interface Task {
  id: number;
  event_id: number;
  assignee_id?: number;
  title: string;
  deadline: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
  assignee?: User;
}

export interface Budget {
  id: number;
  event_id: number;
  category: string;
  type: 'income' | 'expense';
  planned_amount: number;
  actual_amount: number;
  created_at: string;
  updated_at: string;
}

export interface EventStaff {
  id: number;
  event_id: number;
  user_id: number;
  role: string;
  user?: User;
}

export interface Ticket {
  id: number;
  event_id: number;
  name: string;
  price: number;
}

export interface EventParticipant {
  id: number;
  ticket_id: number;
  user_id: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  user?: User;
}

export interface Channel {
  id: number;
  event_id: number;
  name: string;
  description?: string;
  is_private: boolean;
  created_at: string;
}

export interface Message {
  id: number;
  channel_id: number;
  user_id: number;
  content: string;
  parent_message_id?: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  user?: User;
}

// フロントエンド用のヘルパー型
export interface EventData {
  event: Event;
  countdownDays: number;
  totalBudget: {
    planned: number;
    actual: number;
  };
}

export enum NavItemType {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  BUDGET = 'BUDGET',
  TEAM = 'TEAM',
  CHAT = 'CHAT'
}
