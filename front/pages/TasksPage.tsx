import React, { useState } from 'react';
import { Task } from '../types';
import { useTasks } from '../hooks/useTasks';
import { formatDeadline } from '../utils/dateUtils';
import { apiClient } from '../services/api';

interface TasksPageProps {
  eventId: number;
}

const TasksPage: React.FC<TasksPageProps> = ({ eventId }) => {
  const { tasks, loading, createTask, updateTask, deleteTask, reload } = useTasks(eventId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await updateTask(task.id, { status: newStatus });
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7); // デフォルトで7日後
    
    await createTask({
      title: newTaskTitle,
      deadline: deadline.toISOString(),
      status: 'todo',
    });
    
    setNewTaskTitle('');
    setShowCreateForm(false);
  };

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.generateTasks('イベント');
      for (const taskSuggestion of response.tasks) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        await createTask({
          title: taskSuggestion.title,
          deadline: deadline.toISOString(),
          status: 'todo',
          is_ai_generated: true,
        });
      }
      reload();
    } catch (error) {
      console.error('Error generating tasks:', error);
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-white">タスク管理</h1>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateTasks}
              disabled={isGenerating}
              className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                {isGenerating ? 'sync' : 'auto_awesome'}
              </span>
              {isGenerating ? '生成中...' : 'AIタスク生成'}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent-red transition-all"
            >
              新規タスク
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="mb-6 p-4 bg-card-bg border border-white/10 rounded-xl">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="タスク名を入力"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-primary text-white rounded-lg"
              >
                作成
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewTaskTitle('');
                }}
                className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              タスクがありません
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-5 p-6 rounded-2xl bg-card-bg border border-white/10 hover:border-primary/50 transition-all"
              >
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`size-7 border-2 border-primary rounded-lg flex items-center justify-center transition-all ${
                    task.status === 'completed' ? 'bg-primary' : 'hover:bg-primary/20'
                  }`}
                >
                  {task.status === 'completed' && (
                    <span className="material-symbols-outlined text-white text-lg">check</span>
                  )}
                </button>
                <div className="flex-1">
                  <p className={`text-lg font-bold ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-white'}`}>
                    {task.title}
                  </p>
                  <p className="text-sm font-bold mt-1 text-gray-500">
                    {formatDeadline(task.deadline)}
                  </p>
                  {task.is_ai_generated && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                      AI生成
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
