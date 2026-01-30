import React from 'react';

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className}`} />
);

export default function TasksPageSkeleton() {
  return (
    <div className="p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <SkeletonBox className="h-9 w-48" />
          <div className="flex gap-3">
            <SkeletonBox className="h-10 w-32 rounded-xl" />
            <SkeletonBox className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        {/* 3カラム Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((col) => (
            <div
              key={col}
              className="rounded-2xl bg-card-bg/80 border border-white/10 overflow-hidden flex flex-col"
            >
              {/* カラムヘッダー */}
              <div className="px-4 py-3 flex items-center justify-between gap-2 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <SkeletonBox className="size-5 rounded" />
                  <SkeletonBox className="h-5 w-20" />
                </div>
                <SkeletonBox className="h-6 w-8 rounded-full" />
              </div>
              {/* タスクカード */}
              <div className="flex-1 p-4 space-y-3 min-h-[200px]">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white/5 border border-white/5 p-4 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <SkeletonBox className="h-5 w-16 rounded shrink-0" />
                      <SkeletonBox className="size-5 rounded-lg shrink-0" />
                    </div>
                    <SkeletonBox className="h-5 w-4/5 mt-2" />
                    <SkeletonBox className="h-4 w-24 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
