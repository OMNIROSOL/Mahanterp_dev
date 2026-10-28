import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LineChart,
  Printer,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Search,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import apiService from '../services/apiService';
import { getCompanyProfile } from '../utils/companyProfile';
import { formatDateDMY } from '../utils/dateUtils';

interface AgedPayableRow {
  id: string;
  supplier: string;
  code: string;
  currency: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  total: number;
}

export const AgedPayablesView: React.FC = () => {
  const navigate = useNavigate();
  const company = getCompanyProfile();
  const [rows, setRows] = useState<AgedPayableRow[]>([]);
  const [totals, setTotals] = useState<any>({
    current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0, total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAgedPayables();
      setRows(data?.rows || []);
      setTotals(data?.totals || {});
    } catch (err: any) {
      console.error('Failed to load aged payables:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = rows.filter(r =>
    r.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const money = (n: number | undefined | null) => {
    if (!n) return '—';
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none no-print">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <Link to="/reports" className="hover:text-blue-600 transition-colors">Reports</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Aged Payables</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          {company.name} • Mukwa Road, Lusaka
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Aged Payables</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of outstanding supplier balances categorized by due date aging brackets.
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer size={13} /> Print Report
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 no-print">
            <div className="relative max-w-sm w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-xs"
              title="Refresh"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Currency</th>
                  <th className="py-2.5 px-3 text-right">Current</th>
                  <th className="py-2.5 px-3 text-right">1 – 30 Days</th>
                  <th className="py-2.5 px-3 text-right">31 – 60 Days</th>
                  <th className="py-2.5 px-3 text-right">61 – 90 Days</th>
                  <th className="py-2.5 px-3 text-right">&gt; 90 Days</th>
                  <th className="py-2.5 px-3 text-right">Total Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading aged payables...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                      No overdue or outstanding supplier payables found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/suppliers/statement/${row.id}`)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      title="Click to view supplier statement"
                    >
                      <td className="py-2 px-3 font-semibold text-blue-700 hover:underline">
                        {row.supplier}
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-500">{row.code || '—'}</td>
                      <td className="py-2 px-3 font-bold text-gray-600">{row.currency}</td>
                      <td className="py-2 px-3 text-right font-mono">{money(row.current)}</td>
                      <td className="py-2 px-3 text-right font-mono">{money(row.days1_30)}</td>
                      <td className="py-2 px-3 text-right font-mono">{money(row.days31_60)}</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-700">{money(row.days61_90)}</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-700 font-bold">{money(row.days90Plus)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900">{money(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 uppercase text-[10px] tracking-wider">Total (ZMW)</td>
                    <td className="py-3 px-3 text-right font-mono">{money(totals.current)}</td>
                    <td className="py-3 px-3 text-right font-mono">{money(totals.days1_30)}</td>
                    <td className="py-3 px-3 text-right font-mono">{money(totals.days31_60)}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">{money(totals.days61_90)}</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-700">{money(totals.days90Plus)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-800">{money(totals.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgedPayablesView;
