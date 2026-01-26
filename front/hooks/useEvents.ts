import { useState, useEffect } from 'react';
import { Event } from '../types';
import { apiClient } from '../services/api';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getEvents();
      setEvents(response.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'イベントの読み込みに失敗しました');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, error, reload: loadEvents };
};

export const useEvent = (id: number | null) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadEvent(id);
    } else {
      setEvent(null);
      setLoading(false);
    }
  }, [id]);

  const loadEvent = async (eventId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getEvent(eventId);
      setEvent(response.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'イベントの読み込みに失敗しました');
      console.error('Error loading event:', err);
    } finally {
      setLoading(false);
    }
  };

  return { event, loading, error, reload: () => id && loadEvent(id) };
};
