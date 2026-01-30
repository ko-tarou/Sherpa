import React from 'react';

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className}`} />
);

export default function TeamPageSkeleton() {
  return (
    <div className="p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <SkeletonBox className="h-9 w-64" />
            <SkeletonBox className="h-4 w-80" />
          </div>
          <SkeletonBox className="h-10 w-36 rounded-xl shrink-0" />
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/10 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBox key={i} className="h-5 w-16 pb-3" />
          ))}
        </div>

        {/* Search & count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <SkeletonBox className="h-10 w-full max-w-md rounded-xl" />
          <SkeletonBox className="h-4 w-32 shrink-0" />
        </div>

        {/* Member list */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-card-bg/50">
          <ul className="divide-y divide-white/5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <SkeletonBox className="size-12 rounded-full shrink-0" />
                  <div className="space-y-2">
                    <SkeletonBox className="h-5 w-32" />
                    <SkeletonBox className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <SkeletonBox className="h-7 w-16 rounded-lg" />
                  <SkeletonBox className="h-8 w-24 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* AI section */}
        <div className="mt-10 flex gap-4 p-5 rounded-2xl border border-white/10 bg-card-bg/50">
          <SkeletonBox className="size-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-5 w-48" />
            <SkeletonBox className="h-4 w-full max-w-md" />
            <SkeletonBox className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
