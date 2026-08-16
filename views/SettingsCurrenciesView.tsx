import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Plus, 
  Search, 
  Trash2, 
  XCircle,
  ChevronLeft,
  CalendarClock
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../components/shared/Card';
import apiService from '../services/apiService';

interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
  isSystem?: boolean;
  decimalPlaces?: number;
}

const SettingsCurrenciesView = () => {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCurrency, setNewCurrency] = useState<Partial<CurrencyItem>>({ code: '', name: '', symbol: '', decimalPlaces: 2 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrencies = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getCurrencies();
      setCurrencies(data);
    } catch (err) {
      console.error('Failed to load currencies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleDecimalPlacesChange = async (code: string, decimals: number) => {
    const cur = currencies.find(c => c.code === code);
    if (!cur) return;
    
    // Optimistic update
    setCurrencies(prev => prev.map(c => c.code === code ? { ...c, decimalPlaces: decimals } : c));
    
    try {
      await apiService.updateCurrency(code, {
        ...cur,
        decimalPlaces: decimals
      });
    } catch (err) {
      console.error('Failed to update decimal places:', err);
      // Revert on error
      fetchCurrencies();
    }
  };

  const filteredCurrencies = currencies.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) return;

    const codeUpper = newCurrency.code.toUpperCase();
    if (currencies.some(c => c.code === codeUpper)) {
      alert('A currency with this code already exists.');
      return;
    }

    try {
      const created = await apiService.createCurrency({
        code: codeUpper,
        name: newCurrency.name,
        symbol: newCurrency.symbol,
        isSystem: false,
        decimalPlaces: newCurrency.decimalPlaces ?? 2
      });
      setCurrencies(prev => [...prev, created]);
      setShowNewModal(false);
      setNewCurrency({ code: '', name: '', symbol: '', decimalPlaces: 2 });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save currency');
    }
  };

  const handleDelete = async (code: string) => {
    const cur = currencies.find(c => c.code === code);
    if (cur?.isSystem) {
      alert('System currencies cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the currency ${code}?`)) return;

    try {
      await apiService.deleteCurrency(code);
      setCurrencies(prev => prev.filter(c => c.code !== code));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete currency');
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-2 transition-colors group border-0 bg-transparent cursor-pointer"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Settings
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Coins size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Currencies</h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Configure the exchange and display currencies used in ERP documents</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            setNewCurrency({ code: '', name: '', symbol: '' });
            setShowNewModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 border-0 cursor-pointer"
        >
          <Plus size={20} />
          New Currency
        </button>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden border border-slate-200/60 shadow-sm rounded-3xl bg-white animate-in slide-in-from-bottom duration-300">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search currencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Currency Code</th>
                <th className="px-6 py-4">Currency Name</th>
                <th className="px-6 py-4">Symbol</th>
                <th className="px-6 py-4">Decimal Places</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium animate-pulse">
                    Loading currencies...
                  </td>
                </tr>
              ) : filteredCurrencies.map((c) => (
                <tr key={c.code} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-mono">{c.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700 font-bold">{c.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-500">
                    {c.symbol}
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      min="0"
                      max="4"
                      step="1"
                      value={c.decimalPlaces ?? 2} 
                      onChange={(e) => handleDecimalPlacesChange(c.code, parseInt(e.target.value) || 0)}
                      className="w-16 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold">
                    {c.isSystem ? (
                      <span className="text-indigo-600 bg-indigo-50/50 border border-indigo-100 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold">System Default</span>
                    ) : (
                      <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold">Custom</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.code !== 'ZMW' && (
                        <Link 
                          to={`/settings/exchange-rates?currency=${c.code}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors no-underline"
                        >
                          <CalendarClock size={14} />
                          Manage Rates
                        </Link>
                      )}
                      {!c.isSystem && (
                        <button 
                          onClick={() => handleDelete(c.code)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
                          title="Delete Currency"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredCurrencies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center">
                        <Coins size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-500">No currencies found</p>
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
                New Currency
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency Code (3 Letters)</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  maxLength={3}
                  value={newCurrency.code || ''}
                  onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                  placeholder="e.g. USD"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 focus:bg-white transition-all outline-none uppercase font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency Name</label>
                <input 
                  required
                  type="text" 
                  value={newCurrency.name || ''}
                  onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                  placeholder="e.g. US Dollar"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Symbol</label>
                <input 
                  required
                  type="text" 
                  maxLength={5}
                  value={newCurrency.symbol || ''}
                  onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                  placeholder="e.g. $"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 focus:bg-white transition-all outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Decimal Places</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  max="4"
                  step="1"
                  value={newCurrency.decimalPlaces ?? 2}
                  onChange={(e) => setNewCurrency({ ...newCurrency, decimalPlaces: parseInt(e.target.value) || 0 })}
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
                  Save Currency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsCurrenciesView;
