import React from 'react';

interface BudgetPageProps {
  eventId: number;
}

const BudgetPage: React.FC<BudgetPageProps> = ({ eventId }) => {
  return (
    <div className="p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-8">予算管理</h1>
        <div className="text-center py-12 text-gray-500">
          予算管理機能は準備中です
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
