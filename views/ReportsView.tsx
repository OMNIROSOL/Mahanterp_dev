import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  ChevronRight,
  ShoppingCart,
  Package,
  Wallet,
  History,
  ClipboardList,
  Sprout,
  Users,
  LineChart,
  BarChart3,
  TrendingUp,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import { cn } from '../utils/cn';

interface ReportItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

const ReportItem: React.FC<ReportItemProps> = ({ title, description, icon: Icon, path, color }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(path)}
      className="group flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm", color.replace('text-', 'bg-').replace('text-', 'bg-') + '/10', color)}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
            {title}
          </h3>
          <p className="text-[12px] text-slate-500 line-clamp-1">
            {description}
          </p>
        </div>
      </div>
      <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
    </div>
  );
};

const ReportsView: React.FC = () => {
  const sections = [
    {
      title: "Customer Reports",
      icon: Users,
      reports: [
        {
          title: "Aged Receivables",
          description: "Breakdown of outstanding customer balances by age (30, 60, 90+ days).",
          icon: LineChart,
          path: "/reports/aged-receivables",
          color: "text-rose-600"
        },
        {
          title: "Customer Summary",
          description: "Overview of customer contact details, credit terms, and total outstanding balances.",
          icon: Users,
          path: "/reports/customer-summary",
          color: "text-blue-600"
        },
        {
          title: "Customer Statements (Unpaid Invoices)",
          description: "List of all unpaid invoices grouped by customer",
          icon: FileSpreadsheet,
          path: "/reports/unpaid-invoices",
          color: "text-amber-600"
        },
        {
          title: "Customer Statements (Transactions)",
          description: "Comprehensive list of all financial transactions for a specific period per customer.",
          icon: History,
          path: "/reports/customer-transactions",
          color: "text-indigo-600"
        }
      ]
    },
    {
      title: "Sales Reports",
      icon: ShoppingCart,
      reports: [
        {
          title: "Sales Invoice Totals by Customer",
          description: "Summary of invoice totals and payment statuses aggregated by customer for a specific period.",
          icon: Users,
          path: "/reports/sales-invoice-totals-by-customer",
          color: "text-blue-600"
        },
        {
          title: "Sales Invoice Totals by Item",
          description: "Revenue and quantity breakdown for all sold items across invoices for a specific period.",
          icon: ShoppingBag,
          path: "/reports/sales-invoice-totals-by-item",
          color: "text-indigo-600"
        }
      ]
    },
    {
      title: "Mahant Operations",
      icon: BarChart3,
      reports: [
        { title: "Non-Moving Stock", description: "Parts with no sales in the selected period, valued at average cost.", icon: Package, path: "/reports/ops/non-moving-stock", color: "text-slate-600" },
        { title: "Dead Stock", description: "Stock with no sale for more than 365 days, with an aging bucket and a saved decision.", icon: Package, path: "/reports/ops/dead-stock", color: "text-rose-600" },
        { title: "Top 300 Parts", description: "Best sellers by value or quantity, with months of cover.", icon: TrendingUp, path: "/reports/ops/top-parts", color: "text-indigo-600" },
        { title: "Low-Margin Items", description: "Items sold below the margin threshold, grouped by supplier. Management only.", icon: LineChart, path: "/reports/ops/low-margin", color: "text-amber-600" },
        { title: "Branch Day Book", description: "One-day list of sales, receipts, payments, purchases, transfers, adjustments, and expenses.", icon: ClipboardList, path: "/reports/ops/branch-day-book", color: "text-blue-600" },
        { title: "Item Costing", description: "Landed cost per receipt and the monthly average, from saved purchase costing.", icon: FileSpreadsheet, path: "/reports/ops/item-costing", color: "text-emerald-600" },
        { title: "What to Order", description: "Suggested order quantity by supplier, with a draft purchase order.", icon: ShoppingCart, path: "/reports/ops/what-to-order", color: "text-indigo-600" },
        { title: "Loss of Sales on Quotations", description: "Quoted lines the customer did not order within 30 days.", icon: History, path: "/reports/ops/loss-of-sales", color: "text-rose-600" },
      ]
    },
    {
      title: "Inventory Reports",
      icon: Package,
      reports: [
        {
          title: "Inventory Transactions",
          description: "Track all stock movements, transfers, and adjustments across locations.",
          icon: Package,
          path: "/inventory-items",
          color: "text-slate-600"
        }
      ]
    },
    {
      title: "Financial Reports",
      icon: Wallet,
      reports: [
        {
          title: "Summary",
          description: "Balance sheet and profit and loss from your chart of accounts.",
          icon: Wallet,
          path: "/summary",
          color: "text-indigo-600"
        },
        {
          title: "Unrealized Foreign Exchange Gains (Losses)",
          description: "Summary of open foreign balances translated at current exchange rates",
          icon: TrendingUp,
          path: "/reports/unrealized-fx",
          color: "text-emerald-600"
        }
      ]
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-4xl mx-auto">
      {/* Header section */}
      <div className="border-b border-slate-100 pb-8">
        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.25em] mb-1">
          <FileSpreadsheet size={14} />
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-400">Analysis & Intelligence</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
        <p className="text-slate-500 mt-2">
          Select a report below to view detailed business data and transaction logs.
        </p>
      </div>

      <div className="space-y-12">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <section.icon size={16} />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                {section.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {section.reports.map((report, rIdx) => (
                <ReportItem key={rIdx} {...report} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsView;
