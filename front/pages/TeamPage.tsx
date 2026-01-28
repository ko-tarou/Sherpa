import React, { useState, useMemo, useEffect } from 'react';
import { Event, EventStaff, User, EventInvitation } from '../types';
import { apiClient } from '../services/api';

type TabKey = 'all' | 'Staff' | 'Speaker' | 'Sponsor' | 'Other';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'Staff', label: 'スタッフ' },
  { key: 'Speaker', label: '登壇者' },
  { key: 'Sponsor', label: 'スポンサー' },
  { key: 'Other', label: 'その他' },
];

const ROLE_LABEL: Record<string, string> = {
  Admin: '管理者',
  Staff: 'スタッフ',
  Speaker: '登壇者',
  Sponsor: 'スポンサー',
  Other: 'その他',
};

const INVITE_ROLES = [
  { value: 'Staff', label: 'スタッフ' },
  { value: 'Speaker', label: '登壇者' },
  { value: 'Sponsor', label: 'スポンサー' },
  { value: 'Other', label: 'その他' },
] as const;

const DETAIL_ROLE: Record<string, string> = {
  Admin: 'EVENT ADMINISTRATOR',
  Staff: 'STAFF',
  Speaker: 'SPEAKER',
  Sponsor: 'SPONSOR',
  Other: 'OTHER',
};

function roleLabel(r: string): string {
  return ROLE_LABEL[r] ?? 'その他';
}

function detailRole(r: string): string {
  return DETAIL_ROLE[r] ?? 'MEMBER';
}

function matchTab(role: string, tab: TabKey): boolean {
  if (tab === 'all') return true;
  if (tab === 'Other') return !['Staff', 'Speaker', 'Sponsor'].includes(role);
  return role === tab;
}

interface TeamPageProps {
  eventId: number;
  event: Event;
  user: User;
}

const TeamPage: React.FC<TeamPageProps> = ({ eventId, event, user }) => {
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const staffs = useMemo(() => event.event_staffs ?? [], [event.event_staffs]);
  const isAdmin = useMemo(
    () => staffs.some((s) => s.user_id === user.id && s.role === 'Admin'),
    [staffs, user.id]
  );

  const filtered = useMemo(() => {
    let list = staffs.filter((s) => matchTab(s.role, tab));
    const q = search.trim().toLowerCase();
    if (q) {
      const name = (s: EventStaff) => (s.user?.name ?? '').toLowerCase();
      list = list.filter((s) => name(s).includes(q));
    }
    return list;
  }, [staffs, tab, search]);

  return (
    <div className="p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">チーム・関係者一覧</h1>
            <p className="text-gray-400 text-sm">
              イベントの成功を支える全てのステークホルダーを一覧で確認できます。
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="shrink-0 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              メンバー招待
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/10 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-bold shrink-0 transition-colors ${
                tab === t.key ? 'text-white border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search & count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前で検索..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
          <p className="text-gray-500 text-sm font-medium shrink-0">TOTAL: {filtered.length} MEMBERS</p>
        </div>

        {/* Member list */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-card-bg/50">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              {staffs.length === 0 ? 'メンバーがいません。「メンバー招待」から追加してください。' : '該当するメンバーはいません。'}
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map((s) => (
                <MemberRow key={s.id} staff={s} />
              ))}
            </ul>
          )}
        </div>

        {/* AI section */}
        <div className="mt-10 flex gap-4 p-5 rounded-2xl border border-white/10 bg-card-bg/50 border-l-4 border-l-primary">
          <div className="shrink-0 size-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold mb-1">AI メンバー構成アシスト</h3>
            <p className="text-gray-400 text-sm mb-3">
              現在のイベント規模に合わせた最適なスタッフ配置プランが生成されています。
            </p>
            <button
              onClick={() => alert('提案の確認は準備中です。')}
              className="text-sm font-bold text-primary hover:underline underline-offset-2"
            >
              提案を確認する
            </button>
          </div>
        </div>
      </div>

      {showInvite && isAdmin && (
        <InviteModal
          eventId={eventId}
          eventTitle={event.title}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
};

interface MemberRowProps {
  staff: EventStaff;
}

interface InviteModalProps {
  eventId: number;
  eventTitle: string;
  onClose: () => void;
}

type InviteMode = 'search' | 'email';

const InviteModal: React.FC<InviteModalProps> = ({ eventId, eventTitle, onClose }) => {
  const [mode, setMode] = useState<InviteMode>('search');
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 名前で検索
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // メールで招待
  const [email, setEmail] = useState('');

  const [selectedRole, setSelectedRole] = useState<string>('Staff');

  useEffect(() => {
    let ok = true;
    setLoading(true);
    setError(null);
    apiClient
      .getEventInvitations(eventId)
      .then((r) => {
        if (!ok) return;
        setInvitations(r.invitations.filter((inv) => inv.status === 'pending'));
      })
      .catch((e) => {
        if (!ok) return;
        setError(e?.message ?? '読み込みに失敗しました');
      })
      .finally(() => {
        if (ok) setLoading(false);
      });
    return () => { ok = false; };
  }, [eventId]);

  // 名前検索の debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      apiClient
        .searchUsers(q)
        .then((r) => setSearchResults(r.users))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSubmitByUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setError(null);
    try {
      const inv = await apiClient.createInvitation(eventId, { user_id: selectedUser.id, role: selectedRole });
      setInvitations((prev) => [...prev, inv.invitation]);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '招待の送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!em) return;
    setSubmitting(true);
    setError(null);
    try {
      const inv = await apiClient.createInvitation(eventId, { email: em, role: selectedRole });
      setInvitations((prev) => [...prev, inv.invitation]);
      setEmail('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '招待の送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const pending = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-black text-white mb-1">メンバー招待</h3>
        <p className="text-gray-400 text-sm mb-4">対象イベント: {eventTitle}</p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setMode('search'); setError(null); setSelectedUser(null); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${mode === 'search' ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            名前で検索
          </button>
          <button
            type="button"
            onClick={() => { setMode('email'); setError(null); setEmail(''); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${mode === 'email' ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            メールで招待
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 py-6">読み込み中...</p>
        ) : (
          <>
            {error && (
              <p className="text-red-400 text-sm mb-4 px-3 py-2 rounded-lg bg-red-500/10">{error}</p>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-400 mb-1">ロール</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'search' ? (
              <form onSubmit={handleSubmitByUser} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">ユーザー名で検索</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-lg">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="名前またはメールで検索..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                {searching && <p className="text-gray-500 text-sm">検索中...</p>}
                {searchQuery.trim() && !searching && searchResults.length === 0 && (
                  <p className="text-gray-500 text-sm">該当するユーザーがいません</p>
                )}
                {searchResults.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                    {searchResults.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${selectedUser?.id === u.id ? 'bg-primary/20 text-white' : 'hover:bg-white/5 text-gray-300'}`}
                        >
                          <span className="font-bold">{u.name}</span>
                          <span className="text-gray-500 text-sm truncate">{u.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="submit"
                  disabled={!selectedUser || submitting}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '送信中...' : '招待を送る'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitByEmail} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!email.trim() || submitting}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '送信中...' : '招待を送る'}
                </button>
              </form>
            )}

            {pending.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 mb-2">招待中（未承諾）</p>
                <ul className="space-y-2">
                  {pending.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                    >
                      <span className="text-white text-sm">
                        {inv.user?.name ?? ''} ({inv.user?.email ?? ''}) — {ROLE_LABEL[inv.role] ?? inv.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/15"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

function MemberRow({ staff }: MemberRowProps) {
  const user = staff.user;
  const name = user?.name ?? '名前未設定';
  const isAdmin = staff.role === 'Admin';
  const label = roleLabel(staff.role);

  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-white font-bold text-lg">{(name || '?').slice(0, 1)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold truncate">{name}</p>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{detailRole(staff.role)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 sm:pl-4">
        <span
          className={`px-3 py-1 rounded-lg text-xs font-bold ${
            isAdmin ? 'bg-primary text-white' : 'bg-white/10 text-gray-300'
          }`}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={() => alert('メッセージ機能は準備中です。')}
          className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-sm font-bold flex items-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-base">chat_bubble_outline</span>
          メッセージ
        </button>
      </div>
    </li>
  );
}

export default TeamPage;
