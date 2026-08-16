import React, { useState, useMemo, useEffect } from 'react';
import {
  Eye, Edit, Search, Plus, Package, Check, Copy,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronDown, ChevronUp, Printer, HelpCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { InventoryItem, ScreenPermission } from '../types';
import apiService from '../services/apiService';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

const InventoryItemsView = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItem | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [showEditColumns, setShowEditColumns] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>({ role: 'Admin' }); 

  const [selectedItemForLocation, setSelectedItemForLocation] = useState<InventoryItem | null>(null);
  const [locationData, setLocationData] = useState<any[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  const handleQtyClick = async (item: InventoryItem) => {
    setSelectedItemForLocation(item);
    setIsLoadingLocations(true);
    try {
      const response = await fetch(`/api/items/${item.id}/locations`);
      const data = await response.json();
      setLocationData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch location data:', err);
      setLocationData([]);
    } finally {
      setIsLoadingLocations(false);
    }
  };
  const [perms, setPerms] = useState<ScreenPermission | null>(null);

  useEffect(() => {
    setPerms({ screenId: 'inventory-items', canView: true, canAdd: true, canEdit: true, canDelete: true } as ScreenPermission);
  }, []);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getItems();
        setInventoryItems(data);
      } catch (err) {
        console.error('Failed to fetch inventory items:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const defaultColumns = [
    { id: 'imageUrl', label: 'Image', visible: true },
    { id: 'itemCode', label: 'Item Code', visible: true },
    { id: 'itemName', label: 'Item Name', visible: true },
    { id: 'description', label: 'Description', visible: true },
    { id: 'unitName', label: 'Unit', visible: true },
    { id: 'qtyOnHand', label: 'Qty on Hand', visible: true },
    { id: 'avgCost', label: 'Avg Cost', visible: true },
    { id: 'totalValue', label: 'Total Value', visible: true },
    { id: 'reorderLevel', label: 'Reorder Level', visible: true },
    { id: 'category', label: 'Category', visible: true },
  ];

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('inventory_item_column_settings');
    return saved ? JSON.parse(saved) : defaultColumns;
  });

  const toggleColumnVisibility = (id: string) => {
    const newColumns = columns.map((col: any) =>
      col.id === id ? { ...col, visible: !col.visible } : col
    );
    setColumns(newColumns);
    localStorage.setItem('inventory_item_column_settings', JSON.stringify(newColumns));
  };

  const handleSort = (key: keyof InventoryItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let result = inventoryItems.filter(item => {
      const searchStr = `${item.itemName} ${item.itemCode} ${item.description} ${item.category}`.toLowerCase();
      return searchStr.includes(query);
    });

    if (sortConfig.key) {
      result.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key!] ?? '';
        let bVal = b[sortConfig.key!] ?? '';
        if (['qtyOnHand', 'avgCost', 'totalValue', 'reorderLevel'].includes(sortConfig.key as string)) {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [searchQuery, sortConfig, inventoryItems]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const currentSlice = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopyToClipboard = () => {
    const header = columns.filter((c: any) => c.visible).map((c: any) => c.label).join('\t');
    const rows = filteredItems.map((item: any) =>
      columns.filter((col: any) => col.visible).map((col: any) => item[col.id] || '').join('\t')
    ).join('\n');
    const fullText = `${header}\n${rows}`;

    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    });
  };

  const totalInventoryValue = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  }, [filteredItems]);

  return (
    <div className="p-8 space-y-10 relative">
      {copiedNotification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-[20px] shadow-2xl z-[9999] border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Check size={18} strokeWidth={3} />
            </div>
            <div>
              <p className="font-black uppercase tracking-widest text-[11px]">Export Successful</p>
              <p className="text-[10px] text-slate-400 font-bold">Data copied to clipboard</p>
            </div>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            <Package size={14} />
            <span className="text-gray-400">Inventory Management</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Items</h1>
          <p className="text-gray-500 text-sm">Manage your stock items, prices, and availability</p>
        </div>

        <div className="flex space-x-4 items-center">
          {perms?.add !== false && (
            <Link
              to="/inventory-items/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center"
            >
              <Plus size={16} className="mr-2" /> NEW INVENTORY ITEM
            </Link>
          )}
        </div>
      </div>

      {/* Stats & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative flex-1 group max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search items by name, code, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium h-11"
          />
        </div>

        <div className="flex items-center space-x-8 pl-8 border-l border-slate-200">
          <button
            className="flex flex-col items-center group"
            onClick={() => {/* Mock recalculate */ alert('Recalculating inventory costs...') }}
          >
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 group-hover:text-blue-700">Recalculate</span>
            <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-100 flex items-center gap-1 group-hover:bg-blue-100 transition-all">
              <ChevronUp size={12} /> Sync Costs
            </div>
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Items</span>
            <span className="text-lg font-black text-gray-900">{filteredItems.length}</span>
          </div>
          <div className="flex flex-col items-end pl-8 border-l border-slate-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory Value</span>
            <span className="text-lg font-black text-blue-600">ZMW {totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white border border-gray-200 rounded-[24px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                {columns.filter((c: any) => c.visible).map((col: any) => (
                  <th
                    key={col.id}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 transition-colors"
                    onClick={() => handleSort(col.id as keyof InventoryItem)}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {sortConfig.key === col.id && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} className="ml-1 text-blue-500" /> : <ChevronDown size={14} className="ml-1 text-blue-500" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Drill-down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.filter((c: any) => c.visible).length + 2} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching inventory data...</p>
                    </div>
                  </td>
                </tr>
              ) : currentSlice.length === 0 ? (
                 <tr>
                  <td colSpan={columns.filter((c: any) => c.visible).length + 2} className="px-8 py-20 text-center text-slate-400 font-bold">
                    No inventory items found.
                  </td>
                </tr>
              ) : currentSlice.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => navigate(`/inventory-items/view/${item.id}`)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {perms?.edit !== false && (
                        <button
                          onClick={() => navigate(`/inventory-items/edit/${item.id}`)}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="Edit Item"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                  {columns.filter((c: any) => c.visible).map((col: any) => {
                    const val = (item as any)[col.id];
                    return (
                      <td key={col.id} className="px-6 py-4">
                        {col.id === 'imageUrl' ? (
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                            {val ? (
                              <img src={val} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package size={14} className="text-gray-300" />
                            )}
                          </div>
                        ) : col.id === 'qtyOnHand' ? (
                          <span 
                            className="text-[12px] font-bold text-blue-600 cursor-pointer hover:underline hover:text-blue-800"
                            onClick={() => handleQtyClick(item)}
                          >
                            {val || '0'}
                          </span>
                        ) : (
                          <span className={`text-[12px] font-medium ${['avgCost', 'totalValue'].includes(col.id) ? 'text-gray-900 font-bold' : 'text-gray-600'
                            }`}>
                            {['avgCost', 'totalValue'].includes(col.id)
                              ? `ZMW ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : (val || '—')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/inventory-items/transactions/${item.id}`)}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all uppercase tracking-tighter"
                      >
                        Ledger
                      </button>
                      <button
                        onClick={() => navigate(`/inventory-items/locations/${item.id}`)}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all uppercase tracking-tighter"
                      >
                        Allocations
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Pagination & Export */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white px-6 py-4 rounded-[24px] border border-slate-100 shadow-sm gap-8 mt-4">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => { setCurrentPage(1); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
              className="p-1 hover:text-blue-600 disabled:opacity-20 transition-all"
            >
              <ChevronsLeft size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
              className="p-1 hover:text-blue-600 disabled:opacity-20 transition-all mr-2"
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
            </button>
            <span className="text-[13px] font-semibold text-slate-600 tracking-tight">Page {currentPage} of {totalPages || 1}</span>
            <button
              onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 hover:text-blue-600 disabled:opacity-20 transition-all ml-2"
            >
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => { setCurrentPage(totalPages); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 hover:text-blue-600 disabled:opacity-20 transition-all"
            >
              <ChevronsRight size={18} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-0.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SHOW PER PAGE:</span>
            <div className="flex items-center gap-4">
              {[50, 100, 250, 500].map(size => (
                <button
                  key={size}
                  onClick={() => { setPageSize(size); setCurrentPage(1); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={cn(
                    "text-[11px] font-black transition-all relative py-1",
                    pageSize === size ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {size}
                  {pageSize === size && <motion.div layoutId="activeInventoryPageSize" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleCopyToClipboard}
            className="px-8 py-3.5 bg-white border border-slate-200 rounded-full text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
          >
            <Copy size={16} className="text-slate-400" /> EXPORT DATA
          </button>
          <button
            onClick={() => setShowEditColumns(true)}
            className="px-8 py-3.5 bg-white border border-slate-200 rounded-full text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            COLUMNS
          </button>
        </div>
      </div>

      {/* Column Settings Modal */}
      {showEditColumns && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-tight">Edit Columns</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {columns.map((col: any) => (
                  <div
                    key={col.id}
                    className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-md"
                    onClick={() => toggleColumnVisibility(col.id)}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${col.visible ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                      }`}>
                      {col.visible && <Check size={14} className="text-white" strokeWidth={4} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{col.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEditColumns(false)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Breakdown Modal */}
      {selectedItemForLocation && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItemForLocation(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Quantity Breakdown</h2>
                  <p className="text-sm text-gray-500">{selectedItemForLocation.itemName} ({selectedItemForLocation.itemCode})</p>
                </div>
                <button onClick={() => setSelectedItemForLocation(null)} className="text-gray-400 hover:text-gray-600">
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {isLoadingLocations ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : locationData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No stock in any location</div>
              ) : (
                <div className="space-y-2 mt-4">
                  {locationData.map((loc, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">{loc.locationName}</span>
                      <span className="font-bold text-blue-600 text-lg">{loc.qty}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 mt-4 border-t border-gray-200">
                    <span className="font-bold text-gray-900 uppercase">Total</span>
                    <span className="font-black text-gray-900 text-xl">{locationData.reduce((sum, l) => sum + l.qty, 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryItemsView;
