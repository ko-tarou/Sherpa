import React from 'react';

export default function CalendarPageSkeleton() {
  return (
    <div className="p-6 md:p-12 animate-pulse">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-8 w-48 bg-white/10 rounded-lg mb-2" />
            <div className="h-5 w-32 bg-white/5 rounded" />
          </div>
          <div className="h-10 w-40 bg-white/10 rounded-xl" />
        </div>
        <div className="grid grid-cols-7 gap-px bg-white/10 rounded-2xl overflow-hidden">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-card-bg" />
          ))}
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-card-bg" />
          ))}
        </div>
      </div>
    </div>
  );
}
