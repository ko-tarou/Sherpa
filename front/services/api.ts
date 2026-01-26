import { Event, Task, Budget, EventStaff, Ticket, EventParticipant, Channel, Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// APIエラークラス
export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

// 共通のfetch関数
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new APIError(response.status, error.error || response.statusText);
  }

  return response.json();
}

export const apiClient = {
  // イベント関連
  async getEvents(): Promise<{ events: Event[] }> {
    return fetchAPI('/api/events');
  },

  async getEvent(id: number): Promise<{ event: Event }> {
    return fetchAPI(`/api/events/${id}`);
  },

  async createEvent(eventData: Partial<Event>): Promise<{ event: Event }> {
    return fetchAPI('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  async updateEvent(id: number, eventData: Partial<Event>): Promise<{ event: Event }> {
    return fetchAPI(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  async deleteEvent(id: number): Promise<{ message: string }> {
    return fetchAPI(`/api/events/${id}`, {
      method: 'DELETE',
    });
  },

  // タスク関連
  async getTasks(eventId: number): Promise<{ tasks: Task[] }> {
    return fetchAPI(`/api/events/${eventId}/tasks`);
  },

  async createTask(eventId: number, taskData: Partial<Task>): Promise<{ task: Task }> {
    return fetchAPI(`/api/events/${eventId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  async updateTask(id: number, taskData: Partial<Task>): Promise<{ task: Task }> {
    return fetchAPI(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },

  async deleteTask(id: number): Promise<{ message: string }> {
    return fetchAPI(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async generateTasks(eventTitle: string): Promise<{ tasks: Array<{ title: string; deadline: string }> }> {
    return fetchAPI('/api/tasks/generate', {
      method: 'POST',
      body: JSON.stringify({ eventTitle }),
    });
  },

  // 予算関連（今後実装予定）
  async getBudgets(eventId: number): Promise<{ budgets: Budget[] }> {
    return fetchAPI(`/api/events/${eventId}/budgets`);
  },
};
