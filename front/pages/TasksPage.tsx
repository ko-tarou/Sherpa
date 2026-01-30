import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task } from '../types';
import { useTasks } from '../hooks/useTasks';
import { formatDeadlineShort, formatCompletedAt, deadlineToDatetimeLocal, toDatetimeLocal } from '../utils/dateUtils';
import { apiClient } from '../services/api';
import DateTimePicker from '../components/DateTimePicker';
import TasksPageSkeleton from '../components/TasksPageSkeleton';
import AITaskGenerateModal from '../components/AITaskGenerateModal';
import { useTranslation } from '../hooks/useTranslation';

type Status = 'todo' | 'in_progress' | 'completed';

const DeadlineEditor: React.FC<{
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [v, setV] = useState(initial);
  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <div className="min-w-0 flex-1">
        <DateTimePicker value={v} onChange={setV} placeholder={t('selectDateTime')} compact />
      </div>
      <button type="button" onClick={() => onSave(v)} className="text-xs text-primary hover:underline font-bold">
        {t('save')}
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-white font-bold">
        {t('cancel')}
      </button>
    </div>
  );
};

const TitleEditDialog: React.FC<{
  task: Task;
  onSave: (v: string) => void;
  onCancel: () => void;
}> = ({ task, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [v, setV] = useState(task.title);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const isComposingRef = React.useRef(false);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    if (v.trim()) onSave(v.trim());
    else onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-black text-white mb-4">{t('editTaskTitle')}</h3>
        <textarea
          ref={inputRef}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onCancel();
              return;
            }
            if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { setTimeout(() => { isComposingRef.current = false; }, 0); }}
          placeholder={t('taskPlaceholder')}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
        />
        <div className="flex gap-3 mt-4 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-white/10 text-gray-400 font-bold hover:bg-white/15"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!v.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:opacity-90 disabled:opacity-50"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface TasksPageProps {
  eventId: number;
  eventTitle: string;
}

const TasksPage: React.FC<TasksPageProps> = ({ eventId, eventTitle }) => {
  const { t } = useTranslation();
  const columns: { key: Status; label: string; icon: string }[] = [
    { key: 'todo', label: t('todo'), icon: 'radio_button_unchecked' },
    { key: 'in_progress', label: t('inProgress'), icon: 'adjust' },
    { key: 'completed', label: t('completed'), icon: 'check_circle' },
  ];
  const { tasks, loading, createTask, updateTask, deleteTask, reload } = useTasks(eventId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return toDatetimeLocal(d);
  });
  const [menuTaskId, setMenuTaskId] = useState<number | null>(null);
  const [editingDeadlineId, setEditingDeadlineId] = useState<number | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dropTargetCol, setDropTargetCol] = useState<Status | null>(null);
  const [clearingCompleted, setClearingCompleted] = useState(false);
  const [showClearCompletedConfirm, setShowClearCompletedConfirm] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const isComposingRef = useRef(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  const onNewTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposingRef.current) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTask();
    }
  };
  const onNewTaskCompositionStart = () => { isComposingRef.current = true; };
  const onNewTaskCompositionEnd = () => { setTimeout(() => { isComposingRef.current = false; }, 0); };

  useEffect(() => {
    if (showCreateForm) newTaskInputRef.current?.focus();
  }, [showCreateForm]);

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

  const handleTitleChange = async (task: Task, newTitle: string) => {
    if (!newTitle.trim()) return;
    setEditingTitleId(null);
    await updateTask(task.id, { ...task, title: newTitle.trim() });
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
    d.setHours(23, 59, 0, 0);
    setNewTaskDeadline(toDatetimeLocal(d));
    setShowCreateForm(false);
  };

  const handleClearCompleted = async () => {
    const completed = byStatus.completed;
    if (completed.length === 0) return;
    setClearingCompleted(true);
    try {
      for (const t of completed) await deleteTask(t.id);
      setShowClearCompletedConfirm(false);
    } catch (e) {
      console.error(e);
      alert('削除中にエラーが発生しました');
    } finally {
      setClearingCompleted(false);
    }
  };

  const handleAddAITasks = async (tasks: { title: string; deadline: string }[]) => {
    for (const t of tasks) {
      await createTask({
        title: t.title,
        deadline: t.deadline,
        status: 'todo',
        is_ai_generated: true,
      });
    }
    reload();
  };

  if (loading) {
    return <TasksPageSkeleton />;
  }

  return (
    <div className="p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-black text-white">{t('taskManagement')}</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAIGenerateModal(true)}
              className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all flex items-center gap-2 text-sm font-bold"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              {t('aiTaskGenerate')}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all text-sm font-bold"
            >
              {t('newTask')}
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="mb-6 p-4 bg-card-bg border border-white/10 rounded-2xl">
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder={t('taskPlaceholder')}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary"
              onKeyDown={onNewTaskKeyDown}
              onCompositionStart={onNewTaskCompositionStart}
              onCompositionEnd={onNewTaskCompositionEnd}
            />
            <div className="mt-3">
              <DateTimePicker
                label={t('deadline')}
                value={newTaskDeadline}
                onChange={setNewTaskDeadline}
                placeholder={t('selectDateTime')}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleCreateTask} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                {t('add')}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setNewTaskTitle(''); }}
                className="px-4 py-2 bg-white/5 text-gray-400 rounded-xl text-sm font-bold"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((col) => {
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
                  className="px-4 py-3 flex items-center justify-between gap-2 bg-white/5 border-b border-white/10"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetCol(col.key); }}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-white text-lg shrink-0">
                      {col.key === 'todo' ? 'radio_button_unchecked' : col.key === 'in_progress' ? 'adjust' : 'check_circle'}
                    </span>
                    <span className="text-white font-bold truncate">{col.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isCompleted ? 'bg-gray-600 text-gray-300' : 'bg-primary/20 text-primary'
                      }`}
                    >
                      {items.length}
                    </span>
                    {isCompleted && items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowClearCompletedConfirm(true)}
                        disabled={clearingCompleted}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label="完了タスクを一括削除"
                        title="完了を削除して綺麗にする"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    )}
                  </div>
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
                      {isDropTarget ? t('dropHere') : t('noTasks')}
                    </div>
                  ) : (
                    items.map((task) => (
                      <TaskKanbanCard
                        key={task.id}
                        task={task}
                        columns={columns}
                        isCompleted={isCompleted}
                        isDragging={draggingTaskId === task.id}
                        menuOpen={menuTaskId === task.id}
                        editingDeadline={editingDeadlineId === task.id}
                        editingTitle={editingTitleId === task.id}
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
                        onTitleEdit={() => setEditingTitleId(task.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingTitleId != null && (() => {
        const task = tasks.find((t) => t.id === editingTitleId);
        return task ? (
          <TitleEditDialog
            key={editingTitleId}
            task={task}
            onSave={(v) => handleTitleChange(task, v)}
            onCancel={() => setEditingTitleId(null)}
          />
        ) : null;
      })()}

      {showAIGenerateModal && (
        <AITaskGenerateModal
          isOpen={showAIGenerateModal}
          onClose={() => setShowAIGenerateModal(false)}
          eventTitle={eventTitle}
          onGenerate={(title) => apiClient.generateTasks(title).then((r) => r.tasks)}
          onAddTasks={handleAddAITasks}
        />
      )}

      {showClearCompletedConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !clearingCompleted && setShowClearCompletedConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 size-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-400 text-2xl">delete_forever</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-white mb-1">{t('deleteCompleted')}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t('deleteCompletedConfirm', { count: byStatus.completed.length })}
                  {t('cannotUndo')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setShowClearCompletedConfirm(false)}
                disabled={clearingCompleted}
                className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm font-bold hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleClearCompleted}
                disabled={clearingCompleted}
                className="px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/30 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">{clearingCompleted ? 'sync' : 'delete'}</span>
                {clearingCompleted ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TaskKanbanCardProps {
  task: Task;
  columns: { key: Status; label: string; icon: string }[];
  isCompleted: boolean;
  isDragging: boolean;
  menuOpen: boolean;
  editingDeadline: boolean;
  editingTitle: boolean;
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
  onTitleEdit: () => void;
}

const TaskKanbanCard: React.FC<TaskKanbanCardProps> = ({
  task,
  columns,
  isCompleted,
  isDragging,
  menuOpen,
  editingDeadline,
  editingTitle,
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
  onTitleEdit,
}) => {
  const { label, isDueToday, isOverdue } = formatDeadlineShort(task.deadline);
  const isEditing = editingDeadline || editingTitle || menuOpen;

  return (
    <div
      className={`relative rounded-2xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition-all ${isDragging ? 'opacity-50' : ''} ${!isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
      data-task-menu
      draggable={!isEditing}
      onDragStart={(e) => !isEditing && onDragStart(e)}
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
        <div className="flex items-center gap-1 shrink-0">
          {isCompleted && <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>}
          <button
            onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
            className="p-1 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="メニュー"
          >
            <span className="material-symbols-outlined text-lg">more_vert</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="absolute top-10 right-2 z-10 rounded-xl bg-card-bg border border-white/10 shadow-xl py-1 min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          {columns.filter((c) => c.key !== task.status).map((c) => (
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

      <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTitleEdit(); }}
          className={`mt-2 text-left w-full font-bold group flex items-center gap-1 ${
            isCompleted ? 'line-through text-gray-500' : 'text-white hover:text-primary/90'
          }`}
        >
          {task.title}
          <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            edit
          </span>
        </button>

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
              <img src={task.assignee.avatar_url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
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
