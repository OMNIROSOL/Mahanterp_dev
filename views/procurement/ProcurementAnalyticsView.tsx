import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import { 
  PieChart as PieChartIcon, Target, Truck, ShieldCheck, Clock, TrendingUp, Package, Activity, DollarSign
} from 'lucide-react';
import apiService from '../../services/apiService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ChartGradients = () => (
  <defs>
    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
    </linearGradient>
    <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
    </linearGradient>
    <linearGradient id="colorItems" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
    </linearGradient>
  </defs>
);

const ProcurementAnalyticsView = () => {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [sups, ords, ships] = await Promise.all([
          apiService.getSuppliers(),
          apiService.getPurchaseOrders(),
          apiService.getProcurementShipments().catch(() => [])
        ]);
        setSuppliers(sups || []);
        setOrders(ords || []);
        setShipments(ships || []);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const metrics = useMemo(() => {
    let totalSpend = 0;
    const spendBySupplier: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const monthlySpendMap: Record<string, number> = {};
    const itemSpendMap: Record<string, number> = {};

    // 1. Process Orders for Spend & Top Items
    orders.forEach(order => {
      const amount = Number(order.amount) || 0;
      totalSpend += amount;
      
      const supplierName = order.supplier?.name || 'Unknown';
      spendBySupplier[supplierName] = (spendBySupplier[supplierName] || 0) + amount;
      
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;

      // Group by Month (YYYY-MM for sorting, then display MMM-YY)
      if (order.date) {
        const dateObj = new Date(order.date);
        const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const displayKey = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        
        if (!monthlySpendMap[sortKey]) monthlySpendMap[sortKey] = 0;
        monthlySpendMap[sortKey] += amount;
        // Store displayKey as a hidden property for later mapping
        (monthlySpendMap as any)[`display_${sortKey}`] = displayKey;
      }

      // Group items
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((oi: any) => {
          const itemName = oi.item?.itemName || oi.description || 'Misc Item';
          const lineTotal = (Number(oi.qty) || 0) * (Number(oi.unitPrice) || 0);
          itemSpendMap[itemName] = (itemSpendMap[itemName] || 0) + lineTotal;
        });
      }
    });

    // 2. Process Shipments for Real Lead Times & Delays
    let totalLeadTimeDays = 0;
    let leadTimeCount = 0;
    let onTimeCount = 0;
    let totalTrackedShipments = 0;

    shipments.forEach(ship => {
      // Exclude shipments without PO links
      if (!ship.purchaseOrder) return;
      totalTrackedShipments++;

      if (ship.delayedDays === 0) onTimeCount++;

      if (ship.purchaseOrder.date && ship.eta) {
        const orderDate = new Date(ship.purchaseOrder.date);
        const etaDate = new Date(ship.eta);
        const diffDays = Math.ceil((etaDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays < 365) {
          totalLeadTimeDays += diffDays;
          leadTimeCount++;
        }
      }
    });

    // 3. Format Data for Charts
    const supplierSpendData = Object.entries(spendBySupplier)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const monthlyTrendData = Object.keys(monthlySpendMap)
      .filter(k => !k.startsWith('display_'))
      .sort() // chronological
      .map(k => ({
        name: (monthlySpendMap as any)[`display_${k}`],
        spend: monthlySpendMap[k]
      }))
      .slice(-12); // Last 12 months

    const topItemsData = Object.entries(itemSpendMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const pipelineData = [
      { name: 'Ordered', count: statusCounts['Ordered'] || 0 },
      { name: 'Production', count: statusCounts['Production'] || 0 },
      { name: 'Shipped', count: statusCounts['Shipped'] || 0 },
      { name: 'In Transit', count: statusCounts['In Transit'] || 0 },
      { name: 'Arrived', count: statusCounts['Arrived'] || 0 },
    ];

    const avgLeadTime = leadTimeCount > 0 ? Math.round(totalLeadTimeDays / leadTimeCount) : 0;
    const onTimeRate = totalTrackedShipments > 0 ? Math.round((onTimeCount / totalTrackedShipments) * 100) : 100;

    return { 
      totalSpend, 
      supplierSpendData, 
      monthlyTrendData,
      topItemsData,
      pipelineData, 
      avgLeadTime, 
      onTimeRate, 
      totalOrders: orders.length 
    };
  }, [orders, shipments]);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Activity size={32} className="animate-spin mb-4 text-blue-500" />
        <div className="font-black uppercase tracking-widest text-xs animate-pulse">Aggregating Global Purchasing Data...</div>
      </div>
    );
  }

  // Custom Tooltips
  const CurrencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{label}</p>
          <p className="text-sm font-black text-emerald-400">
            ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 font-sans bg-slate-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
            <PieChartIcon size={14} />
            <span className="text-slate-400">Strategic Sourcing</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Purchase Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time spend analytics, lead times, and supplier performance tracking</p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <DollarSign size={24} strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Procurement Spend</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              <span className="text-lg text-slate-400 font-bold mr-1">$</span>
              {metrics.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <ShieldCheck size={24} strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">On-Time Delivery Rate</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics.onTimeRate}<span className="text-2xl text-emerald-500 ml-1">%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                <Clock size={24} strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Average Lead Time</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics.avgLeadTime} <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Days</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-inner">
                <Truck size={24} strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active Suppliers</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {suppliers.filter(s => !s.inactive).length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Monthly Purchasing Trend</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <ChartGradients />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} 
                  tickFormatter={(val) => `$${val > 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <RechartsTooltip content={<CurrencyTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="spend" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSpend)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier Spend Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <Target size={18} className="text-indigo-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Top 5 Suppliers</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.supplierSpendData}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics.supplierSpendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CurrencyTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center" 
                  wrapperStyle={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }} 
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Purchased Items */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <Package size={18} className="text-emerald-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Top 5 Procured Items</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.topItemsData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <ChartGradients />
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                  width={120}
                />
                <RechartsTooltip content={<CurrencyTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" fill="url(#colorItems)" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Bottleneck Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <Truck size={18} className="text-purple-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Order Pipeline</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <ChartGradients />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: '900', color: '#475569' }} 
                />
                <Bar dataKey="count" name="Orders" fill="url(#colorPipeline)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementAnalyticsView;
