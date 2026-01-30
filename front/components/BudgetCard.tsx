import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface BudgetCardProps {
  budget: {
    incomePlanned?: number;
    incomeActual?: number;
    expensePlanned?: number;
    expenseActual?: number;
    remaining?: number;
    planned?: number;
    actual?: number;
  };
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget }) => {
  const { t } = useTranslation();
  const incomeP = budget.incomePlanned ?? 0;
  const incomeA = budget.incomeActual ?? 0;
  const expenseP = budget.expensePlanned ?? 0;
  const expenseA = budget.expenseActual ?? 0;
  const remaining = budget.remaining ?? (incomeA - expenseA);
  const planned = budget.planned ?? expenseP;
  const actual = budget.actual ?? expenseA;
  const percentage = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  const strokeDasharray = `${percentage}, 100`;

  return (
    <div className="bg-card-bg border border-white/10 rounded-[32px] p-10 h-full flex flex-col">
      <h3 className="text-2xl font-black mb-12 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
        {t('budgetStatus')}
      </h3>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[320px] mb-12">
          <svg className="block mx-auto max-w-full" viewBox="0 0 36 36">
            <path
              className="fill-none stroke-[#27272a] stroke-[3.5]"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="fill-none stroke-primary stroke-[3.5] stroke-linecap-round transition-all duration-1000 ease-out"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeDasharray={strokeDasharray}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black text-white">{percentage}<small className="text-2xl">%</small></span>
            <span className="text-sm text-gray-500 font-bold tracking-[0.2em] mt-2">{t('expenditureRate')}</span>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 gap-4">
          <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400/80 font-bold mb-1">{t('income')}</p>
              <p className="text-xl font-black text-emerald-400">¥{incomeA.toLocaleString()}</p>
            </div>
            <span className="material-symbols-outlined text-emerald-400/60 text-2xl">trending_up</span>
          </div>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold mb-1">{t('expenseBudgetActual')}</p>
              <p className="text-xl font-black text-white">¥{expenseP.toLocaleString()} / ¥{expenseA.toLocaleString()}</p>
            </div>
            <span className="material-symbols-outlined text-gray-700 text-2xl">account_balance_wallet</span>
          </div>
          <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary font-bold mb-1">{t('balance')}</p>
              <p className="text-2xl font-black text-primary">¥{remaining.toLocaleString()}</p>
            </div>
            <span className="material-symbols-outlined text-primary text-2xl">receipt_long</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetCard;
