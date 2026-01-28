import React, { useState, useMemo, useEffect } from 'react';
import { Task } from '../types';
import { useTasks } from '../hooks/useTasks';
import { formatDeadlineShort, formatCompletedAt, deadlineToDatetimeLocal, toDatetimeLocal } from '../utils/dateUtils';
import { apiClient } from '../services/api';

type Status = 'todo' | 'in_progress' | 'completed';

const COLUMNS: { key: Status; label: string; icon: string }[] = [
  { key: 'todo', label: '未着手', icon: 'radio_button_unchecked' },
  { key: 'in_progress', label: '進行中', icon: 'adjust' },
  { key: 'completed', label: '完了', icon: 'check_circle' },
];

const DeadlineEditor: React.FC<{
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const [v, setV] = useState(initial);
  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <input
        type="datetime-local"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:border-primary"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(v);
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button type="button" onClick={() => onSave(v)} className="text-xs text-primary hover:underline">
        保存
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-white">
        キャンセル
      </button>
    </div>
  );
};


interface TasksPageProps {
  eventId: number;
}

const TasksPage: React.FC<TasksPageProps> = ({ eventId }) => {
  const { tasks, loading, createTask, updateTask, deleteTask, reload } = useTasks(eventId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(12, 0, 0, 0);
    return toDatetimeLocal(d);
  });
  const [menuTaskId, setMenuTaskId] = useState<number | null>(null);
  const [editingDeadlineId, setEditingDeadlineId] = useState<number | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dropTargetCol, setDropTargetCol] = useState<Status | null>(null);

  useEffect(() => {
    if (!menuTaskId) return;
    const onDoc = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.('[data-task-menu]')) return;
      setMenuTaskId(null);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [menuTaskId]);

  const byStatus = useMemo(() => {
    const map: Record<Status, Task[]> = { todo: [], in_progress: [], completed: [] };
    for (const t of tasks) {
      if (t.status === 'cancelled') continue;
      const s = t.status as Status;
      if (map[s]) map[s].push(t);
    }
    return map;
  }, [tasks]);

  const handleStatusChange = async (task: Task, newStatus: Status) => {
    setMenuTaskId(null);
    setDropTargetCol(null);
    setDraggingTaskId(null);
    await updateTask(task.id, { ...task, status: newStatus });
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggingTaskId(task.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, status: task.status }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDropTargetCol(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Status) => {
    e.preventDefault();
    setDropTargetCol(null);
    setDraggingTaskId(null);
    try {
      const { taskId } = JSON.parse(e.dataTransfer.getData('application/json') || '{}') as { taskId: number; status: Status };
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== targetStatus) handleStatusChange(task, targetStatus);
    } catch (_) {}
  };

  const handleDeadlineChange = async (task: Task, localValue: string) => {
    const iso = new Date(localValue).toISOString();
    setEditingDeadlineId(null);
    await updateTask(task.id, { ...task, deadline: iso });
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    const deadline = newTaskDeadline ? new Date(newTaskDeadline).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await createTask({
      title: newTaskTitle.trim(),
      deadline,
      status: 'todo',
    });
    setNewTaskTitle('');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(12, 0, 0, 0);
    setNewTaskDeadline(toDatetimeLocal(d));
    setShowCreateForm(false);
  };

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      const res = await apiClient.generateTasks('イベント');
      for (const s of res.tasks) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        await createTask({
          title: s.title,
          deadline: deadline.toISOString(),
          status: 'todo',
          is_ai_generated: true,
        });
      }
      reload();
    } catch (e) {
      console.error(e);
      alert('AIタスク生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-black text-white">タスク管理</h1>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateTasks}
              disabled={isGenerating}
              className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all flex items-center gap-2 text-sm font-bold"
            >
              <span className="material-symbols-outlined text-lg">{isGenerating ? 'sync' : 'auto_awesome'}</span>
              {isGenerating ? '生成中...' : 'AIタスク生成'}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all text-sm font-bold"
            >
              新規タスク
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="mb-6 p-4 bg-card-bg border border-white/10 rounded-2xl">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="タスク名を入力"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
            />
            <div className="mt-3">
              <label className="block text-xs font-bold text-gray-400 mb-1">締め切り</label>
              <input
                type="datetime-local"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleCreateTask} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                作成
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setNewTaskTitle(''); }}
                className="px-4 py-2 bg-white/5 text-gray-400 rounded-xl text-sm font-bold"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col) => {
            const items = byStatus[col.key];
            const isCompleted = col.key === 'completed';
            const isDropTarget = dropTargetCol === col.key;
            return (
              <div
                key={col.key}
                data-kanban-col
                className={`rounded-2xl bg-card-bg/80 border overflow-hidden flex flex-col transition-colors ${
                  isDropTarget ? 'border-primary ring-2 ring-primary/30' : 'border-white/10'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDropTargetCol(col.key);
                }}
                onDragLeave={(e) => {
                  const rel = e.relatedTarget as Node | null;
                  if (rel != null && e.currentTarget.contains(rel)) return;
                  setDropTargetCol((c) => (c === col.key ? null : c));
                }}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div
                  className="px-4 py-3 flex items-center justify-between bg-white/5 border-b border-white/10"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetCol(col.key); }}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-white text-lg">
                      {col.key === 'todo' ? 'radio_button_unchecked' : col.key === 'in_progress' ? 'adjust' : 'check_circle'}
                    </span>
                    <span className="text-white font-bold">{col.label}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isCompleted ? 'bg-gray-600 text-gray-300' : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {items.length}
                  </span>
                </div>
                <div
                  className="flex-1 p-4 space-y-3 min-h-[200px]"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetCol(col.key); }}
                  onDragLeave={(e) => {
                    const rel = e.relatedTarget as Node | null;
                    const colEl = e.currentTarget.closest('[data-kanban-col]');
                    if (rel != null && colEl?.contains(rel)) return;
                    setDropTargetCol((c) => (c === col.key ? null : c));
                  }}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {items.length === 0 ? (
                    <div
                      className={`text-center py-8 text-gray-500 text-sm rounded-xl border-2 border-dashed transition-colors ${
                        isDropTarget ? 'border-primary bg-primary/5 text-primary' : 'border-transparent'
                      }`}
                    >
                      {isDropTarget ? 'ここにドロップ' : 'タスクなし'}
                    </div>
                  ) : (
                    items.map((task) => (
                      <TaskKanbanCard
                        key={task.id}
                        task={task}
                        isCompleted={isCompleted}
                        isDragging={draggingTaskId === task.id}
                        menuOpen={menuTaskId === task.id}
                        editingDeadline={editingDeadlineId === task.id}
                        onMenuToggle={() => setMenuTaskId(menuTaskId === task.id ? null : task.id)}
                        onStatusChange={(s) => handleStatusChange(task, s)}
                        onDelete={async () => {
                          setMenuTaskId(null);
                          await deleteTask(task.id);
                        }}
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, col.key)}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetCol(col.key); }}
                        onDeadlineEdit={() => setEditingDeadlineId(task.id)}
                        onDeadlineSave={(v) => handleDeadlineChange(task, v)}
                        onDeadlineCancel={() => setEditingDeadlineId(null)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface TaskKanbanCardProps {
  task: Task;
  isCompleted: boolean;
  isDragging: boolean;
  menuOpen: boolean;
  editingDeadline: boolean;
  onMenuToggle: () => void;
  onStatusChange: (s: Status) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDeadlineEdit: () => void;
  onDeadlineSave: (localValue: string) => void;
  onDeadlineCancel: () => void;
}

const TaskKanbanCard: React.FC<TaskKanbanCardProps> = ({
  task,
  isCompleted,
  isDragging,
  menuOpen,
  editingDeadline,
  onMenuToggle,
  onStatusChange,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDeadlineEdit,
  onDeadlineSave,
  onDeadlineCancel,
}) => {
  const { label, isDueToday, isOverdue } = formatDeadlineShort(task.deadline);

  return (
    <div
      className={`relative rounded-2xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition-all ${isDragging ? 'opacity-50' : ''} ${!isCompleted ? 'cursor-grab active:cursor-grabbing' : ''}`}
      data-task-menu
      draggable={!isCompleted && !editingDeadline && !menuOpen}
      onDragStart={(e) => !isCompleted && !editingDeadline && !menuOpen && onDragStart(e)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
            isCompleted ? 'bg-gray-600 text-gray-300' : task.is_ai_generated ? 'bg-primary/30 text-primary' : 'bg-white/10 text-gray-400'
          }`}
        >
          {isCompleted ? 'COMPLETED' : task.is_ai_generated ? 'AI' : '通常'}
        </span>
        {!isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
            className="p-1 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="メニュー"
          >
            <span className="material-symbols-outlined text-lg">more_vert</span>
          </button>
        )}
        {isCompleted && (
          <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
        )}
      </div>

      {menuOpen && !isCompleted && (
        <div
          className="absolute top-10 right-2 z-10 rounded-xl bg-card-bg border border-white/10 shadow-xl py-1 min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
            <button
              key={c.key}
              onClick={() => onStatusChange(c.key)}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
            >
              {c.label}へ
            </button>
          ))}
          <button
            onClick={onDelete}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10"
          >
            削除
          </button>
        </div>
      )}

      <p className={`mt-2 font-bold ${isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>
        {task.title}
      </p>

      {isCompleted ? (
        <p className="mt-1 text-xs text-gray-500">{formatCompletedAt(task.updated_at)}</p>
      ) : editingDeadline ? (
        <DeadlineEditor
          initial={deadlineToDatetimeLocal(task.deadline)}
          onSave={onDeadlineSave}
          onCancel={onDeadlineCancel}
        />
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeadlineEdit(); }}
          className={`mt-1 text-left text-xs font-medium w-full flex items-center gap-1 group ${
            isOverdue ? 'text-red-400' : isDueToday ? 'text-primary' : 'text-gray-500'
          }`}
        >
          {label}
          <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            edit
          </span>
        </button>
      )}

      {task.assignee && (
        <div className="mt-3 flex justify-end">
          <div
            className="size-8 rounded-full bg-primary/20 border border-white/20 flex items-center justify-center text-primary text-xs font-bold overflow-hidden"
            title={task.assignee.name}
          >
            {task.assignee.avatar_url ? (
              <img src={task.assignee.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              (task.assignee.name || '?').slice(0, 1)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
