
import React from 'react';

interface CountdownCardProps {
  days: number;
}

const CountdownCard: React.FC<CountdownCardProps> = ({ days }) => {
  return (
    <div className="bg-card-bg border border-white/10 rounded-[32px] p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute -top-10 -right-10 opacity-5">
        <span className="material-symbols-outlined text-[300px] text-white">event</span>
      </div>
      <p className="text-primary text-xl font-black uppercase tracking-[0.2em] mb-4">Event Countdown</p>
      <div className="flex items-baseline gap-6 relative z-10">
        <span className="text-gray-400 text-3xl font-bold">開催まであと</span>
        <span className="text-[160px] font-black leading-none text-white tracking-tighter transition-all duration-700">
          {days}
        </span>
        <span className="text-5xl font-black text-primary">日</span>
      </div>
    </div>
  );
};

export default CountdownCard;
