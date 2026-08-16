import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, Search, CheckCircle, Save, Download, Clock,
  AlertTriangle, Filter, Sparkles, Send, History, ChevronRight
} from 'lucide-react';
import apiService from '../../services/apiService';
import { PurchasePlan, PurchasePlanItem } from '../../types';
import { exportToPDF } from '../../utils/exportUtils';

const PurchasePlanningView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Data states
  const [planningData, setPlanningData] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pastPlans, setPastPlans] = useState<PurchasePlan[]>([]);
  
  // UI states
  const [months, setMonths] = useState<number>(8); // historical consumption period
  const [projectionMonths, setProjectionMonths] = useState<number>(4); // future projection horizon
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBrand, setFilterBrand] = useState('All');
  
  // Plan building states
  const [planItems, setPlanItems] = useState<Record<string, { 
    monthlyOrders: Record<number, number>,
    monthlyConsumptions: Record<number, number>,
    customAvgDemand?: number,
    remarks: string, 
    supplierId?: string 
  }>>({});
  
  // Active Tab
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // Selected Plan for details modal
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

  // Price Compare
  const [comparingItem, setComparingItem] = useState<any | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const planningRes = await apiService.getPlanningData(months);
      setPlanningData(planningRes.planning || []);
      setSuppliers(planningRes.suppliers || []);
      
      // Initialize plan items
      const initialItems: Record<string, { monthlyOrders: Record<number, number>, monthlyConsumptions: Record<number, number>, customAvgDemand?: number, remarks: string }> = {};
      (planningRes.planning || []).forEach((item: any) => {
        initialItems[item.id] = {
          monthlyOrders: { 0: item.recommendedQty > 0 ? item.recommendedQty : 0 },
          monthlyConsumptions: {},
          customAvgDemand: item.avgDemand,
          remarks: ''
        };
      });
      setPlanItems(initialItems);
      
      try {
        const plansRes = await apiService.getPurchasePlans();
        setPastPlans(plansRes || []);
      } catch (plansErr) {
        console.warn('Failed to load past plans (possibly old server):', plansErr);
        setPastPlans([]);
      }
      
    } catch (err) {
      console.error('Failed to load planning data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [months]);

  const filteredItems = useMemo(() => {
    return planningData.filter(item => {
      const matchesSearch = item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSupplier = filterSupplier === 'All' || 
                              item.supplier?.id === filterSupplier || 
                              (item.mappedSupplierIds && item.mappedSupplierIds.includes(filterSupplier));
      const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
      const matchesBrand = filterBrand === 'All' || item.brand === filterBrand;
      return matchesSearch && matchesSupplier && matchesCategory && matchesBrand;
    });
  }, [planningData, filterSupplier, filterCategory, filterBrand, searchQuery]);

  const uniqueCategories = useMemo(() => Array.from(new Set(planningData.map(i => i.category).filter(Boolean))), [planningData]);
  const uniqueBrands = useMemo(() => Array.from(new Set(planningData.map(i => i.brand).filter(Boolean))), [planningData]);

  const handleBulkAssignSupplier = () => {
    if (filterSupplier === 'All') {
      alert('Please select a specific supplier to bulk assign.');
      return;
    }
    setPlanItems(prev => {
      const updated = { ...prev };
      filteredItems.forEach(item => {
        if (updated[item.id]) {
          updated[item.id] = { ...updated[item.id], supplierId: filterSupplier };
        } else {
          updated[item.id] = { monthlyOrders: {}, monthlyConsumptions: {}, remarks: '', supplierId: filterSupplier };
        }
      });
      return updated;
    });
  };

  const handleItemChange = (id: string, field: 'remarks' | 'supplierId', value: any) => {
    setPlanItems(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleMonthlyOrderChange = (itemId: string, monthIdx: number, value: number) => {
    setPlanItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        monthlyOrders: {
          ...(prev[itemId]?.monthlyOrders || {}),
          [monthIdx]: value
        }
      }
    }));
  };

  const handleAvgDemandChange = (itemId: string, value: number) => {
    setPlanItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        customAvgDemand: value
      }
    }));
  };

  const handleMonthlyConsumptionChange = (id: string, monthIndex: number, value: number) => {
    setPlanItems(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        monthlyConsumptions: {
          ...(prev[id]?.monthlyConsumptions || {}),
          [monthIndex]: value
        }
      }
    }));
  };

  const handleSavePlan = async (submitForApproval: boolean) => {
    const itemsToSave = planningData
      .filter(item => {
        const orders = planItems[item.id]?.monthlyOrders || {};
        const hasOrders = Object.values(orders).some((qty: any) => qty > 0);
        return hasOrders || item.recommendedQty > 0;
      })
      .map(item => {
        const monthlyOrdersArray = Array.from({ length: projectionMonths }).map((_, i) => ({
          monthIndex: i,
          qty: planItems[item.id]?.monthlyOrders?.[i] || 0
        }));
        return {
          itemId: item.id,
          supplierId: planItems[item.id]?.supplierId || (filterSupplier !== 'All' ? filterSupplier : item.supplier?.id) || null,
          availableStock: item.availableStock || 0,
          avgConsumption: item.avgDemand || 0,
          safetyStock: item.safetyStock || 0,
          incomingPos: item.incomingQty || 0,
          projectedDemand: item.forecastRequirement || 0,
          suggestedQty: item.recommendedQty || 0,
          finalOrderQty: planItems[item.id]?.monthlyOrders?.[0] || 0,
          monthlyOrders: planItems[item.id]?.monthlyOrders || {},
          remarks: planItems[item.id]?.remarks || '',
          aiRecommendation: item.aiRecommendation
        };
      });

    if (itemsToSave.length === 0) {
      alert("No items to save in this plan.");
      return;
    }

    setSaving(true);
    try {
      const reference = `PLAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        reference,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        items: itemsToSave,
        createdBy: 'u-admin' // Mocked current user
      };
      
      const newPlan = await apiService.createPurchasePlan(payload);
      
      if (submitForApproval) {
        await apiService.approvePurchasePlan(newPlan.id, {
          approverId: 'u-system',
          approverName: 'System',
          comments: 'Submitted for Level 1 Approval',
          status: 'Pending Approval'
        });
        alert(`Plan ${reference} saved and submitted for approval!`);
      } else {
        alert(`Plan ${reference} saved as Draft!`);
      }
      
      loadData();
      setActiveTab('history');
    } catch (err: any) {
      alert('Failed to save plan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportDraft = async () => {
    const itemsToExport = filteredItems
      .map(item => ({
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        supplierId: item.supplier?.id,
        availableStock: item.availableStock,
        avgConsumption: planItems[item.id]?.customAvgDemand || item.avgDemand || 0,
        incomingPos: item.incomingQty,
      }));

    if (itemsToExport.length === 0) {
      alert("No items to export.");
      return;
    }

    const d = new Date();
    d.setMonth(d.getMonth() + projectionMonths);
    const planningMonthStr = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const orderDateStr = new Date().toLocaleDateString('en-GB');
    const supplierNameStr = filterSupplier === 'All' ? 'All Suppliers' : suppliers.find((s: any) => s.id === filterSupplier)?.name || 'Unknown Supplier';

    setExporting(true);
    try {
      await apiService.exportPurchasePlanDraft({ 
        items: itemsToExport,
        metadata: {
          supplierName: supplierNameStr,
          planningMonth: planningMonthStr,
          orderDate: orderDateStr,
          consumptionPeriod: `${months} Months`
        }
      });
    } catch (err: any) {
      alert('Failed to export plan: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (filteredItems.length === 0) {
      alert("No items to export.");
      return;
    }

    const d = new Date();
    d.setMonth(d.getMonth() + projectionMonths);
    const planningMonthStr = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const orderDateStr = new Date().toLocaleDateString('en-GB');
    const supplierNameStr = filterSupplier === 'All' ? 'All Suppliers' : suppliers.find((s: any) => s.id === filterSupplier)?.name || 'Unknown Supplier';

    const topHeaders: any[] = [
      { content: 'Item Details', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Avg Demand', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    ];
    const subHeaders: any[] = [];
    
    for (let i = 0; i < projectionMonths; i++) {
      const monthD = new Date();
      monthD.setMonth(monthD.getMonth() + i + 1);
      const mStr = monthD.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      topHeaders.push({ content: mStr, colSpan: 4, styles: { halign: 'center' } });
      subHeaders.push('OB', 'Inflow', 'Actual', 'Closing');
    }
    
    topHeaders.push({ content: 'Procurement (Target Month)', colSpan: 4, styles: { halign: 'center' } });
    subHeaders.push('Stock(M)', 'Min(S)', 'Max(S)', 'Proc Qty');

    const headers = [topHeaders, subHeaders];

    const rows = filteredItems.map((item) => {
      const row = [
        `${item.itemCode || ''}\n${item.itemName || ''}`,
        planItems[item.id]?.customAvgDemand || item.avgDemand || 0
      ];

      let currentOb = Number(item.availableStock) || 0;
      let avgCons = Number(planItems[item.id]?.customAvgDemand || item.avgDemand || 0);
      let remainingInflow = Number(item.incomingQty) || 0;

      for (let i = 0; i < projectionMonths; i++) {
        let monthlyInflow = i === 0 ? remainingInflow : 0;
        let closing = currentOb + monthlyInflow - avgCons;

        row.push(currentOb.toFixed(1));
        row.push(monthlyInflow > 0 ? `+${monthlyInflow}` : '0');
        row.push(avgCons.toString());
        row.push(closing.toFixed(1));

        currentOb = closing;
      }

      const stockM = (currentOb / (avgCons || 1)).toFixed(2);
      const minS = ((item.safetyStock || 0) / (avgCons || 1)).toFixed(2);
      const maxS = (((item.safetyStock || 0) * 2) / (avgCons || 1)).toFixed(2);
      const procQty = planItems[item.id]?.monthlyOrders?.[0] || 0;

      row.push(stockM, minS, maxS, procQty.toString());
      return row;
    });

    const totalCols = 2 + (projectionMonths * 4) + 4;
    const metaRows = [
      [
        { content: `Supplier: ${supplierNameStr}`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: 0 } }, 
        { content: `Order Planning Month: ${planningMonthStr}`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: 0 } }, 
        { content: `Order Date: ${orderDateStr}`, colSpan: totalCols - 8, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: 0 } }
      ],
      [
        { content: `Consumption Period: ${months} Months`, colSpan: totalCols, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: 0 } }
      ],
      [{ content: '', colSpan: totalCols }]
    ];
    
    exportToPDF('Purchase Plan Draft', 'purchase_plan_draft', headers, [...metaRows, ...rows], {
      bodyStyles: { fontSize: 7, halign: 'center' },
      headStyles: { fontSize: 7 },
      theme: 'grid'
    });
  };

  const handleExport = (planId: string) => {
    apiService.exportPurchasePlan(planId);
  };

  const handleComparePrice = async (item: any) => {
    setComparingItem(item);
    setLoadingHistory(true);
    try {
      const history = await apiService.getHistoricalPrices(item.id);
      setPriceHistory(history || []);
    } catch (err) {
      console.error(err);
      setPriceHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            <FileSpreadsheet size={14} />
            <span className="text-gray-400">Procurement Planning</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Purchase Planning Module</h1>
          <p className="text-slate-500 text-sm">Create dynamic purchase plans with multi-level approvals and AI insights</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            Create New Plan
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            Plan History & Approvals
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Consumption Period</label>
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={8}>8 Months</option>
                  <option value={12}>12 Months</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Order Planning Month</label>
                <select
                  value={projectionMonths}
                  onChange={(e) => setProjectionMonths(Number(e.target.value))}
                  className="w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-700 focus:outline-none border-blue-200 bg-blue-50/30"
                >
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + idx + 1); // 1-indexed to avoid current month as target
                    return (
                      <option key={idx + 1} value={idx + 1}>
                        {d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Supplier</label>
                <div className="flex gap-1">
                  <select
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                    className="w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="All">All Suppliers</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleBulkAssignSupplier}
                    title="Assign to all filtered items"
                    className="px-2 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                  >
                    Bulk Assign
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategories.map((cat: any) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sub-Category</label>
                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="All">All Sub-Categories</option>
                  {uniqueBrands.map((brand: any) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Search Items</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by code or name..."
                    className="w-64 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleSavePlan(false)}
                disabled={saving}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={14} /> Save Draft
              </button>
              <button 
                onClick={() => handleSavePlan(true)}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-200 disabled:opacity-50"
              >
                <Send size={14} /> Submit for Approval
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead className="bg-slate-800 text-white sticky top-0 z-10">
                  <tr className="text-[9px] font-black uppercase tracking-widest">
                    <th className="px-4 py-3 border-b border-slate-700" rowSpan={2}>Item Details</th>
                    <th className="px-4 py-3 border-b border-slate-700 text-center border-l border-slate-700" rowSpan={2}>Avg Demand</th>
                    {Array.from({ length: projectionMonths }).map((_, idx) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + idx);
                      return (
                        <th key={idx} className="px-4 py-2 border-b border-slate-700 text-center border-l border-slate-700" colSpan={4}>
                          {d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </th>
                      );
                    })}
                    <th className="px-4 py-3 border-b border-slate-700 text-center border-l border-slate-700 bg-indigo-900" colSpan={5}>
                      Procurement (Target Month)
                    </th>
                    <th className="px-4 py-3 border-b border-slate-700 border-l border-slate-700" rowSpan={2}>Remarks</th>
                    <th className="px-4 py-3 border-b border-slate-700 text-center" rowSpan={2}>Compare Price</th>
                  </tr>
                  <tr className="text-[9px] font-black uppercase tracking-widest bg-slate-700">
                    {Array.from({ length: projectionMonths }).map((_, idx) => (
                      <React.Fragment key={`sub-${idx}`}>
                        <th className="px-2 py-2 border-b border-slate-600 text-center border-l border-slate-600 text-slate-300">OB</th>
                        <th className="px-2 py-2 border-b border-slate-600 text-center text-slate-300">Inflow</th>
                        <th className="px-2 py-2 border-b border-slate-600 text-center text-slate-300">Act</th>
                        <th className="px-2 py-2 border-b border-slate-600 text-center text-slate-300">Cl</th>
                      </React.Fragment>
                    ))}
                    <th className="px-2 py-2 border-b border-slate-600 text-center border-l border-slate-600 bg-indigo-800 text-slate-300">Stk (M)</th>
                    <th className="px-2 py-2 border-b border-slate-600 text-center bg-indigo-800 text-slate-300">Min S</th>
                    <th className="px-2 py-2 border-b border-slate-600 text-center bg-indigo-800 text-slate-300">Max S</th>
                    <th className="px-2 py-2 border-b border-slate-600 text-center bg-indigo-800 text-amber-200">Proc Qty</th>
                    <th className="px-2 py-2 border-b border-slate-600 text-center bg-indigo-800 text-emerald-300">FINAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10 + (projectionMonths * 4)} className="px-4 py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                        Loading Planning Data...
                      </td>
                    </tr>
                  ) : filteredItems.map((item) => {
                    let currentOb = item.openingStock;
                    const defaultAvgCons = planItems[item.id]?.customAvgDemand !== undefined ? planItems[item.id].customAvgDemand! : item.avgDemand;
                    
                    let finalClosing = 0;
                    
                    const monthNodes = Array.from({ length: projectionMonths }).map((_, idx) => {
                      const monthlyInflow = item.inflows?.[idx] || 0;
                      const rawManualCons = planItems[item.id]?.monthlyConsumptions?.[idx];
                      const currentMonthCons = rawManualCons !== undefined ? rawManualCons : defaultAvgCons;
                      
                      const closing = currentOb + monthlyInflow - currentMonthCons;
                      const obForRender = currentOb;
                      
                      if (idx === projectionMonths - 1) {
                        finalClosing = closing;
                      }
                      
                      currentOb = closing;

                      return (
                        <React.Fragment key={`data-${idx}`}>
                          <td className="px-2 py-2 text-center border-l border-slate-100 bg-slate-50/30">
                            <div className="text-[10px] font-bold text-slate-600" title="Opening Balance">{obForRender.toFixed(1)}</div>
                          </td>
                          <td className="px-2 py-2 text-center bg-slate-50/30">
                            <div className="text-[10px] font-bold text-emerald-600" title="Inflow">+{monthlyInflow}</div>
                          </td>
                          <td className="px-2 py-2 text-center bg-slate-50/30">
                            <div className="flex items-center justify-center space-x-1" title="Expected Consumption (Editable)">
                              <input
                                type="number"
                                value={rawManualCons !== undefined ? rawManualCons : defaultAvgCons}
                                onChange={(e) => handleMonthlyConsumptionChange(item.id, idx, Number(e.target.value))}
                                className={`w-12 px-1 py-0.5 bg-white border border-rose-200 rounded text-[10px] font-bold text-center text-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-400 shadow-inner ${rawManualCons !== undefined ? 'bg-rose-50 border-rose-300' : ''}`}
                              />
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center bg-slate-50/30">
                            <div className={`text-[10px] font-black ${closing < 0 ? 'text-rose-600' : 'text-slate-800'}`} title="Projected Closing">
                              {closing.toFixed(1)}
                            </div>
                          </td>
                        </React.Fragment>
                      );
                    });
                    
                    const targetClosing = Math.max(0, finalClosing);
                    const stkMonths = defaultAvgCons > 0 ? (targetClosing / defaultAvgCons) : 0;
                    
                    const mapping = filterSupplier !== 'All' ? item.itemMappings?.find((m: any) => m.supplierId === filterSupplier) : null;
                    const activeMinStock = mapping ? mapping.minStockMonths : item.minStockMonths;
                    const activeMaxStock = mapping ? mapping.maxStockMonths : item.maxStockMonths;
                    
                    const shortageMonths = Math.max(0, activeMaxStock - stkMonths);
                    const procQty = Math.round(shortageMonths * defaultAvgCons);
                    
                    // We map the final order qty to monthlyOrders[0] just to store it in state
                    const finalUserOrderQty = planItems[item.id]?.monthlyOrders?.[0] !== undefined 
                      ? planItems[item.id].monthlyOrders[0] 
                      : procQty;

                    return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 border-r border-slate-100">
                        <div className="text-xs font-black text-slate-900">{item.itemCode}</div>
                        <div className="text-[10px] font-semibold text-slate-500 truncate max-w-[200px]">{item.itemName}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Stock: {item.openingStock.toFixed(1)}</div>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 bg-slate-50">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            step="0.1"
                            value={defaultAvgCons}
                            onChange={(e) => handleAvgDemandChange(item.id, Number(e.target.value))}
                            className="w-16 px-1 py-1 bg-white border border-slate-300 rounded text-[10px] font-black text-center text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                          />
                        </div>
                      </td>
                      
                      {monthNodes}
                      
                      {/* Procurement Block */}
                      <td className="px-2 py-2 text-center border-l border-slate-100 bg-indigo-50/30 text-[10px] font-bold text-slate-700">
                        {stkMonths > 0 ? stkMonths.toFixed(2) : '-'}
                      </td>
                      <td className="px-2 py-2 text-center bg-indigo-50/30 text-[10px] font-bold text-slate-500">
                        {activeMinStock.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center bg-indigo-50/30 text-[10px] font-bold text-slate-500">
                        {activeMaxStock.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center bg-amber-50/50">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          procQty > 0 ? 'bg-amber-100 text-amber-700' : 'text-slate-400'
                        }`}>
                          {procQty}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center bg-blue-50/50">
                        <input
                          type="number"
                          value={finalUserOrderQty}
                          onChange={(e) => handleMonthlyOrderChange(item.id, 0, Number(e.target.value))}
                          className="w-16 px-1 py-1 bg-white border border-blue-200 rounded text-xs font-black text-center text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                        />
                      </td>

                      <td className="px-4 py-3 border-l border-slate-100">
                        <input
                          type="text"
                          value={planItems[item.id]?.remarks ?? ''}
                          onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                          placeholder="Add remark..."
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 focus:outline-none focus:border-blue-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => handleComparePrice(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded shadow-sm text-[9px] font-black uppercase tracking-widest text-slate-600 transition-colors"
                        >
                          Compare
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                  {!loading && filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={10 + (projectionMonths * 4)} className="px-4 py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-slate-50">
            <History size={16} className="text-slate-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">Saved Plans & Approvals</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-gray-100">
                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Date Created</th>
                  <th className="px-6 py-4">Created By</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Items</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pastPlans.map(plan => (
                  <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-slate-800">{plan.reference}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">
                      {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{plan.createdBy || 'System'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        plan.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        plan.status === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        plan.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                        'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-black text-slate-600">
                      {plan.items?.length || 0}
                    </td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleExport(plan.id)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Download size={12} /> Excel Export
                      </button>
                      <button 
                        onClick={() => setSelectedPlan(plan)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-1 shadow-sm"
                      >
                        View Details <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {pastPlans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                      No purchase plans found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-800">Plan Details: {selectedPlan.reference}</h3>
                <p className="text-xs font-semibold text-slate-500">Status: {selectedPlan.status}</p>
              </div>
              <button 
                onClick={() => setSelectedPlan(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <span className="text-xl font-bold leading-none">&times;</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-800 text-white sticky top-0 z-10">
                  <tr className="text-[9px] font-black uppercase tracking-widest">
                    <th className="px-4 py-3 border-b border-slate-700">Item</th>
                    <th className="px-4 py-3 border-b border-slate-700">Supplier</th>
                    <th className="px-4 py-3 border-b border-slate-700 text-center">Monthly Orders</th>
                    <th className="px-4 py-3 border-b border-slate-700">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPlan.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-xs font-black text-slate-900">{item.item?.itemCode || 'Unknown'}</div>
                        <div className="text-[10px] font-semibold text-slate-500">{item.item?.itemName || 'Unknown Item'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        {item.supplier?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {(item.monthlyOrders && Array.isArray(item.monthlyOrders)) ? (
                            item.monthlyOrders.filter((mo: any) => mo.qty > 0).map((mo: any, i: number) => {
                              const d = new Date(selectedPlan.year, selectedPlan.month - 1 + mo.monthIndex, 1);
                              return (
                                <span key={i} className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-[10px] font-black text-emerald-700">
                                  {d.toLocaleDateString('en-GB', { month: 'short' })}: {mo.qty}
                                </span>
                              );
                            })
                          ) : (
                            <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-[10px] font-black text-emerald-700">
                              M1: {item.finalOrderQty}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-medium text-slate-600">{item.remarks || '-'}</td>
                    </tr>
                  ))}
                  {(!selectedPlan.items || selectedPlan.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                        No items in this plan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {selectedPlan.status === 'Pending Approval' && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={async () => {
                    try {
                      await apiService.approvePurchasePlan(selectedPlan.id, {
                        approverId: 'u-system',
                        approverName: 'System',
                        comments: 'Rejected by user',
                        status: 'Rejected'
                      });
                      setSelectedPlan(null);
                      loadData();
                    } catch (e: any) { alert(e.message); }
                  }}
                  className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  Reject Plan
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await apiService.approvePurchasePlan(selectedPlan.id, {
                        approverId: 'u-system',
                        approverName: 'System',
                        comments: 'Approved by user',
                        status: 'Approved'
                      });
                      setSelectedPlan(null);
                      loadData();
                    } catch (e: any) { alert(e.message); }
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                >
                  Approve Plan
                </button>
              </div>
            )}
            
            {selectedPlan?.status === 'Approved' && (
              <div className="flex justify-end pt-4 mt-6 border-t border-slate-100">
                <button 
                  onClick={async () => {
                    if (!window.confirm('Are you sure you want to generate Purchase Enquiries for this plan?')) return;
                    try {
                      const res = await apiService.generateEnquiriesFromPlan(selectedPlan.id, {
                        userId: 'u-system',
                        userName: 'System'
                      });
                      alert(`Successfully generated ${res.count} Purchase Enquiry document(s)!`);
                      setSelectedPlan(null);
                      loadData();
                    } catch (err: any) {
                      alert(`Error generating enquiries: ${err.message || 'Unknown error'}`);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                >
                  Generate Enquiries
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {comparingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-800">Price History: {comparingItem.itemCode}</h3>
                <p className="text-xs font-semibold text-slate-500">{comparingItem.itemName}</p>
              </div>
              <button 
                onClick={() => setComparingItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <span className="text-xl font-bold leading-none">&times;</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {loadingHistory ? (
                <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                  Loading Price History...
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white sticky top-0 z-10">
                    <tr className="text-[9px] font-black uppercase tracking-widest">
                      <th className="px-4 py-3 border-b border-slate-700">Date</th>
                      <th className="px-4 py-3 border-b border-slate-700">Supplier</th>
                      <th className="px-4 py-3 border-b border-slate-700 text-center">Unit Price</th>
                      <th className="px-4 py-3 border-b border-slate-700 text-center">Currency</th>
                      <th className="px-4 py-3 border-b border-slate-700">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceHistory.map((hist: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">
                          {new Date(hist.purchaseDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">
                          {hist.supplier?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-black text-indigo-600">
                          {hist.unitPrice}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">
                          {hist.currency}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-600">
                          {hist.reference || '-'}
                        </td>
                      </tr>
                    ))}
                    {priceHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                          No price history found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasePlanningView;
