import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Wallet,
  Printer,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2
} from 'lucide-react';
import apiService from '../services/apiService';
import { getCompanyProfile } from '../utils/companyProfile';
import { formatDateDMY } from '../utils/dateUtils';
import { cn } from '../utils/cn';

export const CashFlowStatementView: React.FC = () => {
  const navigate = useNavigate();
  const company = getCompanyProfile();

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(todayStr);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getCashFlowReport({ from, to });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load cash flow statement:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const money = (n: number | undefined | null) => {
    if (n === undefined || n === null) return '0.00';
    if (n < 0) return `(${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const netCash = data?.netCashMovement || 0;

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none no-print">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <Link to="/reports" className="hover:text-blue-600 transition-colors">Reports</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Statement of Cash Flows</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          {company.name} • Mukwa Road, Lusaka
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Statement of Cash Flows</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Cash inflows and outflows from operating, investing, and financing activities.
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer size={13} /> Print Statement
              </button>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-3 text-xs no-print pb-4 border-b border-gray-100">
            <span className="font-semibold text-gray-500">Period From:</span>
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

          {/* Net Cash Card */}
          <div className={cn(
            "rounded-xl p-6 border flex items-center justify-between",
            netCash >= 0 ? "bg-emerald-50/60 border-emerald-300 text-emerald-950" : "bg-rose-50/60 border-rose-300 text-rose-950"
          )}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block text-slate-600">
                Net Change in Cash & Cash Equivalents
              </span>
              <span className="text-3xl font-black font-mono mt-1 block">
                ZMW {money(netCash)}
              </span>
              <p className="text-xs text-gray-600 mt-1">
                For the period {formatDateDMY(from)} to {formatDateDMY(to)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center">
              {netCash >= 0 ? <TrendingUp size={24} className="text-emerald-600" /> : <TrendingDown size={24} className="text-rose-600" />}
            </div>
          </div>

          {/* Statement Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cash Flow Category</th>
                  <th className="py-3 px-4 text-right">Amount (ZMW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Generating cash flow statement...
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="bg-slate-50/80 font-bold text-slate-900">
                      <td colSpan={2} className="py-2.5 px-4 uppercase text-[10px] tracking-wider">
                        Cash flows from operating activities
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2 px-6 text-slate-700">Receipts from customers</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">
                        {money(data?.operatingActivities?.customerReceipts)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2 px-6 text-slate-700">Payments to suppliers</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-800">
                        ({money(data?.operatingActivities?.supplierPayments)})
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2 px-6 text-slate-700">Operational & staff expense payments</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-800">
                        ({money(data?.operatingActivities?.operationalExpenses)})
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t border-gray-200">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        Net cash provided by / (used in) operating activities
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-indigo-700">
                        {money(data?.operatingActivities?.netOperating)}
                      </td>
                    </tr>

                    <tr className="bg-slate-50/80 font-bold text-slate-900">
                      <td colSpan={2} className="py-2.5 px-4 uppercase text-[10px] tracking-wider">
                        Cash flows from investing activities
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2 px-6 text-slate-700">Capital expenditure / Purchase of fixed assets</td>
                      <td className="py-2 px-4 text-right font-mono text-gray-400">—</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t border-gray-200">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        Net cash provided by / (used in) investing activities
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">—</td>
                    </tr>

                    <tr className="bg-slate-50/80 font-bold text-slate-900">
                      <td colSpan={2} className="py-2.5 px-4 uppercase text-[10px] tracking-wider">
                        Cash flows from financing activities
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2 px-6 text-slate-700">Capital contributions & borrowings</td>
                      <td className="py-2 px-4 text-right font-mono text-gray-400">—</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t border-gray-200">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        Net cash provided by / (used in) financing activities
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">—</td>
                    </tr>
                  </>
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td className="py-3 px-4 uppercase text-[11px] tracking-wider">
                    Net increase / (decrease) in cash and cash equivalents:
                  </td>
                  <td className={cn(
                    "py-3 px-4 text-right font-mono text-base font-black",
                    netCash >= 0 ? "text-emerald-700" : "text-rose-700"
                  )}>
                    ZMW {money(netCash)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowStatementView;
