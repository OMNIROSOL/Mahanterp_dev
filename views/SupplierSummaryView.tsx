import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Printer,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Search,
  Building2,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import apiService from '../services/apiService';
import { getCompanyProfile } from '../utils/companyProfile';

interface SupplierSummaryRow {
  id: string;
  code: string;
  name: string;
  currency: string;
  tpin: string;
  phone: string;
  email: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
}

export const SupplierSummaryView: React.FC = () => {
  const navigate = useNavigate();
  const company = getCompanyProfile();
  const [rows, setRows] = useState<SupplierSummaryRow[]>([]);
  const [totals, setTotals] = useState<any>({
    totalBilled: 0,
    totalPaid: 0,
    balance: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSupplierSummaryReport();
      setRows(data?.rows || []);
      setTotals(data?.totals || { totalBilled: 0, totalPaid: 0, balance: 0 });
    } catch (err: any) {
      console.error('Failed to load supplier summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = rows.filter(r =>
    (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.code && r.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.tpin && r.tpin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const money = (n: number | undefined | null) => {
    if (n === undefined || n === null) return '0.00';
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
          <span className="text-slate-600">Supplier Summary</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          {company.name} • Mukwa Road, Lusaka
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Title Bar */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <Users size={20} />
              </span>
              <h1 className="text-2xl font-black text-slate-800">Supplier Summary</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Comprehensive list of all suppliers with cumulative billed, paid, and outstanding balances.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search supplier, code, TPIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs w-64 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
              title="Refresh"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-900 font-bold text-xs flex items-center gap-1.5"
            >
              <Printer size={14} /> Print Report
            </button>
          </div>
        </div>

        {/* Printable Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-8 print:p-0 print:border-none">
          {/* Official Company Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Company Logo" className="h-12 w-auto object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">{company.name}</h2>
                <p className="text-[11px] text-slate-600">{company.address || 'Plot 5254 Mukwa Road, Heavy Industrial Area, Lusaka, Zambia'}</p>
                <p className="text-[11px] font-semibold text-slate-700">TPIN: {company.tpin || '1001849201'} | Phone: {company.phone || '+260 211 287820'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-bold border border-slate-200">
                Supplier Summary Report
              </span>
              <p className="text-xs text-slate-500 mt-2">Active Suppliers: <span className="font-bold text-slate-800">{filteredRows.length}</span></p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[10px] uppercase font-bold text-slate-600 bg-slate-50">
                  <th className="py-2.5 px-3 text-left">Code</th>
                  <th className="py-2.5 px-3 text-left">Supplier Name</th>
                  <th className="py-2.5 px-3 text-left">TPIN</th>
                  <th className="py-2.5 px-3 text-left">Currency</th>
                  <th className="py-2.5 px-3 text-right">Total Billed</th>
                  <th className="py-2.5 px-3 text-right">Total Paid / Debit</th>
                  <th className="py-2.5 px-3 text-right">Balance Payable</th>
                  <th className="py-2.5 px-3 text-center no-print">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                      Loading supplier summary...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{r.code || '—'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        <Link to={`/suppliers/statement/${r.id}`} className="hover:text-blue-600 hover:underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{r.tpin || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                          {r.currency}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">{money(r.totalBilled)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">{money(r.totalPaid)}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${r.balance > 0 ? 'text-rose-700' : r.balance < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {money(r.balance)}
                      </td>
                      <td className="py-2.5 px-3 text-center no-print">
                        <Link
                          to={`/suppliers/statement/${r.id}`}
                          className="px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded inline-flex items-center gap-1"
                        >
                          Statement <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!isLoading && filteredRows.length > 0 && (
                <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 uppercase text-[10px] tracking-wider">Grand Total (ZMW)</td>
                    <td className="py-3 px-3 text-right font-mono">{money(totals.totalBilled)}</td>
                    <td className="py-3 px-3 text-right font-mono">{money(totals.totalPaid)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-700">{money(totals.balance)}</td>
                    <td className="no-print"></td>
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

export default SupplierSummaryView;
