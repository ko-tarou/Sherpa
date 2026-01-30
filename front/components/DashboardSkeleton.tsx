import React from 'react';

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className}`} />
);

export default function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* ヘッダー */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBox className="h-10 w-64" />
            <SkeletonBox className="h-4 w-48" />
          </div>
          <div className="flex gap-2 items-center">
            <SkeletonBox className="size-3 rounded-full" />
            <SkeletonBox className="h-4 w-28" />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* 左カラム: カウントダウン + タスク */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            {/* CountdownCard スケルトン */}
            <div className="bg-card-bg border border-white/10 rounded-[32px] p-12 flex flex-col items-center justify-center">
              <SkeletonBox className="h-5 w-40 mb-4" />
              <div className="flex items-baseline gap-6">
                <SkeletonBox className="h-8 w-24" />
                <SkeletonBox className="h-32 w-24 rounded-lg" />
                <SkeletonBox className="h-12 w-12 rounded" />
              </div>
            </div>

            {/* TaskCard スケルトン */}
            <div className="bg-card-bg border border-white/10 rounded-[32px] p-10">
              <div className="flex items-center justify-between mb-8">
                <SkeletonBox className="h-8 w-40" />
                <div className="flex gap-3">
                  <SkeletonBox className="h-8 w-24 rounded-full" />
                  <SkeletonBox className="h-8 w-16 rounded" />
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-5 p-6 rounded-2xl bg-white/5 border border-white/5"
                  >
                    <SkeletonBox className="size-7 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <SkeletonBox className="h-5 w-3/4" />
                      <SkeletonBox className="h-4 w-24" />
                    </div>
                    <SkeletonBox className="size-5 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右カラム: 予算 */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-card-bg border border-white/10 rounded-[32px] p-10 h-full flex flex-col">
              <SkeletonBox className="h-8 w-32 mb-12" />
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-full max-w-[200px] mb-12">
                  <SkeletonBox className="aspect-square w-full rounded-full" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <SkeletonBox className="h-14 w-16 rounded mx-auto mb-2" />
                    <SkeletonBox className="h-4 w-24" />
                  </div>
                </div>
                <div className="w-full space-y-4">
                  {[1, 2, 3].map((i) => (
                    <SkeletonBox key={i} className="h-20 w-full rounded-3xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card-bg/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4"
            >
              <SkeletonBox className="size-12 rounded-2xl shrink-0" />
              <div className="space-y-2">
                <SkeletonBox className="h-3 w-20" />
                <SkeletonBox className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
