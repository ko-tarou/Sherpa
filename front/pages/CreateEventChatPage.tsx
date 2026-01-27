import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '../services/api';
import EventFormDialog from '../components/EventFormDialog';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SuggestedEvent {
  title: string;
  start_at: string;
  end_at: string;
  location?: string;
}

interface CreateEventChatPageProps {
  onClose: () => void;
  onEventCreated: (eventId: number) => void;
  userId: number;
}

const CreateEventChatPage: React.FC<CreateEventChatPageProps> = ({ onClose, onEventCreated, userId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'こんにちは。イベント作成のアシスタントです。\n\nイベントの**タイトル**、**開始日時**、**終了日時**、あれば**場所**を教えてください。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedEvent, setSuggestedEvent] = useState<SuggestedEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [formInitialData, setFormInitialData] = useState<{
    title?: string;
    start_at?: string;
    end_at?: string;
    location?: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    setSuggestedEvent(null);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await apiClient.createEventChat(text, history);

      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      if (res.suggestedEvent) {
        setSuggestedEvent(res.suggestedEvent);
        setFormInitialData(res.suggestedEvent);
      } else {
        // AIのAPIキーがない場合や、suggestedEventが返ってこない場合はフォームを表示
        setFormInitialData(null);
        setShowFormDialog(true);
      }
    } catch (e: any) {
      // エラー時もフォームを表示（APIキーがない場合など）
      const errorMessage = e.message?.includes('AI機能') || e.message?.includes('API key')
        ? 'AI機能は現在利用できません。フォームから直接入力してください。'
        : 'エラーが発生しました。フォームから直接入力してください。';
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
        },
      ]);
      setFormInitialData(null);
      setShowFormDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!suggestedEvent || creating) return;
    setCreating(true);
    try {
      const { event } = await apiClient.createEvent({
        organization_id: 1,
        title: suggestedEvent.title,
        start_at: suggestedEvent.start_at,
        end_at: suggestedEvent.end_at,
        location: suggestedEvent.location || undefined,
        status: 'draft',
        user_id: userId,
      });
      onEventCreated(event.id);
      onClose();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'イベントの作成に失敗しました。もう一度お試しください。',
        },
      ]);
      setSuggestedEvent(null);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col font-display"
      style={{
        background: 'linear-gradient(180deg, #0A0A0B 0%, #111113 50%, #0A0A0B 100%)',
        color: '#f3f4f6',
      }}
    >
      {/* ヘッダー */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#E11D48' }}
          >
            <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
          </div>
          <div>
            <h1 className="text-white font-black tracking-tight">新規イベント作成</h1>
            <p className="text-xs text-gray-500 font-medium">AIとチャットでイベントを作成</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          aria-label="閉じる"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-card-bg border border-white/10 text-gray-100'
                }`}
              >
                <p className="text-sm font-medium whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-card-bg border border-white/10 flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-primary text-lg">
                  progress_activity
                </span>
                <span className="text-gray-400 text-sm">考え中...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 作成ボタン（suggestedEvent 時） */}
      {suggestedEvent && (
        <div className="flex-shrink-0 px-4 md:px-6 py-4 border-t border-white/10">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-gray-400">
              <span className="font-bold text-white">{suggestedEvent.title}</span>
              <span className="mx-2">·</span>
              {new Date(suggestedEvent.start_at).toLocaleString('ja-JP')} 〜{' '}
              {new Date(suggestedEvent.end_at).toLocaleString('ja-JP')}
              {suggestedEvent.location && ` · ${suggestedEvent.location}`}
            </div>
            <button
              onClick={createEvent}
              disabled={creating}
              className="flex-shrink-0 px-6 py-3 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #E11D48 0%, #FF3131 100%)',
                boxShadow: '0 0 20px rgba(225,29,72,0.3)',
              }}
            >
              {creating ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                  作成中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  この内容でイベントを作成
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 入力 */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 border-t border-white/10">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 size-12 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#E11D48' }}
            aria-label="送信"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>

      {/* フォームダイアログ */}
      <EventFormDialog
        isOpen={showFormDialog}
        onClose={() => setShowFormDialog(false)}
        onEventCreated={(eventId) => {
          onEventCreated(eventId);
          onClose();
        }}
        userId={userId}
        initialData={formInitialData || undefined}
      />
    </div>
  );
};

export default CreateEventChatPage;
