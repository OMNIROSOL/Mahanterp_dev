import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Eye,
  Edit,
  Package,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign
} from 'lucide-react';
import { cn } from '../utils/cn';
import DataTable from '../components/shared/DataTable';

interface SalesInvoiceItemTotalsReport {
  id: string;
  fromDate: string;
  toDate: string;
  description: string;
  totalAmount: number;
  itemCount: number;
}

const mockReports: SalesInvoiceItemTotalsReport[] = [
  {
    id: 'sii-report-1',
    fromDate: '01.03.2026',
    toDate: '31.03.2026',
    description: 'Q1 Product Performance Audit',
    totalAmount: 98450.75,
    itemCount: 45
  }
];

const SalesInvoiceTotalsByItemView: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<SalesInvoiceItemTotalsReport[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('sales_invoice_item_totals_reports');
    if (saved) {
      try {
        setReports(JSON.parse(saved));
      } catch (e) {
        setReports(mockReports);
      }
    } else {
      setReports(mockReports);
      localStorage.setItem('sales_invoice_item_totals_reports', JSON.stringify(mockReports));
    }
  }, []);

  const columns = [
    {
      id: 'Actions',
      header: 'Actions',
      className: 'w-24',
      accessor: (row: SalesInvoiceItemTotalsReport) => (
        <div className="flex items-center gap-2">
            <button
                onClick={() => navigate(`/reports/sales-invoice-totals-by-item/view/${row.id}`)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold"
                title="View"
            >
                <Eye size={14} />
            </button>
            <button
                onClick={() => navigate(`/reports/sales-invoice-totals-by-item/edit/${row.id}`)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                title="Edit"
            >
                <Edit size={14} />
            </button>
        </div>
      )
    },
    {
      id: 'Period',
      header: 'Reporting Period',
      accessor: (row: SalesInvoiceItemTotalsReport) => (
        <div className="flex flex-col">
            <span className="text-[13px] font-medium text-slate-800 tracking-tight leading-none">
                {row.fromDate} — {row.toDate}
            </span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mt-1 italic opacity-70">
                Analysis Range
            </span>
        </div>
      )
    },
    {
      id: 'Items',
      header: 'Item Count',
      accessor: (row: SalesInvoiceItemTotalsReport) => (
        <span className="text-[13px] font-black text-slate-600">{row.itemCount} Items</span>
      )
    },
    {
        id: 'Total',
        header: 'Total Revenue',
        accessor: (row: SalesInvoiceItemTotalsReport) => (
          <span className="text-[13px] font-black text-emerald-600">
            ${row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        )
    },
    {
      id: 'Description',
      header: 'Description',
      accessor: (row: SalesInvoiceItemTotalsReport) => (
        <span className="text-[13px] font-medium text-slate-900">{row.description}</span>
      )
    }
  ];

  const filteredReports = reports.filter(r => 
    (r.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.fromDate || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.toDate || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 font-sans text-left">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/reports')}>Reports</span>
            <ChevronRight size={10} className="opacity-50" />
            <span className="text-slate-400 uppercase">Sales Invoice Totals by Item</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">Sales Invoice Totals by Item</h1>
            <div className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-black border border-blue-100 flex items-center justify-center">
              {filteredReports.length} REPORTS
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 border border-indigo-700 rounded-xl text-[12px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-white uppercase tracking-widest"
            onClick={() => navigate('/reports/sales-invoice-totals-by-item/new')}
          >
            <Plus size={16} /> Create Report
          </button>
        </div>
      </div>

      {/* Search and Metadata Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2 border-b border-slate-50">
        <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 group max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500" size={14} />
                <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm transition-all"
                />
            </div>
        </div>

        <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Reports</span>
                <span className="text-[18px] font-black text-gray-900 leading-none font-sans">
                    {filteredReports.length}
                </span>
            </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable 
          data={filteredReports}
          columns={columns as any}
          className="border-none font-sans"
          tableClassName="w-full"
          hideDefaultPagination={true}
        />
      </div>
    </div>
  );
};

export default SalesInvoiceTotalsByItemView;
