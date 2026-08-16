import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Link as LinkIcon,
  Search
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/shared/Card';
import apiService from '../services/apiService';

interface LinkedTransaction {
  id: string;
  type: string;
  date: string;
  reference: string;
  contact: string;
  total: number;
}

const LinkedTransactionsView = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [transactions, setTransactions] = useState<LinkedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        if (id) {
          const data = await apiService.getExchangeRateTransactions(id);
          setTransactions(data);
        }
      } catch (err) {
        console.error('Failed to load transactions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, [id]);

  const filteredTransactions = transactions.filter(t => 
    t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    if (type.includes('Sales')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    if (type.includes('Purchase')) return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    return 'bg-blue-50 text-blue-700 ring-blue-600/20';
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-2 transition-colors group border-0 bg-transparent cursor-pointer"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Exchange Rates
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LinkIcon size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Linked Transactions</h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Transactions applying this exchange rate</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full md:w-64 text-sm font-medium transition-all"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden border border-slate-200/60 shadow-sm rounded-3xl bg-white animate-in slide-in-from-bottom duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium animate-pulse">
                    Loading linked transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No linked transactions found.
                  </td>
                </tr>
              ) : filteredTransactions.map((t) => (
                <tr key={t.id + t.type} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {new Date(t.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ring-1 ring-inset ${getTypeColor(t.type)}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">
                    {t.reference}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {t.contact}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                    {Number(t.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default LinkedTransactionsView;
