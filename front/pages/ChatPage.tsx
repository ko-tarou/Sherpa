import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Event, User, Channel, Message, ChannelMember, EventStaff } from '../types';
import { apiClient } from '../services/api';
import { formatMessageTime } from '../utils/dateUtils';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

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

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (selectedChannel) {
      setLoadingMessages(true);
      apiClient
        .getMessages(selectedChannel.id)
        .then((r) => setMessages(r.messages))
        .catch(() => setMessages([]))
        .finally(() => setLoadingMessages(false));
    } else {
      setMessages([]);
    }
  }, [selectedChannel?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedChannel || sending) return;
    setSending(true);
    setInput('');
    try {
      const r = await apiClient.createMessage(selectedChannel.id, { content: text });
      setMessages((prev) => [...prev, r.message]);
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
                <h1 className="text-xl font-black text-white">
                  「{selectedChannel.name.replace(/^#/, '')}」チャンネルへようこそ
                </h1>
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

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loadingMessages ? (
                <p className="text-gray-500 text-sm">読み込み中...</p>
              ) : (
                <>
                  {olderMessages.map((m) => (
                    <MessageRow key={m.id} message={m} />
                  ))}
                  {messages.length > newerCount && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-xs text-gray-500">ここからは新しいメッセージです</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}
                  {newerMessages.map((m) => (
                    <MessageRow key={m.id} message={m} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

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
                  onChange={(e) => setInput(e.target.value)}
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

function MessageRow({ message }: { message: Message }) {
  const sender = message.user;
  const name = sender?.name ?? '不明';
  const time = formatMessageTime(message.created_at);

  return (
    <div className="flex gap-3">
      <div className="shrink-0 size-9 rounded-full bg-primary/20 border border-white/20 flex items-center justify-center overflow-hidden">
        {sender?.avatar_url ? (
          <img src={sender.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-primary font-bold text-sm">{(name || '?').slice(0, 1)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-white">{name}</span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-gray-300 text-sm mt-0.5 whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

export default ChatPage;
