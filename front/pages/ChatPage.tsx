import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Event, User, Channel, Message, MessageReaction, ChannelMember, EventStaff } from '../types';
import { apiClient } from '../services/api';
import { formatMessageTime } from '../utils/dateUtils';
import { useChatWebSocket, type ReactionPayload } from '../hooks/useChatWebSocket';

const SHERPA_TOKEN_KEY = 'sherpa_token';

interface ChatPageProps {
  eventId: number;
  event: Event;
  user: User;
}

const ChatPage: React.FC<ChatPageProps> = ({ eventId, event, user }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const prevChannelIdRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem(SHERPA_TOKEN_KEY) : null;
  const {
    connected,
    lastError,
    join,
    leave,
    subscribeMessages,
    subscribeMessageUpdated,
    subscribeMessageDeleted,
    subscribeReaction,
    subscribeTyping,
    sendTyping,
  } = useChatWebSocket(user ? token : null);

  const staffs = event.event_staffs ?? [];
  const isAdmin = staffs.some((s: EventStaff) => s.user_id === user.id && s.role === 'Admin');

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const r = await apiClient.getChannels(eventId);
      setChannels(r.channels);
      if (r.channels.length > 0) {
        setSelectedChannel((prev) => {
          const ok = prev && r.channels.some((c) => c.id === prev.id);
          return ok ? prev : r.channels[0];
        });
      } else {
        setSelectedChannel(null);
      }
    } catch (e) {
      console.error(e);
      setChannels([]);
      setSelectedChannel(null);
    } finally {
      setLoadingChannels(false);
    }
  }, [eventId]);

  const fetchMessages = useCallback(async (channelId: number) => {
    setLoadingMessages(true);
    try {
      const r = await apiClient.getMessages(channelId);
      setMessages(r.messages);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    subscribeMessages((m) => {
      if (!selectedChannel || m.channel_id !== selectedChannel.id) return;
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        return [...prev, m];
      });
    });
  }, [selectedChannel?.id, subscribeMessages]);

  useEffect(() => {
    subscribeMessageUpdated((m) => {
      if (!selectedChannel || m.channel_id !== selectedChannel.id) return;
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
    });
  }, [selectedChannel?.id, subscribeMessageUpdated]);

  useEffect(() => {
    subscribeMessageDeleted((messageId) => {
      setMessages((prev) => prev.filter((x) => x.id !== messageId));
    });
  }, [subscribeMessageDeleted]);

  useEffect(() => {
    subscribeReaction((p: ReactionPayload) => {
      const pa = p as Record<string, unknown>;
      if (pa.action === 'remove' && typeof pa.message_id === 'number' && typeof pa.user_id === 'number' && typeof pa.emoji === 'string') {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== pa.message_id) return m;
            const reactions = (m.reactions ?? []).filter((r) => !(r.user_id === pa.user_id && r.emoji === pa.emoji));
            return { ...m, reactions };
          })
        );
      } else if ('message_id' in pa && 'id' in pa) {
        const r = p as MessageReaction;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== r.message_id) return m;
            const existing = (m.reactions ?? []).some((x) => x.id === r.id);
            if (existing) return m;
            return { ...m, reactions: [...(m.reactions ?? []), r] };
          })
        );
      }
    });
  }, [subscribeReaction]);

  useEffect(() => {
    subscribeTyping((p) => {
      if (!selectedChannel || p.user_id === user.id) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (p.typing) {
          next.set(p.user_id, p.user_name || 'ユーザー');
        } else {
          next.delete(p.user_id);
        }
        return next;
      });
    });
  }, [selectedChannel?.id, subscribeTyping, user.id]);

  useEffect(() => {
    if (!selectedChannel) {
      setMessages([]);
      setTypingUsers(new Map());
      prevChannelIdRef.current = null;
      return;
    }
    setTypingUsers(new Map());
    const prev = prevChannelIdRef.current;
    if (prev != null && prev !== selectedChannel.id) {
      leave(prev);
    }
    prevChannelIdRef.current = selectedChannel.id;
    join(selectedChannel.id);
    fetchMessages(selectedChannel.id);
  }, [selectedChannel?.id, join, leave, fetchMessages]);

  const hadConnectedBeforeRef = useRef(false);
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    const wasConnected = prevConnectedRef.current;
    if (wasConnected && !connected) {
      hadConnectedBeforeRef.current = true;
    }
    prevConnectedRef.current = connected;
    const reconnected = connected && hadConnectedBeforeRef.current;
    if (reconnected && selectedChannel) {
      hadConnectedBeforeRef.current = false;
      fetchMessages(selectedChannel.id);
    }
  }, [connected, selectedChannel?.id, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedChannel || sending) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTyping(selectedChannel.id, user.name, false);
    setSending(true);
    setInput('');
    try {
      await apiClient.createMessage(selectedChannel.id, { content: text });
    } catch (e) {
      console.error(e);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onCompositionStart = () => {
    isComposingRef.current = true;
  };

  const onCompositionEnd = () => {
    setTimeout(() => {
      isComposingRef.current = false;
    }, 0);
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      if (!selectedChannel) return;
      sendTyping(selectedChannel.id, user.name, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(selectedChannel.id, user.name, false);
        typingTimeoutRef.current = null;
      }, 2000);
    },
    [selectedChannel?.id, user.name, sendTyping]
  );

  const publicChannels = channels.filter((c) => !c.is_private);
  const privateChannels = channels.filter((c) => c.is_private);
  const staffCount = event.event_staffs?.length ?? 0;

  const newerCount = 5;
  const olderMessages = messages.slice(0, Math.max(0, messages.length - newerCount));
  const newerMessages = messages.slice(-newerCount);

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[#0A0A0B]">
      {/* 左サイドバー: チャンネル一覧 */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-white/10 bg-card-bg/50">
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">チャットルーム</h2>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {loadingChannels ? (
            <p className="px-4 text-gray-500 text-sm">読み込み中...</p>
          ) : (
            <>
              <div className="px-4 mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">公開</p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowCreateChannel(true)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    + 新規作成
                  </button>
                )}
              </div>
              <ul className="space-y-0.5 px-2">
                {publicChannels.map((ch) => (
                  <li key={ch.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedChannel(ch)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        selectedChannel?.id === ch.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-base">#</span>
                      <span className="text-sm font-medium truncate">{ch.name.replace(/^#/, '')}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {privateChannels.length > 0 && (
                <>
                  <div className="px-4 mt-4 mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">プライベート</p>
                  </div>
                  <ul className="space-y-0.5 px-2">
                    {privateChannels.map((ch) => (
                      <li key={ch.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedChannel(ch)}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            selectedChannel?.id === ch.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">lock</span>
                          <span className="text-sm font-medium truncate">{ch.name.replace(/^#/, '')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-gray-500">
            オンライン: <span className="text-white font-medium">{staffCount}</span>人
          </p>
        </div>
      </aside>

      {/* メイン: チャンネルヘッダー + メッセージ + 入力 */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0A0A0B]">
        {!selectedChannel ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            チャンネルを選択してください
          </div>
        ) : (
          <>
            <header className="shrink-0 px-6 py-4 border-b border-white/10 bg-card-bg/30 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-white">
                    「{selectedChannel.name.replace(/^#/, '')}」チャンネルへようこそ
                  </h1>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      connected
                        ? 'bg-green-500/20 text-green-400'
                        : lastError
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                    }`}
                    title={connected ? '接続中' : lastError ? lastError : '接続中…'}
                  >
                    {connected ? '接続中' : lastError ? 'エラー' : '接続中…'}
                  </span>
                </div>
                {selectedChannel.description && (
                  <p className="text-gray-400 text-sm mt-1">{selectedChannel.description}</p>
                )}
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowChannelSettings(true)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                  aria-label="チャンネル設定"
                >
                  <span className="material-symbols-outlined text-xl">settings</span>
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              {loadingMessages ? (
                <p className="text-gray-500 text-sm">読み込み中...</p>
              ) : (
                <>
                  {olderMessages.map((m) => (
                    <MessageRow
                      key={m.id}
                      message={m}
                      currentUser={user}
                      onEdit={(id, content) => {
                        void apiClient.updateMessage(id, content).catch(console.error);
                      }}
                      onDelete={(id) => {
                        void apiClient.deleteMessage(id).catch(console.error);
                      }}
                      onReaction={(id) => {
                        void apiClient.toggleReaction(id, '👍').catch(console.error);
                      }}
                    />
                  ))}
                  {messages.length > newerCount && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-xs text-gray-500">ここからは新しいメッセージです</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}
                  {newerMessages.map((m) => (
                    <MessageRow
                      key={m.id}
                      message={m}
                      currentUser={user}
                      onEdit={(id, content) => {
                        void apiClient.updateMessage(id, content).catch(console.error);
                      }}
                      onDelete={(id) => {
                        void apiClient.deleteMessage(id).catch(console.error);
                      }}
                      onReaction={(id) => {
                        void apiClient.toggleReaction(id, '👍').catch(console.error);
                      }}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {typingUsers.size > 0 && (
              <div className="shrink-0 px-6 py-2 border-t border-white/5">
                <p className="text-xs text-gray-500 italic">
                  {Array.from(typingUsers.values()).join('、')} が入力中...
                </p>
              </div>
            )}

            <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-card-bg/30">
              <div className="flex gap-3">
                <button
                  type="button"
                  className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="添付"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={onKeyDown}
                  onCompositionStart={onCompositionStart}
                  onCompositionEnd={onCompositionEnd}
                  placeholder={`#${selectedChannel.name.replace(/^#/, '')}へのメッセージを送信...`}
                  rows={1}
                  className="flex-1 min-h-[44px] max-h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="shrink-0 px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  送信 &gt;
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Enterで送信 / Shift+Enterで改行</p>
            </div>
          </>
        )}
      </main>

      {showCreateChannel && (
        <CreateChannelModal
          eventId={eventId}
          onClose={() => setShowCreateChannel(false)}
          onCreated={(ch) => {
            setShowCreateChannel(false);
            fetchChannels();
            setSelectedChannel(ch);
          }}
        />
      )}

      {showChannelSettings && selectedChannel && (
        <ChannelSettingsModal
          channel={selectedChannel}
          event={event}
          onClose={() => setShowChannelSettings(false)}
          onUpdated={(ch) => {
            setSelectedChannel(ch);
            fetchChannels();
          }}
          onDeleted={() => {
            setShowChannelSettings(false);
            fetchChannels();
            const rest = channels.filter((c) => c.id !== selectedChannel.id);
            setSelectedChannel(rest[0] ?? null);
          }}
        />
      )}
    </div>
  );
};

interface CreateChannelModalProps {
  eventId: number;
  onClose: () => void;
  onCreated: (ch: Channel) => void;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ eventId, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await apiClient.createChannel(eventId, {
        name: name.trim(),
        description: description.trim() || undefined,
        is_private: isPrivate,
      });
      onCreated(r.channel);
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-black text-white mb-4">チャンネルを作成</h3>
        {error && (
          <p className="text-red-400 text-sm mb-4 px-3 py-2 rounded-lg bg-red-500/10">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">名前</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="#チャンネル名"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">説明（任意）</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="チャンネルの説明"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create-private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded bg-white/5 border-white/10"
            />
            <label htmlFor="create-private" className="text-sm text-gray-300">プライベート</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? '作成中...' : '作成'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white/5 text-gray-400 rounded-xl text-sm font-bold hover:bg-white/10">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ChannelSettingsModalProps {
  channel: Channel;
  event: Event;
  onClose: () => void;
  onUpdated: (ch: Channel) => void;
  onDeleted: () => void;
}

const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  channel,
  event,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isPrivate, setIsPrivate] = useState(channel.is_private);
  const [updating, setUpdating] = useState(false);
  const [addUserId, setAddUserId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffs = event.event_staffs ?? [];
  const staffUsers = staffs.map((s) => s.user!).filter(Boolean);
  const memberIds = new Set(members.map((m) => m.user_id));
  const addableStaff = staffUsers.filter((u) => !memberIds.has(u.id));

  useEffect(() => {
    apiClient
      .getChannelMembers(channel.id)
      .then((r) => setMembers(r.members))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [channel.id]);

  useEffect(() => {
    setIsPrivate(channel.is_private);
  }, [channel.is_private]);

  const handleTogglePrivate = async () => {
    setUpdating(true);
    setError(null);
    try {
      const r = await apiClient.updateChannel(channel.id, { is_private: !isPrivate });
      setIsPrivate(r.channel.is_private);
      onUpdated(r.channel);
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMember = async () => {
    if (addUserId == null) return;
    setError(null);
    try {
      const r = await apiClient.addChannelMember(channel.id, addUserId);
      setMembers((prev) => [...prev, r.member]);
      setAddUserId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '追加に失敗しました');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    setError(null);
    try {
      await apiClient.removeChannelMember(channel.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await apiClient.deleteChannel(channel.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const isDefault = channel.name === '#全体';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-white">チャンネル設定</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        {error && (
          <p className="text-red-400 text-sm mb-4 px-3 py-2 rounded-lg bg-red-500/10">{error}</p>
        )}

        <section className="mb-6">
          <h4 className="text-sm font-bold text-gray-400 mb-2">公開 / 非公開</h4>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleTogglePrivate}
              disabled={updating}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isPrivate ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-300'}`}
            >
              {isPrivate ? 'プライベート' : '公開'}
            </button>
            <span className="text-gray-500 text-sm">クリックで{isPrivate ? '公開' : 'プライベート'}に切り替え</span>
          </div>
        </section>

        <section className="mb-6">
          <h4 className="text-sm font-bold text-gray-400 mb-2">メンバー</h4>
          {loadingMembers ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : (
            <>
              <ul className="space-y-2 mb-3">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5">
                    <span className="text-white text-sm">{m.user?.name ?? ''} ({m.user?.email ?? ''})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
              {addableStaff.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={addUserId ?? ''}
                    onChange={(e) => setAddUserId(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">メンバーを追加</option>
                    {addableStaff.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={addUserId == null}
                    className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    追加
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {!isDefault && (
          <section className="mb-4">
            <h4 className="text-sm font-bold text-gray-400 mb-2">チャンネルを削除</h4>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/30"
              >
                削除する
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">本当に削除しますか？</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {deleting ? '削除中...' : 'はい、削除'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-gray-400 text-sm font-bold hover:bg-white/15"
                >
                  キャンセル
                </button>
              </div>
            )}
          </section>
        )}

        <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/15">
          閉じる
        </button>
      </div>
    </div>
  );
};

interface MessageRowProps {
  message: Message;
  currentUser: User;
  onEdit: (messageId: number, content: string) => void | Promise<void>;
  onDelete: (messageId: number) => void | Promise<void>;
  onReaction: (messageId: number) => void | Promise<void>;
}

function MessageRow({ message, currentUser, onEdit, onDelete, onReaction }: MessageRowProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sender = message.user;
  const name = sender?.name ?? '不明';
  const time = formatMessageTime(message.created_at);
  const isOwn = message.user_id === currentUser.id;
  const reactions = message.reactions ?? [];
  const thumbsUp = reactions.filter((r) => r.emoji === '👍');
  const hasMyReaction = thumbsUp.some((r) => r.user_id === currentUser.id);

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
    setEditContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditContent(message.content);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(message.id);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group flex gap-3">
      <div className="shrink-0 size-9 rounded-full bg-primary/20 border border-white/20 flex items-center justify-center overflow-hidden">
        {sender?.avatar_url ? (
          <img src={sender.avatar_url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-primary font-bold text-sm">{(name || '?').slice(0, 1)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-white">{name}</span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        {editing ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold"
              >
                保存
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1 rounded-lg bg-white/10 text-gray-400 text-xs font-bold"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-300 text-sm mt-0.5 whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {thumbsUp.length > 0 && (
            <span className="text-xs text-gray-500">
              👍 {thumbsUp.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => onReaction(message.id)}
            className={`text-sm px-2 py-0.5 rounded hover:bg-white/10 transition-colors ${hasMyReaction ? 'opacity-100' : 'opacity-50'}`}
            title="👍"
          >
            👍
          </button>
          {isOwn && !editing && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-gray-500 hover:text-white"
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-gray-500 hover:text-red-400"
              >
                削除
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-card-bg border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-bold mb-4">このメッセージを削除しますか？</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !deleting && setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-white/10 text-gray-400 font-bold"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
