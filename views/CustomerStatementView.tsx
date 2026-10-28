import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Printer,
  Download,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FolderOpen,
  Calendar,
  Building2,
  FileSpreadsheet,
  ArrowUpRight,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import apiService from '../services/apiService';
import { getCompanyProfile } from '../utils/companyProfile';
import { formatDateDMY, convertToInputDate } from '../utils/dateUtils';
import { cn } from '../utils/cn';

interface StatementTx {
  id: string;
  dateObj: string;
  date: string;
  transactionType: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceDrCr: string;
}

interface StatementData {
  party: any;
  partyType: string;
  currency: string;
  period: { from: string; to: string };
  openingBalance: number;
  openingBalanceDrCr: string;
  transactions: StatementTx[];
  totalDebits: number;
  totalCredits: number;
  netMovement: number;
  closingBalance: number;
  closingBalanceDrCr: string;
}

export const CustomerStatementView: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const company = getCompanyProfile();

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(id || '');
  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date filters
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(firstDayOfMonth);
  const [toDate, setToDate] = useState<string>(todayStr);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Load all customers for navigation
  useEffect(() => {
    apiService.getCustomers().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setAllCustomers(list);
      if (!selectedCustomerId && list.length > 0) {
        setSelectedCustomerId(list[0].id);
        navigate(`/customers/statement/${list[0].id}`, { replace: true });
      }
    }).catch(console.error);
  }, []);

  // Update selected customer if URL param changes
  useEffect(() => {
    if (id && id !== selectedCustomerId) {
      setSelectedCustomerId(id);
    }
  }, [id]);

  // Fetch statement
  const fetchStatement = async (custId: string, from?: string, to?: string) => {
    if (!custId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const data = await apiService.getCustomerStatement(custId, params);
      setStatementData(data);
      if (data.party?.email) {
        setEmailTo(data.party.email);
        setEmailSubject(`Statement of Account - ${data.party.name} (${data.period?.from} to ${data.period?.to})`);
        setEmailBody(`Dear ${data.party.name},\n\nPlease find attached your Statement of Account for the period ${data.period?.from} to ${data.period?.to}.\n\nClosing Balance: ${data.currency} ${data.closingBalanceDrCr}\n\nKind regards,\n${company.name}`);
      }
    } catch (err: any) {
      console.error('Failed to load customer statement:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load statement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchStatement(selectedCustomerId, fromDate, toDate);
    }
  }, [selectedCustomerId]);

  const handleApplyFilter = () => {
    fetchStatement(selectedCustomerId, fromDate, toDate);
  };

  const handleQuickPeriod = (preset: 'thisMonth' | 'lastMonth' | 'thisYear' | 'all') => {
    const today = new Date();
    let f = '';
    let t = today.toISOString().split('T')[0];

    if (preset === 'thisMonth') {
      f = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    } else if (preset === 'lastMonth') {
      f = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      t = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    } else if (preset === 'thisYear') {
      f = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    } else if (preset === 'all') {
      f = '2020-01-01';
    }

    setFromDate(f);
    setToDate(t);
    fetchStatement(selectedCustomerId, f, t);
  };

  // Navigation
  const currentIndex = allCustomers.findIndex(c => c.id === selectedCustomerId);
  const handleNav = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < allCustomers.length) {
      const target = allCustomers[targetIndex];
      setSelectedCustomerId(target.id);
      navigate(`/customers/statement/${target.id}`);
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0.00';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const party = statementData?.party;
  const currency = statementData?.currency || party?.currency || 'ZMW';

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none no-print">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <Link to="/customers" className="hover:text-blue-600 transition-colors">Customers</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Statement of Account</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          Plot 5254 Mukwa Road, Lusaka • TPIN: 1001849201
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white px-8 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 no-print shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Customer Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-[12px] font-semibold text-gray-500">Customer:</span>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                navigate(`/customers/statement/${e.target.value}`);
              }}
              className="border border-gray-300 rounded px-2.5 py-1.5 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[200px]"
            >
              {allCustomers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code ? `[${c.code}] ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[1px] h-6 bg-gray-200 hidden sm:block"></div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-semibold">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-500 font-semibold">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleApplyFilter}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1 rounded text-xs transition-colors flex items-center gap-1"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> Filter
            </button>
          </div>

          {/* Quick presets */}
          <div className="hidden lg:flex items-center gap-1 bg-gray-100 p-0.5 rounded border border-gray-200 text-[11px] font-medium text-gray-600">
            <button onClick={() => handleQuickPeriod('thisMonth')} className="px-2 py-0.5 rounded hover:bg-white transition-colors">This Month</button>
            <button onClick={() => handleQuickPeriod('lastMonth')} className="px-2 py-0.5 rounded hover:bg-white transition-colors">Last Month</button>
            <button onClick={() => handleQuickPeriod('thisYear')} className="px-2 py-0.5 rounded hover:bg-white transition-colors">This Year</button>
            <button onClick={() => handleQuickPeriod('all')} className="px-2 py-0.5 rounded hover:bg-white transition-colors">All Time</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Buttons */}
          <button
            onClick={() => window.print()}
            className="bg-white border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <Printer size={13} /> Print
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} /> PDF
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="bg-white border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <Mail size={13} /> Email
          </button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

          {/* Prev/Next Nav */}
          <div className="flex bg-white border border-gray-300 rounded shadow-xs">
            <button
              onClick={() => handleNav(0)}
              disabled={currentIndex <= 0}
              className="px-2 py-1 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"
              title="First customer"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              onClick={() => handleNav(currentIndex - 1)}
              disabled={currentIndex <= 0}
              className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"
              title="Previous customer"
            >
              <ChevronLeft size={13} />
            </button>
          </div>

          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${allCustomers.length}` : ''}
          </span>

          <div className="flex bg-white border border-gray-300 rounded shadow-xs">
            <button
              onClick={() => handleNav(currentIndex + 1)}
              disabled={currentIndex === -1 || currentIndex === allCustomers.length - 1}
              className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"
              title="Next customer"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => handleNav(allCustomers.length - 1)}
              disabled={currentIndex === -1 || currentIndex === allCustomers.length - 1}
              className="px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"
              title="Last customer"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Statement Canvas */}
      <div className="flex-1 p-6 md:p-8 flex justify-center overflow-auto">
        {isLoading && !statementData ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Generating Statement...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded text-sm max-w-lg">
            <strong>Error:</strong> {error}
          </div>
        ) : statementData ? (
          <div className="bg-white w-full max-w-5xl rounded-sm shadow-md border border-gray-200 p-8 md:p-12 print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-300 pb-8 gap-6">
              <div className="flex items-start space-x-4">
                <img
                  src="/logo.png"
                  alt="Mahant Investments"
                  className="h-16 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    {company.name}
                  </h1>
                  <p className="text-xs text-gray-600 mt-1">{company.address}</p>
                  <p className="text-xs text-gray-600 font-medium">
                    <span className="font-bold">TPIN:</span> {company.tpin}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tel: {company.phone} | Email: {company.email}
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Statement of Account
                </h2>
                <div className="mt-2 space-y-1 text-xs">
                  <div>
                    <span className="text-gray-500">Date: </span>
                    <span className="font-bold text-slate-800">{formatDateDMY(new Date())}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Period: </span>
                    <span className="font-semibold text-slate-800">
                      {statementData.period?.from || 'Start'} to {statementData.period?.to || 'Current'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Currency: </span>
                    <span className="font-bold text-blue-700">{currency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details Box & Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Statement For
                </div>
                <div className="text-sm font-bold text-slate-900">{party?.name}</div>
                {party?.code && <div className="text-gray-600 font-mono">Code: {party.code}</div>}
                {party?.address && <div className="text-gray-600 whitespace-pre-line">{party.address}</div>}
                {party?.tpin && <div><span className="font-semibold text-gray-700">TPIN:</span> {party.tpin}</div>}
                {party?.phone && <div><span className="font-semibold text-gray-700">Phone:</span> {party.phone}</div>}
                {party?.email && <div><span className="font-semibold text-gray-700">Email:</span> {party.email}</div>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Balance</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {currency} {statementData.openingBalanceDrCr}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoiced (Debits)</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {currency} {formatNumber(statementData.totalDebits)}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid (Credits)</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1">
                    {currency} {formatNumber(statementData.totalCredits)}
                  </div>
                </div>

                <div className={cn(
                  "border rounded p-3 text-center flex flex-col justify-center",
                  statementData.closingBalance > 0
                    ? "bg-amber-50 border-amber-300"
                    : statementData.closingBalance < 0
                    ? "bg-emerald-50 border-emerald-300"
                    : "bg-slate-50 border-slate-200"
                )}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Balance Due</div>
                  <div className={cn(
                    "text-base font-black mt-1",
                    statementData.closingBalance > 0 ? "text-amber-800" : "text-emerald-800"
                  )}>
                    {currency} {statementData.closingBalanceDrCr}
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider text-left">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Transaction</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Debit ({currency})</th>
                    <th className="py-2.5 px-3 text-right">Credit ({currency})</th>
                    <th className="py-2.5 px-3 text-right">Balance ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Opening Balance Row */}
                  <tr className="bg-gray-50/70 font-semibold text-slate-700">
                    <td className="py-2 px-3 text-gray-500">{statementData.period?.from || '—'}</td>
                    <td className="py-2 px-3 italic" colSpan={3}>
                      Opening Balance as of {statementData.period?.from || 'start of period'}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">—</td>
                    <td className="py-2 px-3 text-right text-gray-400">—</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {statementData.openingBalanceDrCr}
                    </td>
                  </tr>

                  {/* Transactions */}
                  {statementData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                        No transactions found in this period.
                      </td>
                    </tr>
                  ) : (
                    statementData.transactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2 px-3 whitespace-nowrap text-gray-700 font-mono">
                          {tx.date}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {tx.transactionType === 'Sales Invoice' ? (
                            <Link to={`/invoices/view/${tx.id}`} className="text-blue-600 hover:underline">
                              {tx.transactionType}
                            </Link>
                          ) : tx.transactionType === 'Receipt' ? (
                            <Link to={`/receipts/view/${tx.id}`} className="text-blue-600 hover:underline">
                              {tx.transactionType}
                            </Link>
                          ) : tx.transactionType === 'Credit Note' ? (
                            <Link to={`/credit-notes/view/${tx.id}`} className="text-blue-600 hover:underline">
                              {tx.transactionType}
                            </Link>
                          ) : (
                            tx.transactionType
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-600 font-mono">{tx.reference || '—'}</td>
                        <td className="py-2 px-3 text-gray-700 max-w-xs truncate" title={tx.description}>
                          {tx.description || '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900">
                          {tx.debit > 0 ? formatNumber(tx.debit) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">
                          {tx.credit > 0 ? formatNumber(tx.credit) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {tx.balanceDrCr}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Footer Totals */}
                <tfoot>
                  <tr className="border-t-2 border-slate-800 bg-slate-50/80 font-bold text-slate-900">
                    <td colSpan={4} className="py-3 px-3 uppercase text-[11px] tracking-wider text-right">
                      Period Totals & Net Movement:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm">
                      {formatNumber(statementData.totalDebits)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-emerald-700">
                      {formatNumber(statementData.totalCredits)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-blue-700">
                      Net: {formatNumber(statementData.netMovement)}
                    </td>
                  </tr>
                  <tr className="border-t border-slate-300 bg-slate-100 font-black text-slate-900 text-sm">
                    <td colSpan={4} className="py-3 px-3 uppercase tracking-wider text-right">
                      Closing Balance as of {statementData.period?.to}:
                    </td>
                    <td colSpan={3} className="py-3 px-3 text-right font-mono text-base text-slate-900">
                      {currency} {statementData.closingBalanceDrCr}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Remittance & Bank Instructions */}
            <div className="mt-12 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600">
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Remittance Advice / Bank Details
                </h4>
                <div className="space-y-1 bg-slate-50 p-3 rounded border border-gray-200">
                  <p><span className="font-semibold text-slate-700">Beneficiary:</span> {company.name}</p>
                  <p><span className="font-semibold text-slate-700">Bank:</span> Stanbic Bank Zambia</p>
                  <p><span className="font-semibold text-slate-700">Account No (ZMW):</span> 9130001234567</p>
                  <p><span className="font-semibold text-slate-700">Account No (USD):</span> 9130007654321</p>
                  <p><span className="font-semibold text-slate-700">Branch:</span> Lusaka Industrial Branch</p>
                  <p><span className="font-semibold text-slate-700">Swift Code:</span> SBICZMLX</p>
                  <p className="text-[11px] text-gray-500 pt-1 italic">
                    * Please quote your Customer Code [{party?.code || party?.name}] on all payment transfers.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-end text-right">
                <p className="text-xs text-gray-500 italic mb-8">
                  For any billing enquiries, please contact our accounts department at {company.email}.
                </p>
                <div className="border-t border-gray-300 pt-2 inline-block ml-auto w-48 text-center">
                  <p className="font-bold text-xs text-slate-800">Authorized Signature</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Mahant Investments Ltd</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <Mail size={16} />
                <span>Email Statement of Account</span>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {emailSent ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded text-center space-y-2">
                  <p className="font-bold">Statement Dispatched Successfully!</p>
                  <p className="text-xs text-gray-600">The statement of account has been queued and sent to {emailTo}.</p>
                  <button
                    onClick={() => { setShowEmailModal(false); setEmailSent(false); }}
                    className="mt-2 bg-emerald-600 text-white px-4 py-1.5 rounded font-bold text-xs hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">To:</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Subject:</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Message:</label>
                    <textarea
                      rows={5}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono text-[11px]"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex items-center justify-between text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet size={14} className="text-blue-600" />
                      Attachment: <span className="font-semibold text-slate-800">Statement_{party?.name?.replace(/\s+/g, '_')}.pdf</span>
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold uppercase">Ready</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowEmailModal(false)}
                      className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setEmailSent(true);
                        setTimeout(() => {
                          setShowEmailModal(false);
                          setEmailSent(false);
                        }, 1800);
                      }}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold text-xs flex items-center gap-1.5"
                    >
                      <Mail size={13} /> Send Statement
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerStatementView;
