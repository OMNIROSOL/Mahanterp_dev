
import React from 'react';
import { FinancialSummary } from '../types';

interface SummaryCardsProps {
  summary: FinancialSummary;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const cards = [
    { title: 'Net Worth', value: summary.netWorth, icon: 'fa-wallet', color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Total Assets', value: summary.totalAssets, icon: 'fa-building-columns', color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Total Liabilities', value: summary.totalLiabilities, icon: 'fa-file-invoice-dollar', color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Profit (Period)', value: summary.profitThisMonth, icon: 'fa-chart-line', color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{card.title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className={`${card.bg} ${card.color} p-4 rounded-full`}>
            <i className={`fas ${card.icon} text-xl`}></i>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
