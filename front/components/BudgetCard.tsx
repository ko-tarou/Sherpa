
import React from 'react';
import { Budget } from '../types';

interface BudgetCardProps {
  budget: Budget;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget }) => {
  const percentage = Math.round((budget.actual / budget.planned) * 100);
  const remaining = budget.planned - budget.actual;
  
  // SVG calculation for circular progress
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${percentage}, 100`;

  return (
    <div className="bg-card-bg border border-white/10 rounded-[32px] p-10 h-full flex flex-col">
      <h3 className="text-2xl font-black mb-12 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
        予算状況
      </h3>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[320px] mb-12">
          <svg className="block mx-auto max-w-full" viewBox="0 0 36 36">
            <path 
              className="fill-none stroke-[#27272a] stroke-[3.5]" 
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            ></path>
            <path 
              className="fill-none stroke-primary stroke-[3.5] stroke-linecap-round transition-all duration-1000 ease-out" 
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeDasharray={strokeDasharray}
            ></path>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black text-white">{percentage}<small className="text-2xl">%</small></span>
            <span className="text-sm text-gray-500 font-bold tracking-[0.2em] mt-2">消化率</span>
          </div>
        </div>
        
        <div className="w-full grid grid-cols-1 gap-4">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold mb-1">計画予算</p>
              <p className="text-2xl font-black text-white">¥{budget.planned.toLocaleString()}</p>
            </div>
            <span className="material-symbols-outlined text-gray-700 text-3xl">account_balance_wallet</span>
          </div>
          
          <div className="p-8 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary font-bold mb-1">現在の実績</p>
              <p className="text-3xl font-black text-primary">¥{budget.actual.toLocaleString()}</p>
            </div>
            <span className="material-symbols-outlined text-primary text-3xl">receipt_long</span>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-6 w-full bg-white/5 rounded-2xl text-center border border-dashed border-white/10">
        <p className="text-base text-gray-400 font-medium">
          残り予算: <span className="text-white font-black ml-2 text-xl">¥{remaining.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
};

export default BudgetCard;
