import React, { useState } from 'react';
import { Task } from '../types';
import { apiClient } from '../services/api';
import { formatDeadline } from '../utils/dateUtils';
import { useTranslation } from '../hooks/useTranslation';

interface TaskCardProps {
  tasks: Task[];
  eventTitle: string;
  eventId: number;
  loading?: boolean;
  onViewAll?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ tasks, eventTitle, eventId, loading, onViewAll }) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiGeneration = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.generateTasks(eventTitle);
      if (response.tasks && response.tasks.length > 0) {
        // タスクをAPI経由で作成
        for (const taskSuggestion of response.tasks) {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 7);
          await apiClient.createTask(eventId, {
            title: taskSuggestion.title,
            deadline: deadline.toISOString(),
            status: 'todo',
            is_ai_generated: true,
          });
        }
        // ページをリロードしてタスクを再取得
        window.location.reload();
      } else {
        alert('AIタスク生成に失敗しました。APIキーが設定されていない可能性があります。');
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      alert('AIタスク生成中にエラーが発生しました。バックエンドサーバーが起動しているか確認してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card-bg border border-white/10 rounded-[32px] p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">priority_high</span>
          {t('topPriority')}
        </h3>
        <div className="flex gap-4 items-center">
            <button 
                onClick={handleAiGeneration}
                disabled={isGenerating}
                className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all flex items-center gap-1"
            >
                <span className="material-symbols-outlined text-sm">{isGenerating ? 'sync' : 'auto_awesome'}</span>
                {isGenerating ? t('generating') : t('aiTaskSuggestion')}
            </button>
            <button
              type="button"
              onClick={onViewAll}
              className="text-sm font-bold text-gray-500 hover:text-primary transition-colors"
            >
              {t('viewAll')}
            </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {loading ? (
          <>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-5 p-6 rounded-2xl bg-white/5 border border-white/5 animate-pulse"
              >
                <div className="size-7 rounded-lg bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 rounded bg-white/10" />
                  <div className="h-4 w-24 rounded bg-white/10" />
                </div>
                <div className="size-5 rounded bg-white/10" />
              </div>
            ))}
          </>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t('noTasks')}</div>
        ) : (
          tasks.map((task) => (
          <div
            key={task.id}
            role="button"
            tabIndex={0}
            onClick={() => onViewAll?.()}
            onKeyDown={(e) => e.key === 'Enter' && onViewAll?.()}
            className="flex items-center gap-5 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-all cursor-pointer group"
          >
            <div className={`size-7 border-2 border-primary rounded-lg flex items-center justify-center transition-all ${task.completed ? 'bg-primary' : 'group-hover:bg-primary/20'}`}>
              <span className={`material-symbols-outlined text-white text-lg transition-transform ${task.completed ? 'scale-100' : 'scale-0 group-hover:scale-100 text-primary'}`}>
                check
              </span>
            </div>
            <div className="flex-1">
              <p className={`text-lg font-bold ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-white'}`}>
                {task.title}
              </p>
              <p className={`text-sm font-bold mt-1 ${formatDeadline(task.deadline).includes('本日') ? 'text-primary' : 'text-gray-500'}`}>
                {formatDeadline(task.deadline)}
              </p>
            </div>
            <span className="material-symbols-outlined text-gray-700">chevron_right</span>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskCard;
