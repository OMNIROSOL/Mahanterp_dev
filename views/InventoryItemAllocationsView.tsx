import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, AlertCircle, Package } from 'lucide-react';
import apiService from '../services/apiService';

const InventoryItemAllocationsView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllocations = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [itemData, locData, allocData] = await Promise.all([
          apiService.getItem(id),
          apiService.getItemLocations(id),
          apiService.getItemAllocations(id)
        ]);
        setItem(itemData);
        setLocations(locData || []);
        setAllocations(allocData || []);
      } catch (err) {
        console.error('Failed to fetch allocations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllocations();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Loading allocations...</div>;

  if (!item) {
    return (
      <div className="p-8 text-center mt-20">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Item Not Found</h2>
        <button 
          onClick={() => navigate('/inventory-items')}
          className="mt-4 text-blue-600 font-bold hover:underline"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const totalAllocated = allocations.reduce((sum, alloc) => sum + Number(alloc.qty), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <button 
          onClick={() => navigate('/inventory-items')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <MapPin className="text-emerald-500" />
            Inventory Allocations
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
            {item.itemName} ({item.itemCode})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total On Hand</p>
          <p className="text-3xl font-black text-slate-900">{item.qtyOnHand}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Allocated</p>
          <p className="text-3xl font-black text-slate-900">{totalAllocated}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-xs font-black text-emerald-600/70 uppercase tracking-widest mb-1">Available to Sell</p>
          <p className="text-3xl font-black text-emerald-700">{Math.max(0, item.qtyOnHand - totalAllocated)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package size={18} className="text-slate-400" />
            Stock by Location
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location Name</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Physical Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-slate-400 font-bold">
                    No location allocations found for this item.
                  </td>
                </tr>
              ) : (
                locations.map((loc, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-sm text-slate-900">
                        {loc.locationName}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-black text-slate-900">
                        {loc.qty}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-8">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package size={18} className="text-blue-400" />
            Allocated to Sales Orders
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Ref</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Reserved Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                    No pending sales orders allocating this item.
                  </td>
                </tr>
              ) : (
                allocations.map((alloc, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => navigate('/sales-orders')}>
                      {alloc.reference}
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-900">
                      {alloc.customerName}
                    </td>
                    <td className="p-4 text-sm text-slate-500 font-medium">
                      {new Date(alloc.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-black text-slate-900">
                        {alloc.qty}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryItemAllocationsView;
