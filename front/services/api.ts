import { Event, Task, Budget, EventStaff, EventInvitation, Notification, Ticket, EventParticipant, Channel, ChannelMember, Message, MessageReaction, User } from '../types';

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
  const token = localStorage.getItem('sherpa_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new APIError(response.status, error.error || response.statusText);
  }

  return response.json();
}

export const apiClient = {
  // 認証関連
  async startOAuth(): Promise<{ auth_url: string }> {
    return fetchAPI('/api/auth/google');
  },

  async getMe(): Promise<{ user: User }> {
    return fetchAPI('/api/auth/me');
  },

  // ユーザー関連
  async createUser(data: { name: string; email: string }): Promise<{ user: User }> {
    return fetchAPI('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getUser(id: number): Promise<{ user: User }> {
    return fetchAPI(`/api/users/${id}`);
  },

  async searchUsers(q: string): Promise<{ users: User[] }> {
    return fetchAPI(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
  },

  async getUserEvents(userId: number): Promise<{ events: Event[] }> {
    return fetchAPI(`/api/users/${userId}/events`);
  },

  // イベント関連
  async getEvents(): Promise<{ events: Event[] }> {
    return fetchAPI('/api/events');
  },

  async getEvent(id: number): Promise<{ event: Event }> {
    return fetchAPI(`/api/events/${id}`);
  },

  async createEvent(eventData: {
    organization_id: number;
    title: string;
    start_at: string;
    end_at: string;
    location?: string;
    status: string;
    user_id?: number;
  }): Promise<{ event: Event }> {
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

  // 予算関連
  async getBudgets(eventId: number): Promise<{ budgets: Budget[] }> {
    return fetchAPI(`/api/events/${eventId}/budgets`);
  },

  async createBudget(eventId: number, data: { category: string; type: 'income' | 'expense'; planned_amount: number; actual_amount?: number }): Promise<{ budget: Budget }> {
    return fetchAPI(`/api/events/${eventId}/budgets`, {
      method: 'POST',
      body: JSON.stringify({
        category: data.category,
        type: data.type,
        planned_amount: data.planned_amount,
        actual_amount: data.actual_amount ?? 0,
      }),
    });
  },

  async updateBudget(id: number, data: Partial<Pick<Budget, 'category' | 'type' | 'planned_amount' | 'actual_amount'>>): Promise<{ budget: Budget }> {
    return fetchAPI(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteBudget(id: number): Promise<{ ok: boolean }> {
    return fetchAPI(`/api/budgets/${id}`, { method: 'DELETE' });
  },

  // 招待・通知
  async getEventInvitations(eventId: number): Promise<{ invitations: EventInvitation[] }> {
    return fetchAPI(`/api/events/${eventId}/invitations`);
  },

  async createInvitation(
    eventId: number,
    data: { user_id?: number; email?: string; role: string }
  ): Promise<{ invitation: EventInvitation }> {
    const body: { user_id?: number; email?: string; role: string } = { role: data.role };
    if (data.user_id != null) body.user_id = data.user_id;
    else if (data.email) body.email = data.email;
    return fetchAPI(`/api/events/${eventId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async acceptInvitation(id: number): Promise<{ invitation: EventInvitation; event_staff: EventStaff }> {
    return fetchAPI(`/api/invitations/${id}/accept`, { method: 'POST' });
  },

  async declineInvitation(id: number): Promise<{ invitation: EventInvitation }> {
    return fetchAPI(`/api/invitations/${id}/decline`, { method: 'POST' });
  },

  async getNotifications(): Promise<{ notifications: Notification[] }> {
    return fetchAPI('/api/notifications');
  },

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    return fetchAPI('/api/notifications/unread-count');
  },

  async markNotificationRead(id: number): Promise<{ notification: Notification }> {
    return fetchAPI(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  // チャンネル・メッセージ
  async getChannels(eventId: number): Promise<{ channels: Channel[] }> {
    return fetchAPI(`/api/events/${eventId}/channels`);
  },

  async createChannel(
    eventId: number,
    data: { name: string; description?: string; is_private?: boolean }
  ): Promise<{ channel: Channel }> {
    return fetchAPI(`/api/events/${eventId}/channels`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMessages(channelId: number): Promise<{ messages: Message[] }> {
    return fetchAPI(`/api/channels/${channelId}/messages`);
  },

  async createMessage(channelId: number, data: { content: string }): Promise<{ message: Message }> {
    return fetchAPI(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMessage(messageId: number, content: string): Promise<{ message: Message }> {
    return fetchAPI(`/api/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },

  async deleteMessage(messageId: number): Promise<{ ok: boolean }> {
    return fetchAPI(`/api/messages/${messageId}`, { method: 'DELETE' });
  },

  async toggleReaction(messageId: number, emoji?: string): Promise<{ action: string; reaction?: MessageReaction }> {
    return fetchAPI(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify(emoji ? { emoji } : {}),
    });
  },

  async updateChannel(
    channelId: number,
    data: { name?: string; description?: string; is_private?: boolean }
  ): Promise<{ channel: Channel }> {
    return fetchAPI(`/api/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteChannel(channelId: number): Promise<{ ok: boolean }> {
    return fetchAPI(`/api/channels/${channelId}`, { method: 'DELETE' });
  },

  async getChannelMembers(channelId: number): Promise<{ members: ChannelMember[] }> {
    return fetchAPI(`/api/channels/${channelId}/members`);
  },

  async addChannelMember(channelId: number, userId: number): Promise<{ member: ChannelMember }> {
    return fetchAPI(`/api/channels/${channelId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  async removeChannelMember(channelId: number, userId: number): Promise<{ ok: boolean }> {
    return fetchAPI(`/api/channels/${channelId}/members/${userId}`, { method: 'DELETE' });
  },

  // イベント作成AIチャット
  async createEventChat(message: string, history: { role: string; content: string }[]): Promise<{
    reply: string;
    suggestedEvent?: { title: string; start_at: string; end_at: string; location?: string };
  }> {
    return fetchAPI('/api/events/create-chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  },
};
