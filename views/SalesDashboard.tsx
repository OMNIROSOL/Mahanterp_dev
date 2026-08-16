import React, { useState, useMemo, useEffect } from 'react';
import apiService from '../services/apiService';
import { SalesQuote, SalesOrder, Invoice, InventoryItem } from '../types';

import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f472b6', '#3b82f6'];

const RoseSector = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, maxRevenue } = props;
  
  const safeMax = maxRevenue || 1;
  const radiusMultiplier = payload.revenue / safeMax;
  const actualOuterRadius = innerRadius + (outerRadius - innerRadius) * radiusMultiplier;

  return (
    <g>
      <path
        d={`M ${cx},${cy} L ${cx + (actualOuterRadius) * Math.cos(-startAngle * Math.PI / 180)},${cy + (actualOuterRadius) * Math.sin(-startAngle * Math.PI / 180)} A ${actualOuterRadius},${actualOuterRadius} 0 0,0 ${cx + (actualOuterRadius) * Math.cos(-endAngle * Math.PI / 180)},${cy + (actualOuterRadius) * Math.sin(-endAngle * Math.PI / 180)} Z`}
        fill={fill}
        fillOpacity={0.1}
      />
      <path
        d={`M ${cx},${cy} L ${cx + (actualOuterRadius * 0.7) * Math.cos(-startAngle * Math.PI / 180)},${cy + (actualOuterRadius * 0.7) * Math.sin(-startAngle * Math.PI / 180)} A ${actualOuterRadius * 0.7},${actualOuterRadius * 0.7} 0 0,0 ${cx + (actualOuterRadius * 0.7) * Math.cos(-endAngle * Math.PI / 180)},${cy + (actualOuterRadius * 0.7) * Math.sin(-endAngle * Math.PI / 180)} Z`}
        fill={fill}
        fillOpacity={0.3}
      />
      <path
        d={`M ${cx},${cy} L ${cx + (actualOuterRadius * 0.4) * Math.cos(-startAngle * Math.PI / 180)},${cy + (actualOuterRadius * 0.4) * Math.sin(-startAngle * Math.PI / 180)} A ${actualOuterRadius * 0.4},${actualOuterRadius * 0.4} 0 0,0 ${cx + (actualOuterRadius * 0.4) * Math.cos(-endAngle * Math.PI / 180)},${cy + (actualOuterRadius * 0.4) * Math.sin(-endAngle * Math.PI / 180)} Z`}
        fill={fill}
        fillOpacity={0.8}
      />
      <path
        d={`M ${cx},${cy} L ${cx + (actualOuterRadius) * Math.cos(-startAngle * Math.PI / 180)},${cy + (actualOuterRadius) * Math.sin(-startAngle * Math.PI / 180)} A ${actualOuterRadius},${actualOuterRadius} 0 0,0 ${cx + (actualOuterRadius) * Math.cos(-endAngle * Math.PI / 180)},${cy + (actualOuterRadius) * Math.sin(-endAngle * Math.PI / 180)} Z`}
        fill="none"
        stroke={fill}
        strokeWidth={1}
        strokeOpacity={0.2}
      />
    </g>
  );
};

const SalesDashboard: React.FC = () => {
  const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }); 
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [dbQuotes, setDbQuotes] = useState<any[]>([]);
  const [dbDeliveries, setDbDeliveries] = useState<any[]>([]);
  const [dbItems, setDbItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [inv, ord, quo, del, itm] = await Promise.all([
          apiService.getInvoices(),
          apiService.getOrders(),
          apiService.getQuotes(),
          apiService.getDeliveryNotes(),
          apiService.getItems()
        ]);
        setDbInvoices(inv);
        setDbOrders(ord);
        setDbQuotes(quo);
        setDbDeliveries(del);
        setDbItems(itm);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (filterType === 'daily') {
      if (!/\d{4}-\d{2}-\d{2}/.test(selectedDate)) {
        const today = new Date();
        const iso = today.toISOString().split('T')[0];
        setSelectedDate(iso);
      }
    } else if (filterType === 'weekly') {
      if (!/\d{4}-W\d{2}/.test(selectedDate)) {
        setSelectedDate('2026-W13');
      }
    } else if (filterType === 'monthly') {
      if (!/\d{4}-\d{2}/.test(selectedDate)) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSelectedDate(month);
      }
    } else if (filterType === 'yearly') {
      if (!/\d{4}/.test(selectedDate)) {
        setSelectedDate(String(new Date().getFullYear()));
      }
    }
  }, [filterType]);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    // Handle database ISO dates or legacy dotted dates
    if (dateStr.includes('T')) return new Date(dateStr);
    const parts = dateStr.includes('.') ? dateStr.split('.') : dateStr.split('-');
    if (parts.length === 3) {
      return parts[0].length === 4 
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr);
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();

  const isDateInFilter = (dateStr: string) => {
    if (!dateStr) return false;
    const date = parseDate(dateStr);
    
    if (filterType === 'daily') {
        const selectedISO = selectedDate; // YYYY-MM-DD
        return date.toISOString().split('T')[0] === selectedISO;
    }
    if (filterType === 'monthly') {
        if (selectedDate === '3-months') {
            const startOfPastMonth = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            return date >= startOfPastMonth && date <= today;
        }
        if (selectedDate === '6-months') {
            const startOfPastMonth = new Date(today.getFullYear(), today.getMonth() - 6, 1);
            return date >= startOfPastMonth && date <= today;
        }
        return date.getFullYear() === parseInt(selectedDate.split('-')[0]) && (date.getMonth() + 1) === parseInt(selectedDate.split('-')[1]);
    }
    if (filterType === 'yearly') return date.getFullYear() === parseInt(selectedDate);
    if (filterType === 'weekly') {
        const [year, week] = selectedDate.split('-W');
        return date.getFullYear() === parseInt(year) && getWeekNumber(date) === parseInt(week);
    }
    return true;
  };

  const filteredInvoices = useMemo(() => {
    return dbInvoices.filter(inv => isDateInFilter(inv.createdAt || inv.issueDate || inv.date));
  }, [dbInvoices, filterType, selectedDate]);

  const filteredOrders = useMemo(() => {
    return dbOrders.filter(o => isDateInFilter(o.orderDate));
  }, [dbOrders, filterType, selectedDate]);

  const filteredQuotes = useMemo(() => {
    return dbQuotes.filter(q => isDateInFilter(q.issueDate || q.createdAt));
  }, [dbQuotes, filterType, selectedDate]);

  const filteredDeliveries = useMemo(() => {
    return dbDeliveries.filter(d => isDateInFilter(d.deliveryDate || d.timestamp));
  }, [dbDeliveries, filterType, selectedDate]);

  const lowStock = useMemo(() => 
    dbItems
      .filter(item => (item.qtyOnHand || 0) < 15)
      .map(item => ({ name: item.itemName, stock: item.qtyOnHand || 0 })), [dbItems]);

  const overduePayments = useMemo(() => 
    dbInvoices.filter(inv => {
      if (!inv.dueDate) return false;
      const dueDate = parseDate(inv.dueDate);
      return (inv.balanceDue || 0) > 0 && dueDate < today;
    }), [dbInvoices, today]);

  const productIntelligence = useMemo(() => {
    const products: Record<string, { revenue: number, sales: number }> = {};
    filteredInvoices.forEach(inv => {
      inv.items?.forEach((item: any) => {
        const name = typeof item.item === 'string' ? item.item : (item.item?.itemName || 'Unknown Item');
        if (!products[name]) products[name] = { revenue: 0, sales: 0 };
        const qty = parseFloat(item.qty) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        products[name].revenue += qty * price;
        products[name].sales += qty;
      });
    });
    const sorted = Object.entries(products).sort((a, b) => b[1].revenue - a[1].revenue);
    const top = sorted.slice(0, 5).map(([name, data]) => ({ name, revenue: data.revenue }));
    const low = sorted.filter(p => p[1].revenue > 0).slice(-5).reverse().map(([name, data]) => ({ name, revenue: data.revenue }));
    
    return { top, low };
  }, [filteredInvoices]);

  const metrics = useMemo(() => {
    const totalSales = filteredOrders.reduce((s, o) => s + (parseFloat(o.amount || o.totalAmount || 0) || 0), 0);
    const totalRev = filteredInvoices.reduce((s, i) => s + (parseFloat(i.grandTotal || i.invoiceAmount || i.amount || 0) || 0), 0);
    return {
      totalSales: totalSales,
      totalRevenue: totalRev,
      pendingQuotes: filteredQuotes.filter(q => q.status === 'Active' || q.status === 'Pending Approval').length,
      confirmedOrders: filteredOrders.filter(o => o.status === 'Ordered' || o.status === 'Invoiced' || o.status === 'Processed' || o.status === 'Completed').length,
      totalQuotation: filteredQuotes.length,
      totalOrder: filteredOrders.length,
      totalInvoice: filteredInvoices.length,
      totalDelivery: filteredDeliveries.length
    };
  }, [filteredInvoices, filteredOrders, filteredQuotes, filteredDeliveries]);

  const kpis = [
      { label: 'TOTAL SALES', val: `$${metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, dot: 'bg-blue-600', badge: '+12%', badgeColor: 'text-green-600 bg-green-50' },
      { label: 'TOTAL REVENUE', val: `$${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, dot: 'bg-green-600', badge: '+8%', badgeColor: 'text-green-600 bg-green-50' },
      { label: 'PENDING QUOTES', val: metrics.pendingQuotes, dot: 'bg-orange-600', badge: '-2', badgeColor: 'text-slate-600 bg-slate-50' },
      { label: 'CONFIRMED ORDERS', val: metrics.confirmedOrders, dot: 'bg-purple-600', badge: '+5', badgeColor: 'text-emerald-600 bg-emerald-50' },
      { label: 'TOTAL QUOTATION', val: metrics.totalQuotation, dot: 'bg-teal-600', badge: 'Total', badgeColor: 'text-slate-500 bg-slate-50' },
      { label: 'TOTAL ORDER', val: metrics.totalOrder, dot: 'bg-rose-600', badge: 'Total', badgeColor: 'text-slate-500 bg-slate-50' },
      { label: 'TOTAL INVOICE', val: metrics.totalInvoice, dot: 'bg-blue-600', badge: 'Issued', badgeColor: 'text-blue-500 bg-blue-50' },
      { label: 'TOTAL DELIVERY', val: metrics.totalDelivery, dot: 'bg-green-600', badge: 'Shipped', badgeColor: 'text-emerald-500 bg-emerald-50' }
  ];

  const monthOptions = [
      { v: '3-months', l: 'Last 3 Months' },
      { v: '6-months', l: 'Last 6 Months' },
      { v: '2026-01', l: 'January 2026' },
      { v: '2026-02', l: 'February 2026' },
      { v: '2026-03', l: 'March 2026' },
      { v: '2026-04', l: 'April 2026' },
      { v: '2026-05', l: 'May 2026' },
      { v: '2026-06', l: 'June 2026' },
      { v: '2026-07', l: 'July 2026' },
      { v: '2026-08', l: 'August 2026' },
      { v: '2026-09', l: 'September 2026' },
      { v: '2026-10', l: 'October 2026' },
      { v: '2026-11', l: 'November 2026' },
      { v: '2026-12', l: 'December 2026' },
  ];

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen text-slate-800 font-sans animate-in fade-in duration-700">
      
      {/* Page Title & Corporate Branding */}
      <div className="mb-8 flex justify-between items-end">
          <div>
              <div className="flex items-center gap-3 text-indigo-600 mb-2">
                  <div className="h-px w-8 bg-indigo-100"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Corporate Intelligence</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Sales Dashboard</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enterprise Performance Monitoring & Revenue Tracking</p>
          </div>
          <div className="flex gap-3">
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100">Live Status</span>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200">Sync: 100%</span>
          </div>
      </div>

      {/* Corporate Filter Bar */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
  <div className="flex bg-[#f1f5f9] p-1.5 rounded-xl border border-slate-50">
    {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(t => (
      <button
        key={t}
        onClick={() => setFilterType(t.toLowerCase() as any)}
        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${filterType === t.toLowerCase() ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
      >
        {t}
      </button>
    ))}
  </div>
  <div className="flex items-center gap-4">
    <div className="h-10 w-px bg-slate-100"></div>
    <div className="relative group">
      {filterType === 'daily' && (
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="appearance-none bg-white border border-slate-200 text-sm font-black text-slate-700 rounded-xl pl-5 pr-12 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer"
        />
      )}
      {filterType === 'weekly' && (
        <input
          type="week"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="appearance-none bg-white border border-slate-200 text-sm font-black text-slate-700 rounded-xl pl-5 pr-12 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer"
        />
      )}
      {filterType === 'monthly' && (
        <select
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="appearance-none bg-white border border-slate-200 text-sm font-black text-slate-700 rounded-xl pl-5 pr-12 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer"
        >
          {monthOptions.map(m => (
            <option key={m.v} value={m.v}>
              {m.l}
            </option>
          ))}
        </select>
      )}
      {filterType === 'yearly' && (
        <div className="relative">
          <button
            onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
            className="flex items-center gap-3 bg-white border border-slate-200 text-sm font-black text-slate-700 rounded-xl px-5 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all hover:border-indigo-200"
          >
            <span>{selectedDate}</span>
            <i className={`fas fa-chevron-${isYearPickerOpen ? 'up' : 'down'} text-[10px] text-slate-400`}></i>
          </button>
          
          {isYearPickerOpen && (
            <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-slate-100 rounded-[24px] shadow-2xl z-50 w-64 animate-in fade-in zoom-in duration-200">
              <div className="grid grid-cols-3 gap-2">
                {[2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedDate(String(year));
                      setIsYearPickerOpen(false);
                    }}
                    className={`p-3 rounded-xl text-xs font-bold transition-all ${
                      selectedDate === String(year) 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
        <i className="fas fa-calendar-alt text-sm"></i>
      </div>
    </div>
  </div>
</div>

      {/* Executive KPI Grid (8 Cards, 2x4 Layout) */}
      <div className="grid grid-cols-4 gap-6 mb-8">
          {kpis.map((k, i) => (
              <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-5 ${k.dot} group-hover:scale-125 transition-transform duration-500`}></div>
                  
                  <div className="flex justify-between items-start mb-8">
                      <div className={`w-4 h-4 rounded-full ${k.dot} shadow-lg border-2 border-white ring-4 ring-slate-50`}></div>
                  </div>
                  
                  <div className="space-y-1.5 relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">{k.label}</p>
                      <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none tabular-nums">{k.val}</h4>
                  </div>
              </div>
          ))}
      </div>

      {/* Analytics Compartments */}
      <div className="space-y-8">
          
          {/* Revenue Intelligence Row */}
          <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                            <i className="fas fa-chart-line text-lg"></i>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Revenue Growth Trend</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Period Total</p>
                        <p className="text-xl font-black text-indigo-600">${metrics.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredInvoices.slice(0, 15).map((n, i) => ({ n: i, v: parseFloat(n.grandTotal || n.invoiceAmount || n.amount || 0) }))}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="n" hide />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0/0.1)', padding: '12px'}} />
                        <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={4} dot={{r: 5, fill: '#6366f1', strokeWidth: 3, stroke: '#fff'}} activeDot={{r: 8, strokeWidth: 0}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col scale-in-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10">product wise sales</h3>
              <div className="h-64 relative scale-in-center">
                {productIntelligence.top.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productIntelligence.top}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="revenue"
                        stroke="none"
                      >
                        {productIntelligence.top.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0/0.1)' }}
                        formatter={(v: number) => `$${v.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <i className="fas fa-chart-pie text-4xl opacity-20"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No sales data recorded</p>
                  </div>
                )}
              </div>
              <div className="mt-8 space-y-3 px-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                {productIntelligence.top.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-3.5 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                      <p className="text-[10px] font-bold text-slate-600 truncate uppercase tracking-tight">{p.name}</p>
                    </div>
                    <p className="text-[11px] font-black text-slate-900 tabular-nums ml-2">${p.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
          </div>
        </div>

          {/* Operational Radar Row */}
          <div className="grid grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                      Low stock
                  </h3>
                  <div className="space-y-4">
                      {lowStock.slice(0, 5).map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-rose-100 transition-all group">
                              <p className="text-[11px] font-bold text-slate-700 truncate w-40">{item.name}</p>
                              <span className="text-[10px] font-black text-rose-600 bg-white px-3 py-1.5 rounded-xl border border-rose-100 shadow-sm group-hover:bg-rose-600 group-hover:text-white transition-all">{item.stock} UNITS</span>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 px-1">Payment overdue</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {overduePayments.map((inv, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 flex justify-between items-center hover:bg-rose-50 transition-colors">
                              <div className="min-w-0">
                                  <p className="text-[11px] font-black text-slate-800 truncate mb-1 uppercase tracking-tight">{typeof inv.customer === 'string' ? inv.customer : inv.customer?.name || 'Unknown'}</p>
                                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">EXPIRED: {inv.dueDate}</p>
                              </div>
                              <span className="text-sm font-black text-slate-900 ml-4 tabular-nums">${inv.balanceDue.toLocaleString()}</span>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Pending approvals</h3>
                  <div className="space-y-4 text-center">
                    {dbQuotes.filter(q => q.status === 'Active').slice(0, 5).map((q, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left hover:shadow-md transition-all">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">REF: {q.reference}</p>
                                <span className="text-[8px] font-black px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg uppercase border border-amber-200 shadow-sm">VERIFICATION</span>
                            </div>
                            <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{typeof q.customer === 'string' ? q.customer : q.customer?.name || 'Unknown'}</p>
                        </div>
                    ))}
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-8 pb-32">
              <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm transition-all duration-700">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                      Low-performing products
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100">Audit required</span>
                  </h3>
                  <div className="overflow-hidden rounded-3xl border border-slate-50 shadow-inner">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-100">
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Product Intelligence</th>
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Revenue Impact</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {productIntelligence.low.map((p, i) => (
                                  <tr key={i} className="hover:bg-amber-50/20 transition-all group">
                                      <td className="px-8 py-5 flex items-center gap-4">
                                          <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-amber-400 transition-colors"></div>
                                          <p className="text-[12px] font-black text-slate-600 uppercase tracking-tight group-hover:text-slate-900 transition-colors">{p.name}</p>
                                      </td>
                                      <td className="px-8 py-5 text-right">
                                          <span className="text-sm font-black text-slate-400 tabular-nums group-hover:text-amber-700 transition-colors">${p.revenue.toLocaleString()}</span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
};

export default SalesDashboard;
