import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  Plus, 
  Trash2, 
  XCircle,
  ChevronLeft
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/shared/Card';
import apiService from '../services/apiService';

interface ExchangeRate {
  id: string;
  date: string;
  currencyCode: string;
  rate: number;
  transactionCount?: number;
}

const ExchangeRatesView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetCurrency = searchParams.get('currency') || 'USD';

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRate, setNewRate] = useState({ date: new Date().toISOString().split('T')[0], rate: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getExchangeRates();
      // Filter by target currency on frontend, or you could do it on backend
      const filtered = data.filter((r: any) => r.currencyCode === targetCurrency);
      setRates(filtered);
    } catch (err) {
      console.error('Failed to load rates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [targetCurrency]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRate.date || newRate.rate <= 0) return;

    try {
      await apiService.createExchangeRate({
        date: newRate.date,
        currencyCode: targetCurrency,
        rate: newRate.rate
      });
      fetchRates();
      setShowNewModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save exchange rate');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exchange rate record?')) return;

    try {
      await apiService.deleteExchangeRate(id);
      setRates(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete exchange rate');
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/settings/currencies')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-2 transition-colors group border-0 bg-transparent cursor-pointer"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Currencies
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarClock size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{targetCurrency} Exchange Rates</h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Manage historical exchange rates against the Base Currency (ZMW)</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            setNewRate({ date: new Date().toISOString().split('T')[0], rate: 1 });
            setShowNewModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 border-0 cursor-pointer"
        >
          <Plus size={20} />
          New Rate
        </button>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden border border-slate-200/60 shadow-sm rounded-3xl bg-white animate-in slide-in-from-bottom duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Effective Date</th>
                <th className="px-6 py-4">Currency Code</th>
                <th className="px-6 py-4">Exchange Rate (vs ZMW)</th>
                <th className="px-6 py-4 text-center">Linked Transactions</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium animate-pulse">
                    Loading rates...
                  </td>
                </tr>
              ) : rates.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {new Date(r.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-mono">{r.currencyCode}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-700">
                    {Number(r.rate).toFixed(6)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => navigate(`/settings/exchange-rates/${r.id}/transactions`)}
                      className="inline-flex items-center justify-center px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors border-0 cursor-pointer"
                    >
                      {r.transactionCount || 0}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDelete(r.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
                        title="Delete Rate"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && rates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center">
                        <CalendarClock size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-500">No exchange rates found for {targetCurrency}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                New Exchange Rate
              </h2>
              <button 
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                <input 
                  autoFocus
                  required
                  type="date" 
                  value={newRate.date}
                  onChange={(e) => setNewRate({ ...newRate, date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency</label>
                <input 
                  type="text" 
                  disabled
                  value={targetCurrency}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exchange Rate (vs ZMW)</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  step="0.000001"
                  value={newRate.rate || ''}
                  onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 focus:bg-white transition-all outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 border-0 cursor-pointer"
                >
                  Save Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeRatesView;
