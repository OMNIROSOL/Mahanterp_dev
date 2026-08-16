import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/shared/Card';
import apiService from '../services/apiService';

interface UnrealizedFxReportRow {
  id: string;
  account: string;
  foreignBalance: number;
  currency: string;
  exchangeRate: number;
  convertedBalance: number;
  closingBalance: number;
  gainLoss: number;
  isGain: boolean;
}

const UnrealizedFxGainsView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<UnrealizedFxReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getUnrealizedFxReport();
      setData(res);
    } catch (err) {
      console.error('Failed to load Unrealized FX report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const filteredData = data.filter(row => 
    row.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.currency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGainLoss = filteredData.reduce((sum, row) => sum + (row.isGain ? row.gainLoss : -row.gainLoss), 0);
  const isNetGain = totalGainLoss >= 0;

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-2 transition-colors group border-0 bg-transparent cursor-pointer"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isNetGain ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isNetGain ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Unrealized Foreign Exchange Gains (Losses)</h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Summary of open foreign balances translated at current exchange rates</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full md:w-64 text-sm font-medium transition-all"
            />
          </div>
          <button 
            onClick={fetchReport}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors bg-white cursor-pointer"
            title="Refresh Report"
          >
            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <Card className="p-6 bg-slate-900 text-white rounded-3xl overflow-hidden relative border border-slate-800 shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400 via-transparent to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Net Unrealized FX {isNetGain ? 'Gain' : 'Loss'}</h2>
            <div className="text-4xl font-black tabular-nums tracking-tight">
              {Math.abs(totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ZMW
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200/60 shadow-sm rounded-3xl bg-white animate-in slide-in-from-bottom duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4 text-right">Foreign Balance</th>
                <th className="px-6 py-4 text-right">Exchange rate</th>
                <th className="px-6 py-4 text-right">Converted balance</th>
                <th className="px-6 py-4 text-right">Closing balance</th>
                <th className="px-6 py-4 text-right">Gain / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium animate-pulse">
                    Calculating exchange rates...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No open foreign balances found.
                  </td>
                </tr>
              ) : filteredData.map((row) => (
                <tr key={row.account} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {row.account}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-slate-700">
                    {row.foreignBalance < 0 ? '- ' : ''}{row.currency} {Math.abs(row.foreignBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-slate-500">
                    {row.currency} 1.00 = ZMW {Number(row.exchangeRate).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-slate-700">
                    {row.convertedBalance < 0 ? '- ' : ''}ZMW {Math.abs(row.convertedBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-slate-700">
                    {row.closingBalance < 0 ? '- ' : ''}ZMW {Math.abs(row.closingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold">
                    {row.gainLoss === 0 ? (
                      <span className="text-slate-400">0</span>
                    ) : (
                      <span className={row.isGain ? 'text-emerald-600' : 'text-rose-600'}>
                        {row.gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {row.isGain ? 'Cr' : 'Dr'}
                      </span>
                    )}
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

export default UnrealizedFxGainsView;
