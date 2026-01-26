const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = {
  async generateTasks(eventTitle: string) {
    const response = await fetch(`${API_URL}/api/tasks/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventTitle }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async getEvents() {
    const response = await fetch(`${API_URL}/api/events`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  },

  async createEvent(eventData: any) {
    const response = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async updateEvent(id: string, eventData: any) {
    const response = await fetch(`${API_URL}/api/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async deleteEvent(id: string) {
    const response = await fetch(`${API_URL}/api/events/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },
};
