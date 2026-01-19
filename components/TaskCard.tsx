
import React, { useState } from 'react';
import { Task } from '../types';
import { generateSmartTasks } from '../services/geminiService';

interface TaskCardProps {
  tasks: Task[];
  eventTitle: string;
  onTasksUpdate: (newTasks: Task[]) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ tasks, eventTitle, onTasksUpdate }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiGeneration = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateSmartTasks(eventTitle);
      const newTasks: Task[] = generated.map((t: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        title: t.title,
        deadline: t.deadline,
        isPriority: true,
        completed: false
      }));
      onTasksUpdate([...newTasks, ...tasks].slice(0, 6));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card-bg border border-white/10 rounded-[32px] p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">priority_high</span>
          最優先タスク
        </h3>
        <div className="flex gap-4 items-center">
            <button 
                onClick={handleAiGeneration}
                disabled={isGenerating}
                className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all flex items-center gap-1"
            >
                <span className="material-symbols-outlined text-sm">{isGenerating ? 'sync' : 'auto_awesome'}</span>
                {isGenerating ? '生成中...' : 'AIタスク提案'}
            </button>
            <button className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">すべて見る</button>
        </div>
      </div>
      
      <div className="space-y-4">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className="flex items-center gap-5 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-all cursor-pointer group"
          >
            <div className={`size-7 border-2 border-primary rounded-lg flex items-center justify-center transition-all ${task.completed ? 'bg-primary' : 'group-hover:bg-primary/20'}`}>
              <span className={`material-symbols-outlined text-white text-lg transition-transform ${task.completed ? 'scale-100' : 'scale-0 group-hover:scale-100 text-primary'}`}>
                check
              </span>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-white">{task.title}</p>
              <p className={`text-sm font-bold mt-1 ${task.deadline.includes('本日') ? 'text-primary' : 'text-gray-500'}`}>
                {task.deadline}
              </p>
            </div>
            <span className="material-symbols-outlined text-gray-700">chevron_right</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskCard;
