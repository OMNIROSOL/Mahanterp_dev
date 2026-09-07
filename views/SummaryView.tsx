import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import apiService from '../services/apiService';
import { Account } from '../types';
import FinancialStatements from '../components/FinancialStatements';

const SummaryView = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<(Account & { balance: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await apiService.getSummary();
        setAccounts(data);
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[480px]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Summary</h1>
          <p className="text-sm text-slate-500 mt-1">Balance sheet and profit &amp; loss</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-semibold text-[13px] rounded-lg hover:bg-slate-50"
          >
            Print
          </button>
          <button
            onClick={() => navigate('/accounts/new')}
            className="px-4 py-2 bg-blue-600 text-white font-semibold text-[13px] rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus size={14} className="mr-1.5" /> New Account
          </button>
        </div>
      </div>

      <FinancialStatements accounts={accounts} showNetProfit />
    </div>
  );
};

export default SummaryView;
