import React, { useState, useMemo, useEffect } from 'react';
import { 
  Eye, Edit, Search, Plus, Trash2, Check, Copy, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  ChevronDown, ChevronUp, Printer, Calendar, FileX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { InventoryWriteOff } from '../types';

const InventoryWriteOffsView = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryWriteOff | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [writeOffs, setWriteOffs] = useState<InventoryWriteOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(apiService.getCurrentUser());

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getInventoryWriteOffs();
        setWriteOffs(data);
      } catch (err) {
        console.error('Failed to fetch write-offs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleUserUpdate = () => {
      setCurrentUser(apiService.getCurrentUser());
    };
    window.addEventListener('user_sim_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('user_sim_updated', handleUserUpdate);
    };
  }, []);

  const getAvailableStatuses = (currentStatus: string, userRole: string) => {
    const isAdmin = userRole === 'Admin';
    const isManager = userRole === 'Manager' || isAdmin;

    const status = currentStatus || 'Draft';

    if (status === 'Draft') {
      return ['Draft', 'Pending Approval'];
    }
    if (status === 'Pending Approval') {
      if (isManager) {
        return ['Pending Approval', 'Approved', 'Draft'];
      }
      return ['Pending Approval'];
    }
    if (status === 'Approved') {
      return ['Approved'];
    }
    return [status];
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await apiService.updateInventoryWriteOffStatus(id, newStatus);
      setWriteOffs(prev => prev.map(wo => wo.id === id ? { ...wo, status: newStatus } : wo));
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update inventory write-off status');
    }
  };

  const columns = [
    { id: 'date', label: 'Date', visible: true },
    { id: 'reference', label: 'Reference', visible: true },
    { id: 'inventoryItem', label: 'Inventory Item', visible: true },
    { id: 'qty', label: 'Qty', visible: true },
    { id: 'amount', label: 'Amount', visible: true },
    { id: 'account', label: 'Expense Account', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ];

  const handleSort = (key: keyof InventoryWriteOff) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredWriteOffs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let result = writeOffs.filter(wo => {
      const searchStr = `${wo.reference} ${wo.inventoryItem} ${wo.description} ${wo.account}`.toLowerCase();
      return searchStr.includes(query);
    });

    if (sortConfig.key) {
      result.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key!] ?? '';
        let bVal = b[sortConfig.key!] ?? '';
        if (['qty', 'amount'].includes(sortConfig.key as string)) {
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
  }, [searchQuery, sortConfig, writeOffs]);

  const totalPages = Math.ceil(filteredWriteOffs.length / pageSize) || 1;
  const currentSlice = filteredWriteOffs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalWriteOffAmount = useMemo(() => {
    return filteredWriteOffs.reduce((sum, wo) => sum + Number(wo.amount || 0), 0);
  }, [filteredWriteOffs]);

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">
            <FileX size={14} />
            <span className="text-gray-400">Inventory Management</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Write-offs</h1>
          <p className="text-gray-500 text-sm">Record and track inventory adjustments, damages, and losses</p>
        </div>

        <button
          onClick={() => navigate('/inventory-write-offs/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center"
        >
          <Plus size={16} className="mr-2" /> NEW INVENTORY WRITE-OFF
        </button>
      </div>

      {/* Stats & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative flex-1 group max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search write-offs by reference, item, or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-8 pl-8 border-l border-slate-100">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Write-off Value</span>
            <span className="text-lg font-bold text-rose-600">ZMW {totalWriteOffAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort(col.id as keyof InventoryWriteOff)}
                >
                  <div className="flex items-center">
                    {col.label}
                    {sortConfig.key === col.id && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="ml-1 text-blue-500" /> : <ChevronDown size={14} className="ml-1 text-blue-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching write-offs...</p>
                  </div>
                </td>
              </tr>
            ) : currentSlice.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                  No write-offs found
                </td>
              </tr>
            ) : currentSlice.map((wo) => (
              <tr key={wo.id} className="group hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      onClick={() => navigate(`/inventory-write-offs/view/${wo.id}`)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`/inventory-write-offs/edit/${wo.id}`)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-[12px] font-semibold text-gray-900">{wo.date}</td>
                <td className="px-6 py-4 text-[12px] font-bold text-rose-600">{wo.reference}</td>
                <td className="px-6 py-4 text-[12px] font-bold text-gray-700">{wo.inventoryItem}</td>
                <td className="px-6 py-4 text-[12px] font-black text-gray-900">{wo.qty}</td>
                <td className="px-6 py-4 text-[12px] font-black text-rose-600">ZMW {(wo.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-[12px] text-gray-500 italic">{wo.account}</td>
                <td className="px-6 py-4">
                  {(() => {
                    const status = wo.status || 'Draft';
                    const options = getAvailableStatuses(status, currentUser.role);
                    const isDisabled = options.length <= 1;
                    return (
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(wo.id, e.target.value)}
                        disabled={isDisabled}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border outline-none transition-all shadow-sm ${
                          isDisabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                        } ${
                          status === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          status === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                          status === 'Approved' ? 'bg-emerald-600 text-white border-emerald-700 font-bold' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {options.map(opt => (
                          <option key={opt} value={opt} className="bg-white text-slate-900">{opt}</option>
                        ))}
                      </select>
                    );
                  })()}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-4">
          <button disabled className="p-1 rounded-md opacity-30 cursor-not-allowed"><ChevronsLeft size={16} /></button>
          <button disabled className="p-1 rounded-md opacity-30 cursor-not-allowed"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <button disabled className="p-1 rounded-md opacity-30 cursor-not-allowed"><ChevronRight size={16} /></button>
          <button disabled className="p-1 rounded-md opacity-30 cursor-not-allowed"><ChevronsRight size={16} /></button>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Showing {currentSlice.length} of {filteredWriteOffs.length} write-offs
        </div>
      </div>
    </div>
  );
};

export default InventoryWriteOffsView;
