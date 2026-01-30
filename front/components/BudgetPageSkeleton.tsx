import React from 'react';

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className}`} />
);

export default function BudgetPageSkeleton() {
  return (
    <div className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <SkeletonBox className="h-3 w-32 mb-1" />
          <SkeletonBox className="h-9 w-48 mb-6" />
          <div className="flex flex-wrap gap-8 md:gap-12 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <SkeletonBox className="h-3 w-20" />
                <SkeletonBox className="h-6 w-28" />
                <SkeletonBox className="h-6 w-28" />
              </div>
            ))}
          </div>
          <SkeletonBox className="h-1 w-full max-w-full rounded-full mb-4" />
          <SkeletonBox className="h-4 w-48" />
        </div>

        {/* Table section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <SkeletonBox className="h-6 w-32" />
            <SkeletonBox className="h-10 w-36 rounded-xl" />
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {/* Table header */}
            <div className="bg-white/10 px-4 py-3 flex gap-4">
              <SkeletonBox className="h-5 w-20" />
              <SkeletonBox className="h-5 w-12" />
              <SkeletonBox className="h-5 w-24" />
              <SkeletonBox className="h-5 w-24" />
              <SkeletonBox className="h-5 w-16" />
            </div>
            {/* Table rows */}
            <div className="divide-y divide-white/5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-4 py-3 flex gap-4 items-center">
                  <SkeletonBox className="h-5 w-24" />
                  <SkeletonBox className="h-5 w-12" />
                  <SkeletonBox className="h-5 w-20" />
                  <SkeletonBox className="h-5 w-20" />
                  <SkeletonBox className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-4 w-full max-w-lg" />
          </div>
          <div className="flex gap-4 shrink-0">
            <SkeletonBox className="h-5 w-24" />
            <SkeletonBox className="h-5 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
