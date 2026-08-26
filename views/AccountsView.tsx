import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import apiService from '../services/apiService';
import { Account } from '../types';
import FinancialStatements from '../components/FinancialStatements';

const AccountsView = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getAccounts();
        setAccounts(data);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const query = searchQuery.toLowerCase();
    return accounts.filter(
      (account) =>
        (account.name || '').toLowerCase().includes(query) ||
        (account.type || account.accountType || '').toLowerCase().includes(query) ||
        (account.code || '').toLowerCase().includes(query)
    );
  }, [accounts, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[480px]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chart of Accounts</h1>
          <p className="text-slate-500 text-sm mt-1">
            Balance sheet and profit &amp; loss from your ledger accounts
          </p>
        </div>
        <button
          onClick={() => navigate('/accounts/new')}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-[12px] font-semibold hover:bg-blue-700 transition-all flex items-center uppercase tracking-wide"
        >
          <Plus size={16} className="mr-2" /> New Account
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          type="text"
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white"
        />
      </div>

      <FinancialStatements accounts={filteredAccounts} />
    </div>
  );
};

export default AccountsView;
