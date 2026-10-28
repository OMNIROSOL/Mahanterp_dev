import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Printer,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Search,
  Download,
  Users
} from 'lucide-react';
import apiService from '../services/apiService';
import { getCompanyProfile } from '../utils/companyProfile';
import { formatDateDMY } from '../utils/dateUtils';

interface PayslipSummaryRow {
  id: string;
  date: string;
  reference: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  nrc: string;
  tpin: string;
  department: string;
  basicPay: number;
  allowances: number;
  grossPay: number;
  paye: number;
  napsaEmployee: number;
  nhimaEmployee: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  napsaEmployer: number;
  nhimaEmployer: number;
  sdlEmployer: number;
  totalEmployerContributions: number;
  totalEmployerCost: number;
}

export const PayslipSummaryView: React.FC = () => {
  const navigate = useNavigate();
  const company = getCompanyProfile();

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(todayStr);
  const [rows, setRows] = useState<PayslipSummaryRow[]>([]);
  const [totals, setTotals] = useState<any>({
    basicPay: 0,
    allowances: 0,
    grossPay: 0,
    paye: 0,
    napsaEmployee: 0,
    nhimaEmployee: 0,
    totalDeductions: 0,
    netPay: 0,
    napsaEmployer: 0,
    nhimaEmployer: 0,
    sdlEmployer: 0,
    totalEmployerCost: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getPayslipSummaryReport({ from, to });
      setRows(data?.rows || []);
      setTotals(data?.totals || {});
    } catch (err: any) {
      console.error('Failed to load payslip summary report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [from, to]);

  const filteredRows = rows.filter(r =>
    r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.nrc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.tpin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const money = (n: number | undefined | null) => {
    if (n === undefined || n === null) return '—';
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportCSV = () => {
    const headers = [
      'Date', 'Reference', 'Employee Name', 'Employee Code', 'NRC', 'TPIN',
      'Basic Pay', 'Allowances', 'Gross Pay', 'PAYE', 'NAPSA (EE)', 'NHIMA (EE)',
      'Total Deductions', 'Net Pay', 'NAPSA (ER)', 'NHIMA (ER)', 'SDL (ER)', 'Total Cost'
    ];
    const csvRows = [
      headers.join(','),
      ...filteredRows.map(r => [
        `"${formatDateDMY(r.date)}"`,
        `"${r.reference || ''}"`,
        `"${r.employeeName}"`,
        `"${r.employeeCode}"`,
        `"${r.nrc}"`,
        `"${r.tpin}"`,
        r.basicPay,
        r.allowances,
        r.grossPay,
        r.paye,
        r.napsaEmployee,
        r.nhimaEmployee,
        r.totalDeductions,
        r.netPay,
        r.napsaEmployer,
        r.nhimaEmployer,
        r.sdlEmployer,
        r.totalEmployerCost
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-summary-${from}-to-${to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
          <span className="text-slate-600">Payslip Summary</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          {company.name} • Mukwa Road, Lusaka
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Statutory & Payroll Reports</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payslip Summary Report</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete breakdown of Basic Pay, Allowances, PAYE, NAPSA, NHIMA, SDL and Employer Costs.
              </p>
            </div>

            <div className="flex items-center gap-3 no-print">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
              >
                <Printer size={14} />
                Print Summary
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Search Employee / Ref / NRC</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Gross Pay</span>
              <span className="text-xl font-black text-slate-800">ZMW {money(totals.grossPay)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total PAYE</span>
              <span className="text-xl font-black text-amber-600">ZMW {money(totals.paye)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Deductions</span>
              <span className="text-xl font-black text-rose-600">ZMW {money(totals.totalDeductions)}</span>
            </div>
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block">Total Net Pay</span>
              <span className="text-xl font-black text-indigo-900">ZMW {money(totals.netPay)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Employer Cost</span>
              <span className="text-xl font-black text-slate-900">ZMW {money(totals.totalEmployerCost)}</span>
            </div>
          </div>

          {/* Report Data Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Ref</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">NRC / TPIN</th>
                  <th className="py-3 px-3 text-right">Basic Pay</th>
                  <th className="py-3 px-3 text-right">Allowances</th>
                  <th className="py-3 px-3 text-right font-black text-slate-700">Gross Pay</th>
                  <th className="py-3 px-3 text-right">PAYE</th>
                  <th className="py-3 px-3 text-right">NAPSA (EE)</th>
                  <th className="py-3 px-3 text-right">NHIMA (EE)</th>
                  <th className="py-3 px-3 text-right text-rose-600 font-black">Total Ded.</th>
                  <th className="py-3 px-3 text-right text-indigo-700 font-black bg-indigo-50/40">Net Pay</th>
                  <th className="py-3 px-3 text-right">NAPSA (ER)</th>
                  <th className="py-3 px-3 text-right">NHIMA (ER)</th>
                  <th className="py-3 px-3 text-right">SDL (ER)</th>
                  <th className="py-3 px-3 text-right font-black text-slate-900">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={16} className="text-center py-12 text-slate-400 font-semibold">
                      Loading payslip summary report...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-12 text-slate-400 font-semibold">
                      No payslips found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/payslips/view/${r.id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">{formatDateDMY(r.date)}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-600 whitespace-nowrap">{r.reference || '—'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {r.employeeName}
                        {r.employeeCode && <span className="text-[10px] text-slate-400 block">{r.employeeCode}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        <div>NRC: {r.nrc || '—'}</div>
                        <div>TPIN: {r.tpin || '—'}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">{money(r.basicPay)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{money(r.allowances)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">{money(r.grossPay)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{money(r.paye)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{money(r.napsaEmployee)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{money(r.nhimaEmployee)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600">{money(r.totalDeductions)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-indigo-700 bg-indigo-50/40">{money(r.netPay)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{money(r.napsaEmployer)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{money(r.nhimaEmployer)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{money(r.sdlEmployer)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">{money(r.totalEmployerCost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {!isLoading && filteredRows.length > 0 && (
                <tfoot className="bg-slate-50/90 border-t-2 border-slate-300 font-black text-xs">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-slate-500">Grand Totals:</td>
                    <td className="py-3 px-3 text-right text-slate-800">{money(totals.basicPay)}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{money(totals.allowances)}</td>
                    <td className="py-3 px-3 text-right text-slate-950 font-black">{money(totals.grossPay)}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{money(totals.paye)}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{money(totals.napsaEmployee)}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{money(totals.nhimaEmployee)}</td>
                    <td className="py-3 px-3 text-right text-rose-700 font-black">{money(totals.totalDeductions)}</td>
                    <td className="py-3 px-3 text-right text-indigo-800 font-black bg-indigo-100/50">{money(totals.netPay)}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{money(totals.napsaEmployer)}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{money(totals.nhimaEmployer)}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{money(totals.sdlEmployer)}</td>
                    <td className="py-3 px-3 text-right text-slate-950 font-black">{money(totals.totalEmployerCost)}</td>
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

export default PayslipSummaryView;
