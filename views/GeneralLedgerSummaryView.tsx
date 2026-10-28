import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Printer,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Search,
  Scale
} from 'lucide-react';
import apiService from '../services/apiService';
import { getCompanyProfile } from '../utils/companyProfile';
import { formatDateDMY } from '../utils/dateUtils';

interface GLSummaryRow {
  id: string;
  code: string;
  name: string;
  accountType: string;
  currency: string;
  openingBalance: number;
  debitMovement: number;
  creditMovement: number;
  netMovement: number;
  closingBalance: number;
}

export const GeneralLedgerSummaryView: React.FC = () => {
  const navigate = useNavigate();
  const company = getCompanyProfile();

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(todayStr);
  const [rows, setRows] = useState<GLSummaryRow[]>([]);
  const [totals, setTotals] = useState<any>({ debitMovement: 0, creditMovement: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getGlSummaryReport({ from, to });
      setRows(data?.rows || []);
      setTotals(data?.totals || { debitMovement: 0, creditMovement: 0 });
    } catch (err: any) {
      console.error('Failed to load GL summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = rows.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.accountType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const money = (n: number | undefined | null) => {
    if (n === undefined || n === null) return '—';
    if (n < 0) return `(${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
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
          <span className="text-slate-600">General Ledger Summary</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          {company.name} • Mukwa Road, Lusaka
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">General Ledger Summary</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Opening balances, period movements, and closing balances for all chart of accounts.
              </p>
            </div>

            <div className="flex items-center gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer size={13} /> Print Report
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 no-print">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-gray-500">From:</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-500">To:</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={loadData}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1"
              >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> Apply Filter
              </button>
            </div>

            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Opening Balance</th>
                  <th className="py-2.5 px-3 text-right">Debit Movement</th>
                  <th className="py-2.5 px-3 text-right">Credit Movement</th>
                  <th className="py-2.5 px-3 text-right">Net Movement</th>
                  <th className="py-2.5 px-3 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading general ledger summary...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                      No accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/accounts/view/${row.id}`)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      title="Click to drill down into account ledger"
                    >
                      <td className="py-2 px-3 font-mono text-gray-500">{row.code || '—'}</td>
                      <td className="py-2 px-3 font-semibold text-blue-700 hover:underline">{row.name}</td>
                      <td className="py-2 px-3 text-gray-500">{row.accountType}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{money(row.openingBalance)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">{money(row.debitMovement)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">{money(row.creditMovement)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-indigo-700">{money(row.netMovement)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900">{money(row.closingBalance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 uppercase text-[10px] tracking-wider text-right">
                      Total Movements:
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{money(totals.debitMovement)}</td>
                    <td className="py-3 px-3 text-right font-mono">{money(totals.creditMovement)}</td>
                    <td colSpan={2}></td>
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

export default GeneralLedgerSummaryView;
