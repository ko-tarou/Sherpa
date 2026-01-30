import React from 'react';

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className}`} />
);

export default function ChatPageSkeleton() {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[#0A0A0B]">
      {/* 左サイドバー */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-white/10 bg-card-bg/50">
        <div className="px-4 py-4 border-b border-white/10">
          <SkeletonBox className="h-6 w-32" />
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-4 mb-2 flex justify-between">
            <SkeletonBox className="h-3 w-12" />
            <SkeletonBox className="h-3 w-16" />
          </div>
          <ul className="space-y-0.5 px-2">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="px-3 py-2">
                <SkeletonBox className="h-5 w-full max-w-[120px]" />
              </li>
            ))}
          </ul>
          <div className="px-4 mt-4 mb-2">
            <SkeletonBox className="h-3 w-20" />
          </div>
          <ul className="space-y-0.5 px-2">
            {[1, 2].map((i) => (
              <li key={i} className="px-3 py-2">
                <SkeletonBox className="h-5 w-full max-w-[100px]" />
              </li>
            ))}
          </ul>
        </div>
        <div className="px-4 py-3 border-t border-white/10">
          <SkeletonBox className="h-4 w-24" />
        </div>
      </aside>

      {/* メイン */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0A0A0B]">
        <header className="shrink-0 px-6 py-4 border-b border-white/10 bg-card-bg/30 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <SkeletonBox className="h-6 w-64" />
            <SkeletonBox className="h-3 w-16" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <SkeletonBox className="size-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-baseline gap-2">
                  <SkeletonBox className="h-4 w-24" />
                  <SkeletonBox className="h-3 w-12" />
                </div>
                <SkeletonBox className="h-4 w-full max-w-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-card-bg/30">
          <div className="flex gap-3">
            <SkeletonBox className="size-10 rounded-lg shrink-0" />
            <SkeletonBox className="flex-1 h-11 rounded-xl" />
            <SkeletonBox className="h-10 w-20 rounded-xl shrink-0" />
          </div>
          <SkeletonBox className="h-4 w-48 mt-2" />
        </div>
      </main>
    </div>
  );
}
