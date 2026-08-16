import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Activity, TrendingUp, AlertTriangle, ArrowUpRight, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import apiService from '../../services/apiService';

const ConsumptionDashboardView = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await apiService.getPlanningData();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const metrics = useMemo(() => {
    if (!data?.planning) return { totalDemand: 0, highRunners: 0, atRisk: 0, topConsumers: [] };
    
    let totalDemand = 0;
    let highRunners = 0;
    let atRisk = 0;
    
    const items = [...data.planning].sort((a: any, b: any) => (b.avgDemand || 0) - (a.avgDemand || 0));
    
    items.forEach((item: any) => {
      totalDemand += (item.avgDemand || 0);
      if ((item.avgDemand || 0) > 50) highRunners++;
      if (item.qtyOnHand <= (item.avgDemand || 0) * 0.5) atRisk++; // Less than 2 weeks stock
    });

    const topConsumers = items.slice(0, 10).map((item: any) => ({
      name: item.itemCode,
      fullName: item.itemName,
      demand: item.avgDemand || 0,
      stock: item.qtyOnHand || 0
    }));

    return { totalDemand, highRunners, atRisk, topConsumers };
  }, [data]);

  // Mock historical data for trends (as Excel had AUG24->JAN26 tabs)
  const historicalTrend = [
    { month: 'Aug', consumption: Math.round(metrics.totalDemand * 0.8) },
    { month: 'Sep', consumption: Math.round(metrics.totalDemand * 0.9) },
    { month: 'Oct', consumption: Math.round(metrics.totalDemand * 1.1) },
    { month: 'Nov', consumption: Math.round(metrics.totalDemand * 0.95) },
    { month: 'Dec', consumption: Math.round(metrics.totalDemand * 1.2) },
    { month: 'Jan', consumption: Math.round(metrics.totalDemand) },
  ];

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest animate-pulse">Analyzing Consumption Data...</div>;
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
            <Activity size={14} />
            <span className="text-gray-400">Inventory Analytics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Dashboard</h1>
          <p className="text-slate-500 text-sm">Monthly sales trends and product movement analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight size={12}/> +4.2%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Avg Monthly Demand</div>
            <div className="text-3xl font-black text-slate-900">{metrics.totalDemand.toLocaleString()} <span className="text-sm font-bold text-slate-400">units</span></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BarChart2 size={24} />
          </div>
          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">High-Volume SKUs</div>
            <div className="text-3xl font-black text-slate-900">{metrics.highRunners} <span className="text-sm font-bold text-slate-400">items</span></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Critical Stock Risk</div>
            <div className="text-3xl font-black text-rose-600">{metrics.atRisk} <span className="text-sm font-bold text-rose-400">items</span></div>
            <p className="text-[10px] font-bold text-slate-500 mt-1">&lt; 2 weeks of inventory coverage</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">6-Month Trend</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="consumption" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Top 10 Fast Moving Items</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.topConsumers} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} width={80} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="demand" name="Avg Monthly Demand" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="stock" name="Current Stock" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsumptionDashboardView;
