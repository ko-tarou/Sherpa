
export interface Task {
  id: string;
  title: string;
  deadline: string;
  isPriority: boolean;
  completed: boolean;
}

export interface Budget {
  planned: number;
  actual: number;
}

export interface EventData {
  title: string;
  countdownDays: number;
  tasks: Task[];
  budget: Budget;
}

export enum NavItemType {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  BUDGET = 'BUDGET',
  TEAM = 'TEAM',
  CHAT = 'CHAT'
}
