import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  Share2, 
  Calendar,
  Package,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import apiService from '../services/apiService';
import { cn } from '../utils/cn';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';

interface SalesInvoiceItemTotalRow {
  itemName: string;
  sku: string;
  quantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  currency: string;
}

const ViewSalesInvoiceTotalsByItemReportView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock fetching report metadata
  const report = useMemo(() => {
    return {
      id: id,
      fromDate: '01.03.2026',
      toDate: '31.03.2026',
      description: 'Q1 Product Performance Audit',
      division: 'All Categories'
    };
  }, [id]);

  const [items, setItems] = React.useState<any[]>([]);
  const [allInvoices, setAllInvoices] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [itemsData, invs] = await Promise.all([
          apiService.getItems(),
          apiService.getInvoices()
        ]);
        setItems(itemsData);
        setAllInvoices(invs);
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    if (val === 0) return '—';
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExportPDF = () => {
    const headers = ['Currency', 'Item Name / SKU', 'Qty Sold', 'Avg. Unit Price', 'Total Revenue'];
    const rows: any[][] = [];
    currencies.forEach(curr => {
      groupedData[curr].forEach(row => {
        rows.push([curr, `${row.itemName} (${row.sku})`, row.quantitySold, row.averagePrice.toFixed(2), row.totalRevenue.toFixed(2)]);
      });
    });
    exportToPDF('Sales Invoice Totals By Item', 'sales_totals_by_item', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Currency', 'Item Name / SKU', 'Qty Sold', 'Avg. Unit Price', 'Total Revenue'];
    const rows: any[][] = [];
    currencies.forEach(curr => {
      groupedData[curr].forEach(row => {
        rows.push([curr, `${row.itemName} (${row.sku})`, row.quantitySold, row.averagePrice.toFixed(2), row.totalRevenue.toFixed(2)]);
      });
    });
    exportToCSV('sales_totals_by_item', headers, rows);
  };

  // Aggregate totals by item
  const totalsByItem = useMemo(() => {
    return items.map(item => {
      let quantitySold = 0;
      let totalRevenue = 0;

      allInvoices.forEach(inv => {
        if (inv.status === 'Draft') return;
        
        // Find line items matching this inventory item
        const matchingLines = (inv.items || []).filter((line: any) => 
          line.itemId === item.id || line.item?.id === item.id
        );

        matchingLines.forEach((line: any) => {
          const qty = parseFloat(line.qty) || 0;
          const price = parseFloat(line.unitPrice) || 0;
          quantitySold += qty;
          totalRevenue += qty * price;
        });
      });

      return {
        itemName: item.itemName,
        sku: item.itemCode || 'N/A',
        quantitySold: quantitySold,
        totalRevenue: totalRevenue,
        averagePrice: quantitySold > 0 ? totalRevenue / quantitySold : 0,
        currency: 'ZMW' // Assuming default for now
      };
    }).filter(row => row.quantitySold > 0);
  }, [items, allInvoices]);

  const groupedData = useMemo(() => {
    const groups: Record<string, SalesInvoiceItemTotalRow[]> = {};
    totalsByItem.forEach(item => {
      if (!groups[item.currency]) groups[item.currency] = [];
      groups[item.currency].push(item);
    });
    return groups;
  }, [totalsByItem]);

  const currencies = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => {
      if (a === 'ZMW') return -1;
      if (b === 'ZMW') return 1;
      return a.localeCompare(b);
    });
  }, [groupedData]);

  if (isLoading) {
    return <div className="p-20 text-center font-bold text-slate-400">LOADING DATABASE REPORT...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 animate-in fade-in duration-700 font-sans text-left">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reports/sales-invoice-totals-by-item')}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-indigo-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight text-left">Product Analysis</h1>
            <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest text-left">ID: {id?.replace('sii-report-', '')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm text-slate-600 uppercase tracking-widest">
            <Share2 size={16} /> Share
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[12px] font-black hover:bg-emerald-100 transition-all shadow-sm text-emerald-600 uppercase tracking-widest">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm text-slate-600 uppercase tracking-widest">
            <Download size={16} /> PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 border border-indigo-700 rounded-xl text-[12px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-white uppercase tracking-widest"
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Report Document */}
      <div className="max-w-[1400px] mx-auto bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="p-8 space-y-8">
          {/* Document Header */}
          <div className="text-center space-y-1">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">MAHANT INVESTMENT LTD</h2>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sales Invoice Totals by Item</h3>
          </div>

          {/* Report Metadata */}
          <div className="flex justify-between items-end border-b border-slate-100 pb-6 text-slate-400">
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <Calendar size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest block text-slate-400">Analysis Period</span>
                  <span className="text-[12px] font-bold text-slate-700">
                    {report?.fromDate} — {report?.toDate}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8 text-right">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5 text-slate-400">Items Sold</span>
                <span className="text-[12px] font-bold text-slate-900">{totalsByItem.length}</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5">Category</span>
                <span className="text-[12px] font-bold text-slate-900">{report?.division}</span>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900">Item Name / SKU</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Qty Sold</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Avg. Unit Price</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currencies.map(curr => (
                  <React.Fragment key={curr}>
                    {/* Currency Group Header */}
                    <tr className="bg-slate-50/80">
                      <td colSpan={4} className="py-2 px-3 text-left">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{curr}</span>
                      </td>
                    </tr>
                    {groupedData[curr].map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 pr-6 pl-3 text-left flex flex-col">
                          <span className="text-[12px] font-bold text-blue-400 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-none">{row.itemName}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{row.sku}</span>
                        </td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-500 tabular-nums">{row.quantitySold} units</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.averagePrice)}</td>
                        <td className="py-1.5 text-right font-black text-[12px] text-emerald-600 tabular-nums">{formatCurrency(row.totalRevenue)}</td>
                      </tr>
                    ))}
                    {/* Currency Sub-total logic for items if needed, but usually just a grand total */}
                    <tr className="border-t border-slate-200 bg-slate-50/30">
                      <td className="py-2 pr-6 pl-3 font-black text-[11px] text-slate-700 uppercase tracking-widest italic text-right" colSpan={2}>Aggregate Revenue {curr}</td>
                      <td colSpan={2} className="py-2 text-right font-black text-[12px] text-indigo-600 tabular-nums underline decoration-1 underline-offset-2">
                        {formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.totalRevenue, 0))}
                      </td>
                    </tr>
                    {/* Spacer row */}
                    <tr className="h-4"></tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-4 font-black text-[12px] text-slate-900 uppercase tracking-widest text-left">End of Product Audit</td>
                  <td colSpan={3} className="py-4 text-right text-slate-400 text-[10px] font-bold italic">
                    * Values represent total sales volume and revenue by individual inventory items within the selected period.
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

export default ViewSalesInvoiceTotalsByItemReportView;
