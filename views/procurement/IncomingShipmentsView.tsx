import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ship, Calendar, Clock, DollarSign, ArrowRight, Settings, AlertCircle,
  Truck, CheckCircle, Package, ArrowRightLeft, FileSpreadsheet, Anchor, FileText, Search, Filter, Eye
} from 'lucide-react';
import apiService from '../../services/apiService';

const statusColumns = [
  { id: 'Planned', name: 'Planned', color: 'bg-purple-500/10 text-purple-500' },
  { id: 'Shipped', name: 'Shipped', color: 'bg-indigo-500/10 text-indigo-500' },
  { id: 'In Transit', name: 'In Transit', color: 'bg-cyan-500/10 text-cyan-500' },
  { id: 'Customs', name: 'Customs', color: 'bg-amber-500/10 text-amber-500' },
  { id: 'Arrived', name: 'Arrived', color: 'bg-emerald-500/10 text-emerald-500' },
  { id: 'Received', name: 'Received', color: 'bg-slate-500/10 text-slate-400' },
  { id: 'Completed', name: 'Completed', color: 'bg-blue-500/10 text-blue-500' }
];

const IncomingShipmentsView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<any[]>([]);
  const [activeShipment, setActiveShipment] = useState<any>(null);

  // Filter and Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({});

  // Landed cost calculator state
  const [expenses, setExpenses] = useState({
    freight: '0',
    customs: '0',
    clearing: '0',
    insurance: '0',
    transport: '0',
    handling: '0',
    miscellaneous: '0'
  });
  const [allocationMethod, setAllocationMethod] = useState<'ByValue' | 'ByQuantity'>('ByValue');

  const loadShipments = async () => {
    setLoading(true);
    try {
      const [shipmentsData, posData] = await Promise.all([
        apiService.getProcurementShipments(),
        apiService.getPurchaseOrders()
      ]);
      
      const openPOs = (posData || []).filter((po: any) => po.status === 'Ordered' || po.status === 'Approved');
      const mappedPOs = openPOs.map((po: any) => {
        let qtyOrdered = 0;
        let qtyPlanned = 0;

        if (po.items && Array.isArray(po.items)) {
          qtyOrdered = po.items.reduce((sum: number, item: any) => sum + (Number(item.qty) || 0), 0);
        }

        (shipmentsData || []).forEach((shipment: any) => {
          if (shipment.items && Array.isArray(shipment.items)) {
            shipment.items.forEach((sItem: any) => {
              if (sItem.purchaseOrderId === po.id) {
                qtyPlanned += (Number(sItem.qty) || 0);
              }
            });
          }
        });

        const qtyBalance = Math.max(0, qtyOrdered - qtyPlanned);

        return {
          isPO: true,
          id: po.id,
          reference: po.reference,
          supplier: po.supplier,
          eta: po.orderDate || po.timestamp,
          status: 'Planned',
          qtyOrdered,
          qtyPlanned,
          qtyBalance
        };
      }).filter((po: any) => po.qtyBalance > 0);

      setShipments([...mappedPOs, ...(shipmentsData || [])]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const handleUpdateStatus = async (shipmentId: string, newStatus: string) => {
    try {
      // Find the purchase order id
      const shipment = shipments.find(s => s.id === shipmentId);
      if (!shipment) return;

      const poId = shipment.purchaseOrderId || shipment.items?.[0]?.purchaseOrderId;
      
      // If setting to Received, open the costing allocation panel
      if (newStatus === 'Received') {
        setActiveShipment(shipment);
        return;
      }

      await apiService.saveOrderCostsAndPayments(poId, {
        status: newStatus
      });
      loadShipments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAllocateCosts = async () => {
    if (!activeShipment) return;
    try {
      const poId = activeShipment.purchaseOrderId || activeShipment.items?.[0]?.purchaseOrderId;
      const expensesList = [
        { description: 'Freight', amount: Number(expenses.freight) || 0 },
        { description: 'Customs Duty', amount: Number(expenses.customs) || 0 },
        { description: 'Clearing Charges', amount: Number(expenses.clearing) || 0 },
        { description: 'Insurance', amount: Number(expenses.insurance) || 0 },
        { description: 'Transport', amount: Number(expenses.transport) || 0 },
        { description: 'Handling', amount: Number(expenses.handling) || 0 },
        { description: 'Miscellaneous', amount: Number(expenses.miscellaneous) || 0 }
      ];

      await apiService.saveOrderCostsAndPayments(poId, {
        status: 'Received',
        expenses: expensesList,
        allocationMethod
      });

      alert('Landed costs allocated successfully and shipment marked as Received!');
      setActiveShipment(null);
      setExpenses({
        freight: '0',
        customs: '0',
        clearing: '0',
        insurance: '0',
        transport: '0',
        handling: '0',
        miscellaneous: '0'
      });
      loadShipments();
    } catch (err) {
      console.error(err);
      alert('Failed to allocate landed costs.');
    }
  };

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set(shipments.map(s => s.supplier?.name).filter(Boolean));
    return Array.from(suppliers) as string[];
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const matchesSearch = searchQuery === '' || 
        s.reference?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSupplier = supplierFilter === 'All' || s.supplier?.name === supplierFilter;
      return matchesSearch && matchesSupplier;
    });
  }, [shipments, searchQuery, supplierFilter]);

  const groupedShipments = useMemo(() => {
    const groups: Record<string, any[]> = {
      'Planned': [],
      'Shipped': [],
      'In Transit': [],
      'Customs': [],
      'Arrived': [],
      'Received': [],
      'Completed': []
    };
    filteredShipments.forEach(s => {
      let statusKey = s.status;
      if (statusKey && statusKey.includes('Received')) {
        statusKey = 'Received';
      }
      
      if (groups[statusKey]) {
        groups[statusKey].push(s);
      }
    });
    return groups;
  }, [filteredShipments]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Loading incoming shipments...</div>;
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            <Anchor size={14} />
            <span className="text-gray-400">Logistics Tracking</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Incoming Shipments Board</h1>
          <p className="text-slate-500 text-sm">Monitor milestones from supplier production to warehouse receipt</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by PO Reference..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Suppliers</option>
            {uniqueSuppliers.map(sup => <option key={sup} value={sup}>{sup}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statusColumns.map(col => {
          const allColShipments = groupedShipments[col.id] || [];
          const currentLimit = columnLimits[col.id] || 20;
          const visibleShipments = allColShipments.slice(0, currentLimit);
          const hasMore = allColShipments.length > currentLimit;

          return (
            <div key={col.id} className="bg-slate-50/50 rounded-3xl p-3 flex flex-col border border-slate-100/50 shadow-sm min-h-[500px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${col.color}`}>
                  {col.name}
                </span>
                <span className="text-xs font-black text-slate-400 bg-white shadow-sm border border-slate-100 px-2 py-1 rounded-md">
                  {allColShipments.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {visibleShipments.map(s => (
                  <div
                    key={s.id}
                    className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center justify-between group ${!s.isPO ? 'hover:shadow-md hover:border-blue-200 cursor-pointer' : ''}`}
                    onClick={() => {
                        if (!s.isPO) {
                            if (col.id === 'Completed') {
                                navigate(`/goods-received-notes?search=${s.reference}`);
                            } else {
                                navigate(`/shipment-planner/view/${s.id}`);
                            }
                        }
                    }}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-slate-800 text-sm mb-1 truncate">{s.supplier?.name || 'Unknown Supplier'}</div>
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1 truncate"><FileText size={12}/> {s.reference}</span>
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1 mb-2">
                        <Calendar size={10} /> {s.eta ? new Date(s.eta).toLocaleDateString('en-GB') : 'Unknown ETA'}
                      </div>
                      {s.isPO && (
                        <div className="flex justify-between w-full bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                           <div className="flex flex-col flex-1 items-center justify-center">
                             <span className="text-[7px] text-slate-400 uppercase tracking-tighter mb-0.5">Ordered</span>
                             <span className="text-[9px] font-bold text-slate-600">{s.qtyOrdered}</span>
                           </div>
                           <div className="flex flex-col flex-1 items-center justify-center border-l border-slate-200">
                             <span className="text-[7px] text-slate-400 uppercase tracking-tighter mb-0.5">Planned</span>
                             <span className="text-[9px] font-bold text-slate-600">{s.qtyPlanned}</span>
                           </div>
                           <div className="flex flex-col flex-1 items-center justify-center border-l border-slate-200">
                             <span className="text-[7px] text-blue-400 uppercase tracking-tighter mb-0.5">Balance</span>
                             <span className="text-[9px] text-blue-600 font-black">{s.qtyBalance}</span>
                           </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      {s.isPO && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/shipment-planner/new', { 
                              state: { 
                                supplierId: s.supplier?.id || s.supplier,
                                supplierName: s.supplier?.name || s.supplier,
                                po: s
                              } 
                            });
                          }}
                          className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                        >
                          Plan
                        </button>
                      )}
                      {!s.isPO && (
                        <>
                          {col.id === 'Received' && s.status === 'Received (Costed)' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/goods-received-notes/new?copyFrom=${s.id}`);
                              }}
                              className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm mr-1"
                            >
                              Create GRN
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (col.id === 'Completed') {
                                    navigate(`/goods-received-notes?search=${s.reference}`);
                                } else {
                                    navigate(`/shipment-planner/view/${s.id}`);
                                }
                            }}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 bg-slate-50 hover:bg-blue-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600"
                            title={col.id === 'Completed' ? "View GRNs" : "View Shipment Details"}
                          >
                            <Eye size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                {hasMore && (
                  <button 
                    onClick={() => setColumnLimits(prev => ({ ...prev, [col.id]: currentLimit + 20 }))}
                    className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm text-slate-500 uppercase tracking-widest mt-4"
                  >
                    Load More ({allColShipments.length - currentLimit} left)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Landed Cost Allocation Modal */}
      {activeShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">Landed Cost Allocation</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Marking PO <strong>{activeShipment.purchaseOrder?.reference}</strong> as Received. Input expenses to allocate them to individual items.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Ocean Freight cost</label>
                  <input
                    type="number"
                    value={expenses.freight}
                    onChange={(e) => setExpenses({ ...expenses, freight: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Customs Duty</label>
                  <input
                    type="number"
                    value={expenses.customs}
                    onChange={(e) => setExpenses({ ...expenses, customs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Clearing Agent Fees</label>
                  <input
                    type="number"
                    value={expenses.clearing}
                    onChange={(e) => setExpenses({ ...expenses, clearing: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Road Transport</label>
                  <input
                    type="number"
                    value={expenses.transport}
                    onChange={(e) => setExpenses({ ...expenses, transport: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Allocation Method</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="allocationMethod"
                      value="ByValue"
                      checked={allocationMethod === 'ByValue'}
                      onChange={() => setAllocationMethod('ByValue')}
                    />
                    Proportional by Value (Cost)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="allocationMethod"
                      value="ByQuantity"
                      checked={allocationMethod === 'ByQuantity'}
                      onChange={() => setAllocationMethod('ByQuantity')}
                    />
                    Proportional by Quantity
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setActiveShipment(null)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAllocateCosts}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black"
                >
                  Allocate & Mark Received
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingShipmentsView;
